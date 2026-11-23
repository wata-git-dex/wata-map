import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const init=readFileSync(new URL('./init.mjs',import.meta.url),'utf8');

test('phone header mounts through the shared helper without adding map clearance',()=>{
  assert.match(index,/application-version" content="1\.4\.5"/);
  assert.match(index,/\/ios-header\/init\.mjs\?v=1\.4\.5/);
  assert.match(init,/document\.querySelector\('\.head'\)/);
  assert.match(init,/reserveSpace:false/);
  assert.match(init,/safeAreaIncluded:true/);
  assert.match(init,/background:'var\(--ocean\)'/);
});

test('adoption leaves the existing map header, dock controls and data path in place',()=>{
  assert.match(index,/<div class="head">/);
  assert.match(index,/<div class="zoom">/);
  assert.match(index,/id="themeToggle"/);
  assert.match(index,/const WORKER_URL = 'https:\/\/wata-map\.cleanwataorg\.workers\.dev'/);
});
