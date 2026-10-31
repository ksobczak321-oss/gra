// PRE-PROD preserves its test accounts. PROD uses Firebase email and OAuth accounts.
// Passwords are sent only by the Firebase client and never saved in browser storage.
import { registerTranslations, translate, translateDOM } from './harborlight-v1-i18n.js?v=frontend-v25';
import { gameHref, authProfileSearch, validateIslandName, saveIslandNamePreference } from './harborlight-v1-profile.js?v=frontend-v25';
import { createDevCloud, DEV_USERS } from './harborlight-dev-cloud.js?v=frontend-v25';
import { signInWithProvider } from './harborlight-auth-providers.js?v=frontend-v25';
import { legalAcceptance, validLegalAcceptance } from './harborlight-legal.js?v=legal-v4';

registerTranslations({
  'Terms of Service': 'Regulamin gry',
  'Privacy policy': 'Polityka prywatności',
  'Legal documents': 'Dokumenty prawne',
  'Read terms': 'Przeczytaj Regulamin',
  'Read privacy policy': 'Przeczytaj Politykę prywatności',
  'I accept the Terms of Service.': 'Akceptuję Regulamin gry.',
  'I have read the Privacy policy.': 'Potwierdzam zapoznanie się z Polityką prywatności.',
  'Accept the Terms of Service to finish registration.': 'Zaakceptuj Regulamin, aby dokończyć rejestrację.',
  'Confirm that you have read the Privacy policy.': 'Potwierdź zapoznanie się z Polityką prywatności.',
  'Draft documents contain demonstrative operator details. Review them before confirming.': 'To robocze dokumenty z przykładowymi danymi operatora („Lorem ipsum”). Przeczytaj je, zanim potwierdzisz.',
  'These confirmations do not consent to marketing or waive consumer rights.': 'Potwierdzenie dokumentów nie oznacza zgody na marketing ani rezygnacji z praw konsumenta.',
  'Finish registration': 'Dokończ rejestrację',
  'Your sign-in identity is ready. Confirm the documents before a new island is created.': 'Logowanie potwierdzone. Zaakceptuj Regulamin i potwierdź zapoznanie się z Polityką prywatności, aby dokończyć rejestrację.',
  'Confirm and continue': 'Potwierdź i kontynuuj',
  'Saving your confirmation…': 'Zapisywanie potwierdzenia…',
  'Document versions changed. Refresh the page and read the current documents.': 'Wersja dokumentów zmieniła się. Odśwież stronę i przeczytaj aktualne dokumenty.',
  'HARBORLIGHT — Welcome Home': 'HARBORLIGHT — Witaj na wyspie',
  'Welcome to HARBORLIGHT. Sign in, create an account, or continue exploring your island as a guest.': 'Witaj w HARBORLIGHT. Zaloguj się, załóż konto lub odkrywaj wyspę jako gość.',
  'Skip to account': 'Przejdź do konta',
  'HARBORLIGHT — return to your island': 'HARBORLIGHT — wróć na swoją wyspę',
  'A little island. A world to build.': 'Mała wyspa. Świat do zbudowania.',
  'Back to island': 'Wróć na wyspę',
  'Language': 'Język',
  'YOUR OWN CORNER OF THE WORLD': 'TWÓJ WŁASNY ZAKĄTEK ŚWIATA',
  'An island worth': 'Wyspa, na którą',
  'coming home to.': 'chce się wracać.',
  'Build a village, care for your people, and bring the lighthouse back to life.': 'Zbuduj osadę, zadbaj o mieszkańców i przywróć blask latarni.',
  'Build a village, care for your people, and help the whole island grow.': 'Rozbudowuj osadę, dbaj o mieszkańców i rozwijaj całą wyspę.',
  'Make yourself at home.': 'Poczuj się jak w domu.',
  'Your island is ready to explore.': 'Twoja wyspa czeka na odkrycie.',
  'Account options': 'Opcje konta',
  'Sign in': 'Zaloguj się',
  'Create account': 'Załóż konto',
  'WELCOME TO HARBORLIGHT': 'WITAJ W HARBORLIGHT',
  'Welcome back.': 'Witaj ponownie.',
  'Return to the island you call home.': 'Wróć na wyspę, która jest Twoim domem.',
  'Your island starts here.': 'Tutaj zaczyna się Twoja wyspa.',
  'A new adventure, a place to call your own.': 'Nowa przygoda i Twoje własne miejsce na świecie.',
  'Social sign-in options': 'Logowanie przez inne serwisy',
  'Continue with Google': 'Kontynuuj przez Google',
  'Continue with Facebook': 'Kontynuuj przez Facebook',
  'Soon': 'Wkrótce',
  'Account sign-in is coming soon. You can play as a guest today.': 'Logowanie do konta będzie dostępne wkrótce. Już teraz możesz grać jako gość.',
  'or use your email': 'lub użyj adresu e-mail',
  'Account details': 'Dane konta',
  'Your name': 'Twoja nazwa',
  'What should we call you?': 'Jak mamy się do Ciebie zwracać?',
  'Island name': 'Nazwa wyspy',
  'Name your island': 'Nadaj nazwę swojej wyspie',
  'Use 2–40 characters. This name will appear on your island.': 'Użyj od 2 do 40 znaków. Ta nazwa będzie widoczna na Twojej wyspie.',
  'Choose an island name with 2–40 characters, without control characters or angle brackets.': 'Podaj nazwę wyspy od 2 do 40 znaków, bez znaków sterujących ani nawiasów < i >.',
  'Your browser could not save the island name. Allow local storage and try again.': 'Przeglądarka nie mogła zapisać nazwy wyspy. Zezwól na zapisywanie danych i spróbuj ponownie.',
  'Your island name is saved on this device. Your account has not been created. Continue as a guest to explore your island.': 'Nazwa wyspy została zapisana na tym urządzeniu. Twoje konto nie zostało utworzone. Kontynuuj jako gość, aby odkrywać wyspę.',
  'Email address': 'Adres e-mail',
  'Password': 'Hasło',
  'Enter your password': 'Wpisz hasło',
  'Choose a password': 'Wybierz hasło',
  'Show password': 'Pokaż hasło',
  'Hide password': 'Ukryj hasło',
  'Show': 'Pokaż',
  'Hide': 'Ukryj',
  'Use at least 8 characters.': 'Użyj co najmniej 8 znaków.',
  'Confirm password': 'Powtórz hasło',
  'Enter your password again': 'Wpisz hasło ponownie',
  'Enable JavaScript to preview account forms, or continue to the island as a guest.': 'Włącz JavaScript, aby obejrzeć formularze konta, lub przejdź na wyspę jako gość.',
  'Your island is waiting.': 'Twoja wyspa czeka.',
  'Continue as a guest': 'Kontynuuj jako gość',
  'Build slowly. Dream a little bigger.': 'Buduj spokojnie. Sięgaj marzeniami dalej.',
  'Enter a name with at least 2 characters.': 'Podaj nazwę zawierającą co najmniej 2 znaki.',
  'Enter your email address.': 'Wpisz adres e-mail.',
  'Enter a valid email address.': 'Wpisz prawidłowy adres e-mail.',
  'Enter your password.': 'Wpisz hasło.',
  'Use at least 8 characters for your password.': 'Hasło musi mieć co najmniej 8 znaków.',
  'The passwords do not match.': 'Hasła nie są takie same.',
  'Check the highlighted fields to continue.': 'Sprawdź zaznaczone pola, aby kontynuować.',
  'Google sign-in is coming soon. You can continue as a guest to play today.': 'Logowanie przez Google będzie dostępne wkrótce. Już teraz możesz grać jako gość.',
  'Facebook sign-in is coming soon. You can continue as a guest to play today.': 'Logowanie przez Facebook będzie dostępne wkrótce. Już teraz możesz grać jako gość.',
  'Account creation is coming soon. Your account has not been created. Continue as a guest to explore your island.': 'Zakładanie kont będzie dostępne wkrótce. Twoje konto nie zostało utworzone. Kontynuuj jako gość, aby odkrywać wyspę.',
  'Account sign-in is coming soon. Continue as a guest to explore your island.': 'Logowanie do konta będzie dostępne wkrótce. Kontynuuj jako gość, aby odkrywać wyspę.',
  'HARBORLIGHT — DEV sign-in': 'HARBORLIGHT — logowanie DEV',
  'Sign in to your DEV island. Your progress is saved in the cloud.': 'Zaloguj się na swoją wyspę DEV. Postęp jest zapisywany w chmurze.',
  'HARBORLIGHT — sign in to DEV': 'HARBORLIGHT — zaloguj się do DEV',
  'DEV TEST ACCOUNTS': 'KONTA TESTOWE DEV',
  'Sign in to DEV': 'Zaloguj się do DEV',
  'Your island follows you between devices.': 'Twoja wyspa jest dostępna na różnych urządzeniach.',
  'Use your DEV login and password. Your progress is saved in the cloud.': 'Użyj loginu i hasła do konta DEV. Postęp jest zapisywany w chmurze.',
  'Username': 'Login',
  'admin1, admin2 or admin3': 'admin1, admin2 lub admin3',
  'Enter your DEV username: admin1, admin2 or admin3.': 'Wpisz login DEV: admin1, admin2 lub admin3.',
  'Signing in…': 'Logowanie…',
  'Checking your session…': 'Sprawdzanie sesji…',
  'The username or password is incorrect.': 'Login lub hasło są nieprawidłowe.',
  'This account is disabled. Contact the island owner.': 'To konto jest wyłączone. Skontaktuj się z właścicielem wyspy.',
  'Too many attempts. Wait a moment and try again.': 'Zbyt wiele prób. Zaczekaj chwilę i spróbuj ponownie.',
  'DEV accounts are not configured yet. Ask the owner to finish their setup.': 'Konta DEV nie są jeszcze skonfigurowane. Poproś właściciela o dokończenie konfiguracji.',
  'Your browser could not save the session. Allow local storage and try again.': 'Przeglądarka nie mogła zapisać sesji. Zezwól na zapisywanie danych i spróbuj ponownie.',
  'Could not connect to sign-in. Check your connection and try again.': 'Nie udało się połączyć z usługą logowania. Sprawdź połączenie z internetem i spróbuj ponownie.',
  'Your session expired. Sign in again.': 'Sesja wygasła. Zaloguj się ponownie.',
  'Could not sign in. Try again in a moment.': 'Nie udało się zalogować. Spróbuj ponownie za chwilę.'
});

