import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {nativeGameURL} from '../Public/src/native-game-frame.mjs';
const root=new URL('../Public/content/emulator/pokemon-red/',import.meta.url);
test('native emulator route is limited to the local Pokemon Red entry',()=>{
 const base='https://nova.example/player.html?kind=game&id=505';
 assert.equal(nativeGameURL({id:505,url:'content/games/505.html'},'game',base),'https://nova.example/content/games/505.html');
 for(const [item,kind]of [[{id:502,url:'content/games/502.html'},'game'],[{id:505,url:'https://external.example/game'},'game'],[{id:505,url:'content/games/505.html'},'cloud'],[{id:505,url:'settings.html'},'game']])assert.equal(nativeGameURL(item,kind,base),null);
});
test('pinned emulator and game assets match the bundle manifest',async()=>{
 const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
 assert.equal(manifest.length,7);
 for(const file of manifest){const bytes=await readFile(new URL(file.file,root));assert.equal(bytes.length,file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256)}
 assert.deepEqual([...await readFile(new URL('pokemon-red.zip',root))].slice(0,2),[80,75]);
});
test('native bootstrap uses Game Boy core and local worker assets without tracking scripts',async()=>{
 const html=await readFile(new URL('../Public/content/games/505.html',import.meta.url),'utf8'),source=await readFile(new URL('../Public/src/pokemon-red-native.js',import.meta.url),'utf8');
 assert.ok(source.includes("core:'gb'"));assert.ok(source.includes("EJS_threads:false"));assert.ok(source.includes('/content/emulator/pokemon-red/'));assert.ok(!/googletagmanager|cloak\.js|cdn\.jsdelivr/.test(html));
});

 test('original native Pokemon entries retain their exact local paths',async()=>{const catalog=JSON.parse(await readFile(new URL('../Public/library-games.json',import.meta.url),'utf8'));const pokemon=catalog.filter(g=>[505,506,694,696].includes(Number(g.id)));assert.equal(pokemon.length,4);for(const g of pokemon){assert.ok(nativeGameURL(g,'game','https://nova.example/player.html'));assert.equal(nativeGameURL({...g,url:'content/games/505.html'},'game','https://nova.example/player.html'),g.id===505?'https://nova.example/content/games/505.html':null);const html=await readFile(new URL('../Public/'+g.url,import.meta.url),'utf8');assert.ok(!/<<<<<<<|googletagmanager|cdn.jsdelivr/.test(html))}});
 test('additional game assets match manifest and each deployment file is under 100 MB',async()=>{const manifest=JSON.parse(await readFile(new URL('pokemon-manifest.json',root),'utf8'));assert.equal(manifest.length,11);for(const file of manifest){const bytes=await readFile(new URL(file.file,root));assert.equal(bytes.length,file.bytes);assert.ok(bytes.length<100000000);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256)}const fire=await readFile(new URL('pokemon-firered.gba',root));assert.match(fire.subarray(160,172).toString(),/POKEMON FIRE/);const emerald=await readFile(new URL('pokemon-emerald.gba',root));assert.match(emerald.subarray(160,172).toString(),/POKEMON EMER/)});

