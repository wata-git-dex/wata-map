import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const waterStress = await readFile(new URL('./water-stress-data.js', import.meta.url), 'utf8');
const drinkingWater = await readFile(new URL('./drinking-water-data.js', import.meta.url), 'utf8');

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
  assert.match(html, /name="application-version" content="1\.4\.0"/);
});

test('headline stays simple while country detail distinguishes inventory and distribution', () => {
  assert.doesNotMatch(html, /IMPACT_CONTRACT/);
  assert.match(html, />Countries<\/span>/);
  assert.match(html, />Total filters<\/span>/);
  assert.match(html, />Total impact<\/span>/);
  assert.doesNotMatch(html, /id="kFilters"|id="kPeople"|potential reach<\/small>/);
  assert.match(html, />Filters distributed<\/span>/);
  assert.match(html, />Total filters in country<\/span>/);
  assert.match(html, />Est\. people reached<\/span>/);
  assert.match(html, /const PEOPLE_PER_FILTER=5/);
  assert.match(html, /const inventory=p\.potentialFilters==null\?p\.filters:Math\.max\(p\.filters,p\.potentialFilters\)/);
  assert.match(html, /inCountry\*PEOPLE_PER_FILTER/);
  assert.doesNotMatch(html, /Actual impact · distributed|Potential impact · in country/);
  assert.match(html, /Last updated/);
  assert.match(html, /updated: '—'/);
});

