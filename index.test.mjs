import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');

test('inline application script is valid JavaScript', () => {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length, 'expected an inline application script');
  assert.doesNotThrow(() => new vm.Script(scripts.at(-1)[1]));
});

test('public navigation follows the WATA control and language contract', () => {
  assert.match(html, /id="languageMenuButton"/);
  assert.match(html, /id="menuButton"/);
  assert.match(html, /id="menuPanel"/);
  assert.match(html, /width:44px;height:44px;border-radius:13px/);
  assert.match(html, /🇺🇸<\/span><span>English/);
  assert.match(html, /🇪🇸<\/span><span>Español/);
  assert.match(html, /aria-current="page"/);
});

test('drawer actions are real map actions and public-only boundaries remain intact', () => {
  assert.match(html, /id="drawerRefresh"/);
  assert.match(html, /id="drawerReset"/);
  assert.match(html, /document\.getElementById\('drawerRefresh'\)\.onclick/);
  assert.match(html, /document\.getElementById\('drawerReset'\)\.onclick/);
  assert.doesNotMatch(html, /notificationButton|signOutButton|profileButton|themeButton/);
});

test('language is persisted and both surfaces share one state', () => {
  assert.match(html, /wata\.impactMap\.language/);
  assert.match(html, /document\.querySelectorAll\('\[data-language\]'\)/);
  assert.match(html, /applyLanguage\(currentLanguage\)/);
});
