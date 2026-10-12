import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
test('Testing catalog keeps its four exact launch URLs and valid artwork',()=>{const rows=JSON.parse(readFileSync(new URL('../Public/library-testing.json',import.meta.url)));assert.deepEqual(rows.map(r=>r.url),['https://skate.aaddpp.lol/','https://surfd.net/','https://ovz-game-production.up.railway.app/','https://vel.gg/bo1z']);assert.equal(new Set(rows.map(r=>r.id)).size,4);for(const r of rows){assert.equal(r.kind,'game');assert.ok(r.id.startsWith('testing-'));assert.ok(existsSync(new URL('../Public/'+r.art,import.meta.url)));}});
