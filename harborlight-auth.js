// Account screen only. No authentication service or social integration is connected.
// Credentials never leave this form and are never written to browser storage.
import { registerTranslations, translate, translateDOM } from './harborlight-v1-i18n.js?v=frontend-v15';
import { gameHref, authProfileSearch, validateIslandName, saveIslandNamePreference } from './harborlight-v1-profile.js?v=frontend-v15';

registerTranslations({
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
  'Account sign-in is coming soon. Continue as a guest to explore your island.': 'Logowanie do konta będzie dostępne wkrótce. Kontynuuj jako gość, aby odkrywać wyspę.'
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
  const visibility = document.getElementById('password-visibility');
  const languagePicker = document.getElementById('auth-language');
  const preferenceKey = 'harborlight-language';
  const profileSearch = authProfileSearch(location.search);
  let language = 'en';
  try { language = localStorage.getItem(preferenceKey) === 'pl' ? 'pl' : 'en'; } catch { /* Keep the form usable without storage. */ }
  const errorIds = new Map([[name, 'name-error'], [islandName, 'island-name-error'], [email, 'email-error'], [password, 'password-error'], [confirm, 'confirm-error']]);
  let mode = 'login';
  for (const link of document.querySelectorAll('a[href="harborlight-v1-layered.html"]')) link.href = gameHref(profileSearch);

  function applyLanguage() {
    if (languagePicker) languagePicker.value = language;
    document.title = 'HARBORLIGHT — Welcome Home';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = translate('Welcome to HARBORLIGHT. Sign in, create an account, or continue exploring your island as a guest.', language);
    translateDOM(document, language);
  }

  function announce(message, kind = 'info') {
    status.textContent = message;
    status.dataset.kind = kind;
    status.hidden = false;
    translateDOM(status, language);
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
  function changeMode(nextMode, updateHash = true) {
    mode = nextMode === 'register' ? 'register' : 'login';
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
    document.getElementById('auth-title').textContent = registering ? 'Your island starts here.' : 'Welcome back.';
    document.getElementById('auth-intro').textContent = registering ? 'A new adventure, a place to call your own.' : 'Return to the island you call home.';
    document.querySelector('#account-submit span').textContent = registering ? 'Create account' : 'Sign in';
    document.getElementById('password-hint').hidden = !registering;
    password.autocomplete = registering ? 'new-password' : 'current-password';
    password.placeholder = registering ? 'Choose a password' : 'Enter your password';
    // Passwords are cleared when changing account modes; email and name stay in the form only.
    password.value = '';
    confirm.value = '';
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
    button.addEventListener('click', () => {
      announce(`${button.dataset.provider} sign-in is coming soon. You can continue as a guest to play today.`);
    });
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    for (const input of errorIds.keys()) clearError(input);
    const invalid = [];
    const fail = (input, message) => { setError(input, message); invalid.push(input); };
    email.value = email.value.trim();
    if (mode === 'register' && name.value.trim().length < 2) fail(name, 'Enter a name with at least 2 characters.');
    const chosenIslandName = mode === 'register' ? validateIslandName(islandName.value) : null;
    if (chosenIslandName && !chosenIslandName.ok) fail(islandName, chosenIslandName.message);
    if (!email.value) fail(email, 'Enter your email address.');
    else if (!email.validity.valid) fail(email, 'Enter a valid email address.');
    if (!password.value) fail(password, 'Enter your password.');
    else if (password.value.length < 8) fail(password, 'Use at least 8 characters for your password.');
    if (mode === 'register' && confirm.value !== password.value) fail(confirm, 'The passwords do not match.');
    if (invalid.length) {
      announce('Check the highlighted fields to continue.', 'error');
      invalid[0].focus();
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
})();
