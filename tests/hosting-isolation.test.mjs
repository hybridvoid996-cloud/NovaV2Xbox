import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
test('Amplify isolation matches local hosting and survives the blank and game iframe permissions',async()=>{
 const config=await readFile(new URL('../customHttp.yml',import.meta.url),'utf8');assert.match(config,/pattern: '\*\*\/\*'/);assert.match(config,/Cross-Origin-Opener-Policy\s+value: 'same-origin'/);assert.match(config,/Cross-Origin-Embedder-Policy\s+value: 'credentialless'/);
 const blank=await readFile(new URL('../Public/src/blank-tab.mjs',import.meta.url),'utf8'),player=await readFile(new URL('../Public/src/player.js',import.meta.url),'utf8');assert.match(blank,/frame.allow='[^']*cross-origin-isolated/);assert.match(player,/view.element.allow='[^']*cross-origin-isolated/);
});
