import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const html=await readFile(new URL('./impact-summary.html',import.meta.url),'utf8');

test('impact summary inline script is valid JavaScript',()=>{
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1);
  assert.doesNotThrow(()=>new vm.Script(scripts[0][1]));
});

test('impact summary reads the same live source as the map',()=>{
  assert.match(html,/https:\/\/wata-map\.cleanwataorg\.workers\.dev/);
  assert.match(html,/fetch\(DATA_URL,\{cache:'no-store'\}\)/);
  assert.doesNotMatch(html,/embed=impact-summary/);
  assert.match(html,/Data updated/);
  assert.match(html,/Connected to live source/);
});

test('impact summary exposes honest metric and stage controls',()=>{
  for(const metric of ['distributed','ready','inventory','people'])assert.match(html,new RegExp(`data-metric="${metric}"`));
  for(const stage of ['impact','active','pilot','lead'])assert.match(html,new RegExp(`data-stage="${stage}"`));
  assert.match(html,/p\.potentialFilters==null\?null:Math\.max\(p\.potentialFilters-\(p\.filters\|\|0\),0\)/);
  assert.match(html,/Inventory reported for \$\{known\} of \$\{rows\.length\} selected countries/);
  assert.match(html,/Estimated at five people per distributed filter/);
  assert.doesNotMatch(html,/Filters installed/);
});

test('impact summary is responsive and stands alone from the map interface',()=>{
  assert.match(html,/@media \(max-width:760px\)/);
  assert.doesNotMatch(html,/Explore the impact map|class="map-link"/);
});
