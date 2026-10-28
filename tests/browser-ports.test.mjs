import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeGameURL} from '../Public/src/native-game-frame.mjs';
import {isNewLibraryItem} from '../Public/src/library-new.mjs';
const games=JSON.parse(fs.readFileSync('Public/library-games.json'));
test('new browser ports use their audited direct launch and local artwork',()=>{for(const id of [1040,1041,1042]){const rows=games.filter(g=>g.id===id);assert.equal(rows.length,1);const g=rows[0];assert.ok(nativeGameURL(g,'game','https://novaoffical.vercel.app/player.html'));assert.ok(fs.statSync('Public/'+g.art).size>1000);assert.ok(isNewLibraryItem(g.addedAt,Date.parse(g.addedAt)+1000));assert.equal(nativeGameURL({...g,url:'https://untrusted.example/content/games/1042.html'},'game','https://novaoffical.vercel.app/player.html'),null)}});
test('Vice City retains case-sensitive object URLs and ordered engine scripts',()=>{const html=fs.readFileSync('Public/content/games/1042.html','utf8');assert.ok(html.includes('originalFetch(input, init)'));assert.ok(html.includes('script.async = false'));assert.ok(html.includes('could not download its game files'));assert.ok(!html.includes('cdn.r9x.in'))});