registerTranslations({
  'Enter your PRE-PROD username: admin1, admin2 or admin3.': 'Wpisz login PRE-PROD: admin1, admin2 lub admin3.',
  'or use your test login': 'lub użyj loginu testowego',
  'Google/Facebook support linked test accounts only. Enter your test login and password to link a provider.': 'Na PRE-PROD przez Google lub Facebook zalogujesz się tylko na wcześniej powiązane konto testowe. Aby je połączyć, wpisz login i hasło konta testowego HARBORLIGHT.',
  'HARBORLIGHT — PRE-PROD sign-in': 'HARBORLIGHT — logowanie PRE-PROD',
  'PRE-PROD TEST ACCOUNTS': 'KONTA TESTOWE PRE-PROD',
  'Sign in to PRE-PROD': 'Zaloguj się do PRE-PROD',
  'HARBORLIGHT — sign in to PRE-PROD': 'HARBORLIGHT — zaloguj się do PRE-PROD',
  'Sign in to your island. Your progress is saved in the cloud.': 'Zaloguj się na swoją wyspę. Postęp jest zapisywany w chmurze.',
  'Use your PRE-PROD login and password. Your progress is saved in the cloud.': 'Użyj loginu i hasła do konta PRE-PROD. Postęp jest zapisywany w chmurze.',
  'Sign in with Google, Facebook or your email. Your progress is saved in the cloud.': 'Zaloguj się przez Google, Facebook albo e-mail. Postęp jest zapisywany w chmurze.',
  'Account setup is incomplete. Ask the owner to finish its configuration.': 'Konfiguracja kont nie jest zakończona. Poproś właściciela o jej dokończenie.',
  'This email already has an account. Sign in instead.': 'Z tym adresem e-mail jest już powiązane konto. Zaloguj się.',
  'This provider is not linked to the selected permanent PRE-PROD account. Use its password to link it.': 'Wybrana metoda logowania nie jest powiązana z tym kontem testowym PRE-PROD. Podaj hasło tego konta HARBORLIGHT, aby ją włączyć.',
  'This provider requires configuration by the game owner.': 'Ta metoda logowania nie jest jeszcze dostępna. Właściciel gry musi dokończyć jej konfigurację.',
  'Sign-in cancelled.': 'Logowanie anulowane.',
  'Allow the sign-in popup in your browser.': 'Zezwól przeglądarce na otwarcie okna logowania.',
  'This email uses another sign-in method. Sign in using that method first.': 'Ten adres korzysta z innej metody logowania. Zaloguj się dotychczasową metodą.',
  'Could not connect to the sign-in provider. Try again.': 'Nie udało się połączyć z usługą logowania. Spróbuj ponownie.'
});

