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
  assert.match(html,/fetch\(DATA_URL,\{cache:'no-store'\}\)/);
  assert.equal((html.match(/fetch\(/g)||[]).length,1);
  assert.doesNotMatch(html,/setInterval|setTimeout/);
});

test('filter and people controls share one synchronized impact mode',()=>{
  assert.equal((html.match(/class="segments impact-segments"/g)||[]).length,2);
  for(const mode of ['inventory','distributed','ready'])assert.equal((html.match(new RegExp(`data-impact="${mode}"`,'g'))||[]).length,2);
  assert.match(html,/document\.querySelectorAll\('\[data-impact\]'\)/);
  assert.match(html,/\$\('peopleValue'\)\.textContent=fmt\(filters\*5\)/);
  assert.match(html,/Known reported inventory awaiting distribution/);
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