test('country detail adds public region markers without household coordinates', () => {
  assert.match(html, /const REGION_COORDS=/);
  assert.match(html, /x:\(lon\+180\)\/360\*1000,y:\(90-lat\)\/180\*500/);
  assert.match(html, /function countryInset\(/);
  assert.match(html, /Public area markers · regional centers approximate/);
  assert.match(html, /return coordinates\?\[\{region,point:project\(coordinates\)\}\]:\[\]/);
  assert.doesNotMatch(html, /Unknown future areas fall back|const fallback=/);
  assert.match(html, /class="country-inset"/);
  assert.match(html, /class="inset-marker"/);
  assert.match(html, /height:190px/);
  assert.match(html, /pad=Math\.max\(size\*\.10,1\)/);
  assert.match(html, /stroke:#8bf3f4/);
  assert.match(html, /COL:\{'Riohacha':\{lat:11\.538416,lon:-72\.916784\},'La Guajira':\{lat:11\.4255,lon:-72\.375\}\}/);
  assert.match(html, /VNM:\{'Dien Bien':\{lat:21\.40,lon:103\.02\},'Hanoi':\{lat:21\.0285,lon:105\.8542\},'Central Highlands':\{lat:13\.75,lon:108\.25\}\}/);
  assert.match(html, /\.card\{position:fixed;[^}]*width:min\(420px/s);
  assert.match(html, /\.card\{top:auto!important;left:0!important;right:0;bottom:0;width:100%/);
  assert.match(html, /const metrics=stage\?`<div class="metrics">/);
  assert.match(html, /<b>\$\{fmt\(p\.filters\)\}<\/b><span>Filters distributed<\/span>/);
  assert.match(html, /<b>\$\{fmt\(countryTotal\)\}<\/b><span>Total filters in country<\/span>/);
  assert.match(html, /<b>\$\{fmt\(p\.served\)\}<\/b><span>Est\. people reached<\/span>/);
});

test('country detail is contextual and every configured country CTA can render', () => {
  assert.match(html, /role="dialog" aria-modal="false"/);
  assert.match(html, /function positionCard\(country\)/);
  assert.match(html, /if\(stage&&p\.ctaUrl\)actions\.push/);
  assert.doesNotMatch(html, /if\(p\.status==='Lead'&&p\.ctaUrl\)/);
  assert.match(html, /p\.status==='Lead'\?'start':'support'/);
  assert.match(html, /\.action\.start\{background:#1976e8/);
  assert.match(html, /\.action\.support\{/);
});

test('map views expose sourced Aqueduct water stress without replacing WATA impact', () => {
  const context = { window: {} };
  vm.runInNewContext(waterStress, context);
  assert.equal(Object.keys(context.window.WATA_WATER_STRESS.countries).length, 164);
  assert.match(html, /id="viewTrigger"[^>]*aria-haspopup="listbox"/);
  assert.match(html, /data-view="impact" aria-selected="true"/);
  assert.match(html, /data-view="stress" aria-selected="false"/);
  assert.match(html, /function setView\(view\)/);
  assert.match(html, /currentView==='impact'/);
  assert.match(html, /currentView==='stress'/);
  assert.match(html, /WRI Aqueduct 4\.0/);
  assert.match(html, /Baseline screening data · historical through 2019 · not real-time/);
  assert.match(html, /Baseline screening data using historical conditions through 2019—not a local assessment or real-time reading/);
  assert.match(html, /\[data-map-view="stress"\] \.cc\.wata-country/);
  assert.match(html, /water-stress-data\.js\?v=2023-2019/);
  assert.match(waterStress, /Publisher dataset: Aqueduct40_rankings_download_Y2023M07D05\.xlsx/);
  assert.match(waterStress, /License: CC BY 4\.0/);
  assert.match(waterStress, /COL:\[\.49614,0\]/);
  assert.match(waterStress, /THA:\[3\.62301,3\]/);
  assert.doesNotMatch(waterStress, /-9999/);
});

test('safe drinking water gap is a sourced, distinct view with honest missing data', () => {
  const context = { window: {} };
  vm.runInNewContext(drinkingWater, context);
  const layer = context.window.WATA_SAFE_WATER;
  assert.equal(Object.keys(layer.countries).length, 151);
  assert.equal(layer.indicator, 'SH.H2O.SMDW.ZS');
  assert.equal(layer.source, 'WHO/UNICEF Joint Monitoring Programme (JMP)');
  assert.deepEqual(Array.from(layer.countries.COL), [74.3, 2024]);
  assert.deepEqual(Array.from(layer.countries.COD), [11.9, 2024]);
  assert.deepEqual(Array.from(layer.countries.IND), [76.4, 2024]);
  assert.deepEqual(Array.from(layer.countries.MMR), [59.7, 2024]);
  assert.equal(layer.countries.NIC, undefined);
  assert.equal(layer.countries.THA, undefined);
  assert.equal(layer.countries.WLD, undefined);
  assert.match(html, /data-view="gap" aria-selected="false"/);
  assert.match(html, /Safe Drinking Water Gap/);
  assert.match(html, /currentView==='gap'/);
  assert.match(html, /missing data stays neutral/);
  assert.match(html, /without safely managed service/);
  assert.match(html, /National averages can hide major local disparities/);
  assert.match(html, /drinking-water-data\.js\?v=safely-managed-2024-20261008/);
});

test('map controls and headline statistics use compact grouped callouts', () => {
  assert.match(html, /\.impact\{[^}]*padding:5px[^}]*background:var\(--control\)[^}]*border:1px solid var\(--line\)/s);
  assert.match(html, /\.kpi\+\.kpi\{border-left:1px solid var\(--line\)\}/);
  assert.match(html, /\.zoom\{[^}]*gap:3px[^}]*padding:5px[^}]*background:var\(--control\)/s);
  assert.match(html, /\.zoom \.rst\{width:40px;padding:0\}/);
  assert.match(html, /<button id="rst" class="rst" aria-label="Reset view" title="Reset view"><svg/);
  assert.match(html, /<div class="zoom">\s*<button class="theme-toggle" id="themeToggle"/);
  const impactMarkup = html.match(/<div class="impact">([\s\S]*?)<\/div>\s*<\/div>\s*<div id="wrap">/)?.[1] || '';
  assert.doesNotMatch(impactMarkup, /themeToggle/);
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
