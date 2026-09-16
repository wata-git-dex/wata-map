import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');

test('all inline scripts are valid JavaScript', () => {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 2);
  scripts.forEach(script => assert.doesNotThrow(() => new vm.Script(script[1])));
});

test('theme toggle is a single accessible map control', () => {
  assert.match(html, /id="themeToggle"/);
  assert.match(html, /aria-label="Switch to light mode"/);
  assert.match(html, /class="moon"/);
  assert.match(html, /class="sun"/);
  assert.doesNotMatch(html, /id="menuButton"|id="languageMenuButton"/);
});

test('light and dark themes persist through the shared WATA preference', () => {
  assert.match(html, /\[data-theme="light"\]/);
  assert.match(html, /localStorage\.setItem\('wata-theme',next\)/);
  assert.match(html, /theme-color/);
  assert.match(html, /themeToggle\.onclick/);
  assert.match(html, /name="application-version" content="1\.1\.2"/);
});

test('live reported totals use non-survey-verification wording', () => {
  assert.doesNotMatch(html, /IMPACT_CONTRACT/);
  assert.match(html, />Reported filters<\/span>/);
  assert.match(html, />Est\. people<\/span>/);
  assert.match(html, /Reported filters/);
  assert.match(html, /Estimated people/);
  assert.match(html, /Last updated/);
  assert.match(html, /updated: '—'/);
});

test('country detail adds public region markers without household coordinates', () => {
  assert.match(html, /const REGION_POINTS=/);
  assert.match(html, /function countryInset\(/);
  assert.match(html, /Approximate regions · not household locations/);
  assert.match(html, /class="country-inset"/);
  assert.match(html, /class="inset-marker"/);
  assert.match(html, /\.card\{width:100vw\}/);
  assert.match(html, /const metrics=`<div class="metrics">/);
  assert.match(html, /<b>\$\{fmt\(p\.filters\)\}<\/b><span>Reported filters<\/span>/);
  assert.match(html, /<b>\$\{fmt\(p\.served\)\}<\/b><span>Estimated people<\/span>/);
});

test('map navigation uses gentle wheel zoom and modest click focus', () => {
  assert.match(html, /Math\.exp\(delta\*\.0014\)/);
  assert.match(html, /function focusCountry\(/);
  assert.match(html, /BASE\.w\*\.78/);
  assert.match(html, /focusCountry\(t\)/);
  assert.match(html, /prefers-reduced-motion:reduce/);
});

test('light and dark palettes use distinct raised surfaces and stronger borders', () => {
  assert.match(html, /--ocean:#071721;\s*--land:#263b4c;\s*--land-line:#3a5365/);
  assert.match(html, /--ocean:#f0f9fb;--land:#b8cdd5;--land-line:#86a4b0/);
  assert.match(html, /--surface:/);
  assert.match(html, /background:var\(--surface\)/);
});

test('standalone map chrome respects iPhone safe areas without double-insetting embeds', () => {
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /env\(safe-area-inset-top,0px\)/);
  assert.match(html, /env\(safe-area-inset-right,0px\)/);
  assert.match(html, /env\(safe-area-inset-bottom,0px\)/);
  assert.match(html, /env\(safe-area-inset-left,0px\)/);
  assert.match(html, /window\.self!==window\.top/);
  assert.match(html, /\[data-embedded="true"\]\{--safe-top:0px;--safe-right:0px;--safe-bottom:0px;--safe-left:0px\}/);
  assert.match(html, /\.head\{[^}]*var\(--safe-top\)[^}]*var\(--safe-right\)[^}]*var\(--safe-left\)/s);
  assert.match(html, /\.legend\{[^}]*var\(--safe-left\)[^}]*var\(--safe-bottom\)/s);
  assert.match(html, /\.zoom\{[^}]*var\(--safe-right\)[^}]*var\(--safe-bottom\)/s);
  assert.match(html, /\.card \.body\{[^}]*var\(--safe-top\)[^}]*var\(--safe-bottom\)/s);
  assert.match(html, /#app\{[^}]*min-height:0;overflow:hidden/s);
  assert.doesNotMatch(html, /id="menuButton"|id="languageMenuButton"|id="signin"/);
});

test('iframe mode is marked before layout so host and map do not double-inset', () => {
  const startup = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  const dataset = {};
  const self = {};
  const top = {};
  vm.runInNewContext(startup, {
    document: { documentElement: { dataset } },
    localStorage: { getItem: () => 'dark' },
    window: { self, top },
  });
  assert.equal(dataset.embedded, 'true');
});
