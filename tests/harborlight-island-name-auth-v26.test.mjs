import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { validateIslandName } from '../harborlight-v1-profile.js';
import { registerTranslations, translate } from '../harborlight-v1-i18n.js';
import { signInWithProvider } from '../harborlight-auth-providers.js';
import { legalAcceptance } from '../harborlight-legal.js';

test('the actual Auth catalogue explains length, invalid characters and PL/EN vocabulary in Polish', async () => {
  const source = await readFile(new URL('../harborlight-auth.js', import.meta.url), 'utf8');
  // Execute its real registration catalogue without constructing browser DOM.
  const catalogues = source.slice(0, source.indexOf('(() => {')).replace(/^import .*;\n/gm, '');
  vm.runInNewContext(catalogues, { registerTranslations });
  for (const [name, phrase] of [['AB', 'od 3 do 40'], ['<Port>', 'bez nawiasów'], ['Kurwa Bay', 'bez wulgarnych słów'], ['Sh1t Bay', 'bez wulgarnych słów']]) {
    const result = validateIslandName(name);
    assert.equal(result.ok, false);
    assert.ok(translate(result.message, 'pl').includes(phrase), name);
    assert.equal(translate(result.message, 'en'), result.message);
  }
});

test('Google/Facebook reject new short/vulgar island names before loading SDK or changing any profile', async () => {
  for (const provider of ['Google', 'Facebook']) for (const [islandName, code] of [['AB', 'invalid-island-name'], ['Kurw4', 'inappropriate-island-name'], ['fUcK', 'inappropriate-island-name']]) {
    let calls = 0;
    const cloud = { enabled: true, preprod: false, getPublicConfig: async () => { calls++; throw new Error('Unexpected Firebase request'); } };
    await assert.rejects(signInWithProvider(cloud, provider, { islandName, registration: true, legalAcceptance: legalAcceptance(true, true), loadSdk: async () => { calls++; throw new Error('Unexpected SDK load'); } }), { code });
    assert.equal(calls, 0);
  }
});

test('registration HTML applies the island minimum of three while retaining the independent nickname minimum of two', async () => {
  const html = await readFile(new URL('../harborlight-auth.html', import.meta.url), 'utf8');
  assert.match(html.match(/<input id="island-name"[^>]+>/)?.[0] || '', /minlength="3"/);
  assert.match(html.match(/<input id="display-name"[^>]+>/)?.[0] || '', /minlength="2"/);
  assert.ok(html.includes('Use 3–40 characters without vulgar Polish or English words.'));
});