(() => {
  'use strict';
  const form = document.getElementById('account-form');
  const fields = document.getElementById('account-fields');
  const panel = document.getElementById('auth-panel');
  const status = document.getElementById('account-status');
  const tabs = [...document.querySelectorAll('[data-mode]')];
  const name = document.getElementById('display-name');
  const islandName = document.getElementById('island-name');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const confirm = document.getElementById('confirm-password');
  const terms = document.getElementById('terms-accepted');
  const privacy = document.getElementById('privacy-acknowledged');
  const visibility = document.getElementById('password-visibility');
  const languagePicker = document.getElementById('auth-language');
  const preferenceKey = 'harborlight-language';
  const profileSearch = authProfileSearch(location.search);
  const devCloud = createDevCloud();
  const hostedMode = devCloud.enabled, devMode = devCloud.preprod;
  document.documentElement.dataset.environment = devCloud.environment;
  let language = hostedMode ? 'pl' : 'en';
  try { const saved = localStorage.getItem(preferenceKey); if (['pl', 'en'].includes(saved)) language = saved; } catch { /* Keep the form usable without storage. */ }
  const errorIds = new Map([[name, 'name-error'], [islandName, 'island-name-error'], [email, 'email-error'], [password, 'password-error'], [confirm, 'confirm-error'], [terms, 'terms-error'], [privacy, 'privacy-error']]);
  let mode = 'login';
  let signingIn = false;
  for (const link of document.querySelectorAll('a[href="harborlight-v1-layered.html"]')) link.href = gameHref(profileSearch);

  if (hostedMode) {
    for (const node of document.querySelectorAll('.guest-entry,.back-link')) node.hidden = true;
    document.querySelector('.brand').href = '#account';
  }
  if (hostedMode && !devMode) {
    for (const node of document.querySelectorAll('.social-button small')) node.remove();
    document.getElementById('social-availability').textContent = 'Sign in with Google, Facebook or your email. Your progress is saved in the cloud.';
  }
  if (devMode) {
    document.documentElement.classList.add('dev-auth');
    document.getElementById('tab-register').hidden = true;
    for (const node of document.querySelectorAll('.guest-entry,.back-link')) node.hidden = true;
    for (const node of document.querySelectorAll('.social-button small')) node.remove();
    document.querySelector('.divider span').textContent = 'or use your test login';
    const brand = document.querySelector('.brand');
    brand.href = '#account';
    brand.setAttribute('aria-label', 'HARBORLIGHT — sign in to PRE-PROD');
    document.querySelector('.account-eyebrow').textContent = 'PRE-PROD TEST ACCOUNTS';
    document.getElementById('social-availability').textContent = 'Google/Facebook support linked test accounts only. Enter your test login and password to link a provider.';
    document.querySelector('label[for="email"]').textContent = 'Username';
    email.type = 'text';
    email.name = 'username';
    email.autocomplete = 'username';
    email.inputMode = 'text';
    email.maxLength = 40;
    email.placeholder = 'admin1, admin2 or admin3';
    password.minLength = 1;
  }

  function applyLanguage() {
    if (languagePicker) languagePicker.value = language;
    document.title = devMode ? 'HARBORLIGHT — PRE-PROD sign-in' : 'HARBORLIGHT — Welcome Home';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = translate(hostedMode
      ? 'Sign in to your island. Your progress is saved in the cloud.'
      : 'Welcome to HARBORLIGHT. Sign in, create an account, or continue exploring your island as a guest.', language);
    translateDOM(document, language);
  }

  function announce(message, kind = 'info') {
    status.textContent = message;
    status.dataset.kind = kind;
    status.hidden = false;
    translateDOM(status, language);
  }
  function signInMessage(error) {
    const messages = {
      'invalid-login': 'The username or password is incorrect.',
      'invalid-credentials': 'The username or password is incorrect.',
      'account-disabled': 'This account is disabled. Contact the island owner.',
      'rate-limited': 'Too many attempts. Wait a moment and try again.',
      configuration: 'Account setup is incomplete. Ask the owner to finish its configuration.',
      disabled: 'Account setup is incomplete. Ask the owner to finish its configuration.',
      'email-in-use': 'This email already has an account. Sign in instead.',
      'weak-password': 'Use at least 8 characters for your password.',
      'invalid-email': 'Enter a valid email address.',
      'provider-configuration': 'This provider requires configuration by the game owner.',
      'provider-not-linked': 'This provider is not linked to the selected permanent PRE-PROD account. Use its password to link it.',
      'provider-cancelled': 'Sign-in cancelled.',
      'popup-blocked': 'Allow the sign-in popup in your browser.',
      'account-link-required': 'This email uses another sign-in method. Sign in using that method first.',
      'provider-unavailable': 'Could not connect to the sign-in provider. Try again.',
      'legal-required': 'Accept the Terms of Service to finish registration.',
      'legal-outdated': 'Document versions changed. Refresh the page and read the current documents.',
      storage: 'Your browser could not save the session. Allow local storage and try again.',
      'auth-required': 'Your session expired. Sign in again.',
      offline: 'Could not connect to sign-in. Check your connection and try again.'
    };
    return messages[error?.code] || 'Could not sign in. Try again in a moment.';
  }
  function clearError(input) {
    input.removeAttribute('aria-invalid');
    const error = document.getElementById(errorIds.get(input));
    error.textContent = '';
    error.hidden = true;
  }
  function setError(input, message) {
    input.setAttribute('aria-invalid', 'true');
    const error = document.getElementById(errorIds.get(input));
    error.textContent = message;
    error.hidden = false;
    translateDOM(error, language);
  }
  function setPasswordVisible(visible) {
    password.type = visible ? 'text' : 'password';
    visibility.textContent = visible ? 'Hide' : 'Show';
    visibility.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    visibility.setAttribute('aria-pressed', String(visible));
    translateDOM(visibility, language);
  }
  const currentLegalAcceptance = () => legalAcceptance(terms.checked, privacy.checked);
  function validateRegistrationLegal() {
    if (!terms.checked) { setError(terms, 'Accept the Terms of Service to finish registration.'); terms.focus(); return false; }
    if (!privacy.checked) { setError(privacy, 'Confirm that you have read the Privacy policy.'); privacy.focus(); return false; }
    return true;
  }
  let legalPrompt = null;
  function requestLegalConfirmation() {
    if (legalPrompt) return legalPrompt;
    const dialog = document.getElementById('registration-legal-dialog');
    const legalForm = document.getElementById('registration-legal-form');
    const checks = [document.getElementById('legal-modal-terms'), document.getElementById('legal-modal-privacy')];
    const submit = document.getElementById('legal-modal-confirm');
    const cancel = document.getElementById('legal-modal-cancel');
    const message = document.getElementById('legal-modal-status');
    checks.forEach(input => { input.checked = false; input.disabled = false; });
    submit.disabled = true; message.hidden = true;
    let saving = false;
    legalPrompt = new Promise(resolve => {
      const update = () => { submit.disabled = saving || !checks.every(input => input.checked); };
      const finish = accepted => {
        checks.forEach(input => input.removeEventListener('change', update));
        legalForm.removeEventListener('submit', confirmDocuments); cancel.removeEventListener('click', cancelDocuments); dialog.removeEventListener('cancel', cancelDocuments);
        dialog.close(); legalPrompt = null; resolve(accepted);
      };
      const cancelDocuments = event => {
        event?.preventDefault(); if (saving) return;
        devCloud.signOut(); announce('Sign-in cancelled.'); finish(false);
      };
      const confirmDocuments = async event => {
        event.preventDefault(); if (saving || !checks.every(input => input.checked)) return;
        saving = true; update(); cancel.disabled = true; checks.forEach(input => { input.disabled = true; });
        message.textContent = translate('Saving your confirmation…', language); message.hidden = false;
        try { await devCloud.acceptLegal(legalAcceptance(checks[0].checked, checks[1].checked)); finish(true); }
        catch (error) { message.textContent = translate(signInMessage(error), language); }
        finally { saving = false; cancel.disabled = false; checks.forEach(input => { input.disabled = false; }); update(); }
      };
      checks.forEach(input => input.addEventListener('change', update));
      legalForm.addEventListener('submit', confirmDocuments); cancel.addEventListener('click', cancelDocuments); dialog.addEventListener('cancel', cancelDocuments);
      translateDOM(dialog, language); dialog.showModal(); checks[0].focus();
    });
    return legalPrompt;
  }
  async function finishHostedSignIn(acceptance = null) {
    const admission = await devCloud.getLegalStatus();
    if (admission.required) {
      if (validLegalAcceptance(acceptance)) {
        try { await devCloud.acceptLegal(acceptance); }
        catch (error) { announce(signInMessage(error), 'error'); if (!await requestLegalConfirmation()) return; }
      } else if (!await requestLegalConfirmation()) return;
    }
    location.assign('harborlight-v1-layered.html?profile=new-player');
  }
  function changeMode(nextMode, updateHash = true) {
    if (signingIn) return;
    mode = !devMode && nextMode === 'register' ? 'register' : 'login';
    const registering = mode === 'register';
    for (const tab of tabs) {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    }
    panel.setAttribute('aria-labelledby', `tab-${mode}`);
    for (const block of document.querySelectorAll('[data-register-only]')) {
      block.hidden = !registering;
      for (const input of block.querySelectorAll('input')) {
        input.disabled = !registering;
        input.required = registering;
      }
    }
    // Hosted accounts choose their island name after the introduction, inside
    // the game. Neither a former nickname nor a premature island name belongs
    // in account registration; the loopback preview keeps its old form.
    if (hostedMode) for (const input of [name, islandName]) {
      input.closest('[data-register-only]').hidden = true;
      input.disabled = true; input.required = false;
    }
    document.getElementById('auth-title').textContent = devMode ? 'Sign in to PRE-PROD' : registering ? 'Your island starts here.' : 'Welcome back.';
    document.getElementById('auth-intro').textContent = devMode ? 'Your island follows you between devices.' : registering ? 'A new adventure, a place to call your own.' : 'Return to the island you call home.';
    document.querySelector('#account-submit span').textContent = registering ? 'Create account' : 'Sign in';
    document.getElementById('password-hint').hidden = !registering;
    password.autocomplete = registering ? 'new-password' : 'current-password';
    password.placeholder = registering ? 'Choose a password' : 'Enter your password';
    // Passwords are cleared when changing account modes; email and name stay in the form only.
    password.value = '';
    confirm.value = '';
    terms.checked = false; privacy.checked = false;
    setPasswordVisible(false);
    for (const input of errorIds.keys()) clearError(input);
    status.hidden = true;
    status.textContent = '';
    if (updateHash) history.replaceState(null, '', `#${mode}`);
    applyLanguage();
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => changeMode(tab.dataset.mode));
    tab.addEventListener('keydown', event => {
      if (devMode) return;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let index = tabs.indexOf(tab);
      if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      changeMode(tabs[index].dataset.mode);
      tabs[index].focus();
    });
  }
  visibility.addEventListener('click', () => setPasswordVisible(password.type === 'password'));
  for (const input of errorIds.keys()) input.addEventListener('input', () => clearError(input));
  for (const button of document.querySelectorAll('[data-provider]')) {
    button.addEventListener('click', async () => {
      if (signingIn) return;
      if (!hostedMode) { announce('This provider requires configuration by the game owner.', 'error'); return; }
      if (mode === 'register' && !validateRegistrationLegal()) return;
      signingIn = true; fields.disabled = true; form.setAttribute('aria-busy', 'true'); announce('Signing in…');
      try {
        await signInWithProvider(devCloud, button.dataset.provider, { testLogin: devMode ? email.value : '', testPassword: devMode ? password.value : '', registration: mode === 'register', legalAcceptance: mode === 'register' ? currentLegalAcceptance() : null });
        password.value = ''; setPasswordVisible(false);
        await finishHostedSignIn(mode === 'register' ? currentLegalAcceptance() : null);
      } catch (error) { password.value = ''; setPasswordVisible(false); announce(signInMessage(error), 'error'); }
      finally { signingIn = false; fields.disabled = false; form.removeAttribute('aria-busy'); }
    });
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (signingIn) return;
    for (const input of errorIds.keys()) clearError(input);
    const invalid = [];
    const fail = (input, message) => { setError(input, message); invalid.push(input); };
    email.value = email.value.trim();
    if (mode === 'register' && !hostedMode && name.value.trim().length < 2) fail(name, 'Enter a name with at least 2 characters.');
    const chosenIslandName = mode === 'register' && !hostedMode ? validateIslandName(islandName.value) : null;
    if (chosenIslandName && !chosenIslandName.ok) fail(islandName, chosenIslandName.message);
    if (devMode && !DEV_USERS.some(user => user.login === email.value)) fail(email, 'Enter your PRE-PROD username: admin1, admin2 or admin3.');
    else if (!email.value) fail(email, 'Enter your email address.');
    else if (!email.validity.valid) fail(email, 'Enter a valid email address.');
    if (!password.value) fail(password, 'Enter your password.');
    else if (!devMode && password.value.length < 8) fail(password, 'Use at least 8 characters for your password.');
    if (mode === 'register' && confirm.value !== password.value) fail(confirm, 'The passwords do not match.');
    if (mode === 'register' && !terms.checked) fail(terms, 'Accept the Terms of Service to finish registration.');
    if (mode === 'register' && !privacy.checked) fail(privacy, 'Confirm that you have read the Privacy policy.');
    if (invalid.length) {
      announce('Check the highlighted fields to continue.', 'error');
      invalid[0].focus();
      return;
    }
    if (hostedMode) {
      signingIn = true;
      fields.disabled = true;
      form.setAttribute('aria-busy', 'true');
      announce('Signing in…');
      try {
        if (mode === 'register') await devCloud.registerEmail(email.value, password.value, { legalAcceptance: currentLegalAcceptance() });
        else await devCloud.signIn(email.value, password.value);
        password.value = '';
        setPasswordVisible(false);
        await finishHostedSignIn(mode === 'register' ? currentLegalAcceptance() : null);
      } catch (error) {
        password.value = '';
        setPasswordVisible(false);
        announce(signInMessage(error), 'error');
        fields.disabled = false;
        password.focus();
      } finally {
        signingIn = false;
        fields.disabled = false;
        form.removeAttribute('aria-busy');
      }
      return;
    }
    // A valid registration submission saves only the explicitly chosen local
    // island name. No account, credentials or signed-in session are created.
    if (chosenIslandName) {
      let saved;
      try { saved = saveIslandNamePreference(localStorage, profileSearch, chosenIslandName.name); }
      catch { saved = { ok: false, message: 'Your browser could not save the island name. Allow local storage and try again.' }; }
      if (!saved.ok) {
        setError(islandName, saved.message);
        announce(saved.message, 'error');
        islandName.focus();
        return;
      }
      islandName.value = saved.name;
    }
    password.value = '';
    confirm.value = '';
    setPasswordVisible(false);
    announce(mode === 'register'
      ? 'Your island name is saved on this device. Your account has not been created. Continue as a guest to explore your island.'
      : 'Account sign-in is coming soon. Continue as a guest to explore your island.');
  });
  addEventListener('hashchange', () => changeMode(location.hash === '#register' ? 'register' : 'login', false));
  const requestedMode = new URLSearchParams(location.search).get('mode');
  changeMode(requestedMode === 'register' || location.hash === '#register' ? 'register' : 'login', false);
  languagePicker?.addEventListener('change', () => {
    language = languagePicker.value === 'pl' ? 'pl' : 'en';
    try { localStorage.setItem(preferenceKey, language); } catch { /* Language still works for this visit. */ }
    applyLanguage();
  });
  addEventListener('storage', event => {
    if (event.key === preferenceKey) { language = event.newValue === 'pl' ? 'pl' : 'en'; applyLanguage(); }
  });
  // With JavaScript unavailable the disabled fieldset prevents accidental form submission.
  fields.disabled = false;
  if (hostedMode) {
    signingIn = true;
    fields.disabled = true;
    form.setAttribute('aria-busy', 'true');
    announce('Checking your session…');
    devCloud.restoreSession().then(async account => {
      if (account) await finishHostedSignIn();
      else { status.hidden = true; status.textContent = ''; }
    }).catch(error => announce(signInMessage(error), 'error')).finally(() => {
      signingIn = false;
      fields.disabled = false;
      form.removeAttribute('aria-busy');
    });
  }
})();
