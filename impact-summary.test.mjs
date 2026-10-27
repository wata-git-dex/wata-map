import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const html=await readFile(new URL('./impact-summary.html',import.meta.url),'utf8');

test('compact impact bar inline script is valid JavaScript',()=>{
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1);
  assert.doesNotThrow(()=>new vm.Script(scripts[0][1]));
});

test('compact impact bar reads the same cached live source once',()=>{
  assert.match(html,/https:\/\/wata-map\.cleanwataorg\.workers\.dev/);
  assert.match(html,/fetch\(DATA_URL,\{cache:'no-store',signal:AbortSignal\.timeout\(LIVE_REQUEST_TIMEOUT_MS\)\}\)/);
  assert.equal((html.match(/fetch\(/g)||[]).length,1);
  assert.doesNotMatch(html,/setInterval|setTimeout/);
  assert.match(html,/const LIVE_REQUEST_TIMEOUT_MS=12000/);
});

test('filter and people controls share one synchronized impact mode',()=>{
  assert.equal((html.match(/class="segments impact-segments"/g)||[]).length,2);
  for(const mode of ['inventory','distributed','pending'])assert.equal((html.match(new RegExp(`data-impact="${mode}"`,'g'))||[]).length,2);
  assert.match(html,/document\.querySelectorAll\('\[data-impact\]'\)/);
  assert.match(html,/\$\('peopleValue'\)\.textContent=`\$\{fmt\(filters\*5\)\}\+`/);
  assert.match(html,/Reported filters in country that have not yet been distributed/);
  assert.match(html,/\$\{totals\.inventoryCoverage\} of \$\{totals\.countryCount\} impact countries currently report inventory totals/);
});

test('countries switch independently among impact stages',()=>{
  for(const mode of ['impact','active','pilot','lead'])assert.match(html,new RegExp(`data-country="${mode}"`));
  assert.match(html,/const COUNTRY_COPY=/);
  assert.match(html,/countryMode='impact'/);
});

test('embed contains only the responsive three-card statistics bar',()=>{
  assert.equal((html.match(/<section class="stat-card/g)||[]).length,3);
  assert.match(html,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(html,/@media \(max-width:900px\)\{\.stats-grid\{grid-template-columns:1fr\}/);
  assert.doesNotMatch(html,/<h1>|Our impact, live|Explore the impact map|country-list|breakdown/);
});

test('cards use WATA colors, larger names, semantic icons, and title-case labels',()=>{
  assert.match(html,/--cyan:#00bff3;--teal:#00a9a5;--indigo:#2757b6;--blue:#174aa0/);
  assert.match(html,/\.card-name\{[^}]*font-size:18px/);
  assert.equal((html.match(/class="stat-icon" aria-hidden="true"/g)||[]).length,3);
  for(const label of ['Total Filters','Estimated Total Reach','Impact Countries','Filters Distributed','Filters Pending','Estimated People Reached','Estimated Pending Reach','Active Countries','Pilot Countries','Country Leads'])assert.match(html,new RegExp(label));
  for(const icon of ['dropBadge','peopleBadge','globeBadge'])assert.match(html,new RegExp(`id="${icon}"`));
});

test('card choices use colored pill controls instead of a bordered white menu',()=>{
  assert.match(html,/\.segments\{[^}]*gap:7px[^}]*margin-top:auto\}/);
  assert.match(html,/\.segment\{[^}]*border:0[^}]*border-radius:999px[^}]*background:color-mix/);
  assert.match(html,/\.segment\[aria-pressed="true"\]\{[^}]*background:var\(--accent\)[^}]*color:#fff/);
});
