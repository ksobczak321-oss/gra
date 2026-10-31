// OAuth is delegated to Firebase's maintained browser SDK. Only public Firebase
// configuration is used here; provider secrets belong in the Firebase console.
import { validateIslandName } from './harborlight-v1-profile.js?v=frontend-v24-2';
import { DEV_USERS } from './harborlight-dev-cloud.js?v=frontend-v24-2';
import { validLegalAcceptance } from './harborlight-legal.js?v=legal-v3';

const fail = (code, message) => Object.assign(new Error(message), { code });
export async function loadFirebaseProviderSdk() {
  const [app, auth] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js')
  ]);
  return { ...app, ...auth };
}

export function providerError(error) {
  const code = String(error?.code || '');
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return fail('provider-cancelled', 'Logowanie anulowane.');
  if (['auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/wrong-password', 'auth/user-not-found'].includes(code)) return fail('invalid-credentials', 'Login lub hasło są nieprawidłowe.');
  if (code === 'auth/popup-blocked') return fail('popup-blocked', 'Przeglądarka zablokowała okno logowania. Zezwól na jego otwarcie.');
  if (['auth/account-exists-with-different-credential', 'auth/credential-already-in-use'].includes(code)) return fail('account-link-required', 'Ten adres ma już konto z inną metodą logowania. Zaloguj się dotychczasową metodą.');
  if (['auth/operation-not-allowed', 'auth/unauthorized-domain', 'auth/invalid-api-key', 'auth/invalid-oauth-client-id', 'auth/configuration-not-found'].includes(code)) return fail('provider-configuration', 'Ta metoda logowania wymaga konfiguracji dostawcy przez właściciela gry.');
  if (['auth/user-disabled'].includes(code)) return fail('account-disabled', 'To konto jest wyłączone.');
  return fail('provider-unavailable', 'Nie udało się połączyć z dostawcą logowania. Spróbuj ponownie.');
}

export async function signInWithProvider(cloud, providerName, { islandName = '', testLogin = '', testPassword = '', registration = false, legalAcceptance = null, loadSdk = loadFirebaseProviderSdk } = {}) {
  if (!cloud?.enabled) throw fail('provider-configuration', 'Logowanie Google/Facebook wymaga skonfigurowanego hostingu Firebase.');
  const testUser = cloud.preprod && testLogin ? DEV_USERS.find(user => user.login === String(testLogin).trim().toLowerCase()) : null;
  if (cloud.preprod && (testLogin && !testUser || testPassword && !testUser)) throw fail('invalid-login', 'Wpisz stały login PRE-PROD admin1, admin2 albo admin3.');
  if (!['Google', 'Facebook'].includes(providerName)) throw fail('provider-configuration', 'Wybierz Google albo Facebook.');
  if (registration && !cloud.preprod && !validLegalAcceptance(legalAcceptance)) throw fail('legal-required', 'Potwierdź dokumenty przed ukończeniem rejestracji.');
  const chosenName = islandName ? validateIslandName(islandName) : null;
  if (chosenName && !chosenName.ok) throw fail('invalid-island-name', chosenName.message);
  let sdk, auth;
  try {
    const config = await cloud.getPublicConfig();
    sdk = await loadSdk();
    const name = `harborlight-${config.projectId}`;
    const app = sdk.getApps().find(item => item.name === name) || sdk.initializeApp(config, name);
    auth = sdk.getAuth(app);
    // The REST client owns the account session. Do not create a second SDK
    // account cache or store any island progress in browser persistence.
    await sdk.setPersistence(auth, sdk.inMemoryPersistence);
    const provider = providerName === 'Google' ? new sdk.GoogleAuthProvider() : new sdk.FacebookAuthProvider();
    if (providerName === 'Facebook') provider.addScope('email');
    let result;
    if (cloud.preprod && testPassword) {
      // Explicit owner/tester action links a provider to an EXISTING stable UID;
      // no permanent test password, island or UID is replaced.
      const existing = await sdk.signInWithEmailAndPassword(auth, testUser.email, testPassword);
      if (existing.user.uid !== testUser.uid) throw fail('auth-required', 'Tożsamość konta testowego nie jest zgodna.');
      try { result = await sdk.linkWithPopup(existing.user, provider); }
      catch (error) {
        if (error?.code !== 'auth/provider-already-linked') throw error;
        result = await sdk.signInWithPopup(auth, provider);
      }
    } else result = await sdk.signInWithPopup(auth, provider);
    if (cloud.preprod && (!DEV_USERS.some(user => user.uid === result.user.uid) || testUser && result.user.uid !== testUser.uid)) throw fail('provider-not-linked', 'Ten dostawca nie jest powiązany z wybranym stałym kontem PRE-PROD.');
    if (chosenName) await sdk.updateProfile(result.user, { displayName: 'HARBORLIGHT:' + chosenName.name });
    const idToken = await result.user.getIdToken(!!chosenName);
    return await cloud.acceptExternalSession({ uid: result.user.uid, idToken, refreshToken: result.user.refreshToken });
  } catch (error) {
    if (['auth-required', 'invalid-login', 'provider-not-linked', 'configuration', 'offline', 'registration-disabled', 'storage', 'legal-required', 'legal-outdated'].includes(error?.code)) throw error;
    throw providerError(error);
  } finally {
    if (sdk && auth) { try { await sdk.signOut(auth); } catch { /* The REST session is independent of SDK memory cleanup. */ } }
  }
}

export function facebookShareUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw fail('invalid-share-url', 'Brak poprawnego publicznego adresu osiągnięcia.'); }
  if (url.protocol !== 'https:' || url.username || url.password ||
      [...url.searchParams.keys()].some(key => /^(?:access_?token|id_?token|refresh_?token|password)$/i.test(key))) {
    throw fail('invalid-share-url', 'Udostępnianie wymaga publicznego adresu HTTPS bez danych sesji.');
  }
  return `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({ u: url.href })}`;
}

// Opening a share composer never means that a post was actually published.
// The player chooses the destination and confirms the post themselves.
export async function shareAchievement({ title = 'HARBORLIGHT', text = '', url }, {
  navigator: nav = globalThis.navigator,
  open = (...args) => globalThis.window?.open(...args)
} = {}) {
  const target = facebookShareUrl(url); // Validate before handing data to the OS.
  if (typeof nav?.share === 'function') {
    try { await nav.share({ title, text, url }); return { opened: true, verified: false }; }
    catch (error) { if (error?.name === 'AbortError') return { cancelled: true, verified: false }; }
  }
  open(target, '_blank', 'noopener,noreferrer');
  return { opened: true, verified: false };
}
