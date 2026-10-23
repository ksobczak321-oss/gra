// Account screen only. No authentication service or social integration is connected.
// Credentials never leave this form and are never written to browser storage.
(() => {
  'use strict';
  const form = document.getElementById('account-form');
  const fields = document.getElementById('account-fields');
  const panel = document.getElementById('auth-panel');
  const status = document.getElementById('account-status');
  const tabs = [...document.querySelectorAll('[data-mode]')];
  const name = document.getElementById('display-name');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const confirm = document.getElementById('confirm-password');
  const visibility = document.getElementById('password-visibility');
  const errorIds = new Map([[name, 'name-error'], [email, 'email-error'], [password, 'password-error'], [confirm, 'confirm-error']]);
  let mode = 'login';

  function announce(message, kind = 'info') {
    status.textContent = message;
    status.dataset.kind = kind;
    status.hidden = false;
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
  }
  function setPasswordVisible(visible) {
    password.type = visible ? 'text' : 'password';
    visibility.textContent = visible ? 'Hide' : 'Show';
    visibility.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    visibility.setAttribute('aria-pressed', String(visible));
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
    // This preview deliberately stops before a network request. Do not treat it as a signed-in session.
    password.value = '';
    confirm.value = '';
    setPasswordVisible(false);
    announce(mode === 'register'
      ? 'Account creation is coming soon. Your account has not been created. Continue as a guest to explore your island.'
      : 'Account sign-in is coming soon. Continue as a guest to explore your island.');
  });
  addEventListener('hashchange', () => changeMode(location.hash === '#register' ? 'register' : 'login', false));
  const requestedMode = new URLSearchParams(location.search).get('mode');
  changeMode(requestedMode === 'register' || location.hash === '#register' ? 'register' : 'login', false);
  // With JavaScript unavailable the disabled fieldset prevents accidental form submission.
  fields.disabled = false;
})();
