import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const init=readFileSync(new URL('./init.mjs',import.meta.url),'utf8');

test('phone header mounts through the shared helper without adding map clearance',()=>{
  assert.match(index,/application-version" content="1\.4\.9"/);
  assert.match(index,/\/ios-header\/init\.mjs\?v=1\.4\.9/);
  assert.match(init,/document\.querySelector\('\.head'\)/);
  assert.match(init,/reserveSpace:false/);
  assert.match(init,/safeAreaIncluded:true/);
  assert.match(init,/background:'var\(--ocean\)'/);
});

test('phone map-view menu opens upward from the bottom toolbar',()=>{
  assert.match(index,/\.view-menu\{position:absolute;top:auto;bottom:calc\(100% \+ 7px\);left:0;right:auto/);
  assert.match(index,/max-height:calc\(100dvh - 180px\);overflow:auto;overscroll-behavior:contain/);
  assert.match(index,/<div class="zoom">\s*<div class="legend-control" id="legendControl">[\s\S]*?<button class="legend-toggle"[\s\S]*?<div class="view-control" id="viewControl">/);
});

test('adoption leaves the existing map header, dock controls and data path in place',()=>{
  assert.match(index,/<div class="head">/);
  assert.match(index,/<div class="zoom">/);
  assert.match(index,/id="themeToggle"/);
  assert.match(index,/const WORKER_URL = 'https:\/\/wata-map\.cleanwataorg\.workers\.dev'/);
});
