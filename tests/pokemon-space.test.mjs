import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {nativeGameURL} from '../Public/src/native-game-frame.mjs';
const base=new URL('../Public/content/pokemon-space/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));
const catalog=JSON.parse(await readFile(new URL('../Public/library-games.json',import.meta.url),'utf8'));
test('19 unique new games retain the original four native Pokemon games',async()=>{
 assert.equal(manifest.games.length,19);
 assert.equal(new Set(manifest.games.map(g=>g.id)).size,19);
 for(const g of manifest.games){const entry=catalog.find(e=>e.id===g.id);assert.ok(entry);assert.equal(catalog.filter(e=>e.name.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()===g.name.toLowerCase()).length,1);assert.equal(nativeGameURL(entry,'game','https://nova.example/player.html'),null);const html=await readFile(new URL('games/'+g.id+'.html',base),'utf8');assert.ok(!/googletagmanager/.test(html));for(const match of html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);}
 for(const id of [505,506,694,696])assert.ok(catalog.find(g=>g.id===id));
});
test('all covers, ROM chunks and Academy assets match pinned hashes and hosting limits',async()=>{
 for(const g of manifest.games){const cover=await readFile(new URL(g.cover,base));assert.equal(createHash('sha256').update(cover).digest('hex'),g.coverSha256);const combined=createHash('sha256');let total=0;for(const f of g.files||[]){const bytes=await readFile(new URL(f.path,base));assert.equal(bytes.length,f.bytes);assert.ok(bytes.length<=20*1024*1024);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);combined.update(bytes);total+=bytes.length;}if(g.core){assert.equal(total,g.romBytes);assert.equal(combined.digest('hex'),g.romSha256);}}
 for(const f of manifest.academyFiles){const bytes=await readFile(new URL(f.path,base));assert.equal(bytes.length,f.bytes);assert.ok(bytes.length<25*1024*1024);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);}
});
test('console systems match ROM headers instead of incorrect source-page settings',async()=>{
 for(const g of manifest.games.filter(g=>g.core)){const bytes=await readFile(new URL(g.files[0].path,base));if(g.core==='n64')assert.ok(['80371240','37804012','40123780'].includes(bytes.subarray(0,4).toString('hex')));if(g.core==='gb')assert.ok([0x00,0x80,0xc0].includes(bytes[0x143]));if(g.core==='gba')assert.equal(bytes[0xb2],0x96);if(g.core==='nds')assert.match(bytes.subarray(0,12).toString(),/POKEMON/);}
});


test('launch is idle until Play; missing and truncated downloads never start an emulator',async()=>{
 const source=await readFile(new URL('../Public/src/pokemon-space.js',import.meta.url),'utf8');
 for(const failure of ['manifest','chunk']){
  const nodes=Object.fromEntries(['#start','#status','#retry','#welcome','#game'].map(id=>[id,{hidden:false,textContent:''}]));let requests=0,scripts=0;
  const document={documentElement:{dataset:{pokemonId:'1008'}},querySelector:id=>nodes[id],createElement:()=>({}),head:{append(){scripts++}}};
  const context=vm.createContext({document,location:{href:'https://nova-content.invalid/content/pokemon-space/games/1008.html',reload(){}},URL,AbortController,Blob,Error,Number,Promise,Array,clearTimeout,clearInterval,setTimeout:()=>1,setInterval:()=>2,addEventListener(){},fetch:async()=>{requests++;if(requests===1)return {ok:failure!=='manifest',json:async()=>({games:[{id:1008,core:'gb',files:[{path:'roms/1008.gb',bytes:1024}]}]})};return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}}});
  context.window=context;
  vm.runInContext(source,context);vm.runInContext('function abort() {}',context);
  assert.equal(requests,0);await nodes['#start'].onclick();assert.equal(document.documentElement.dataset.pokemonState,'error');assert.equal(scripts,0);assert.equal(nodes['#retry'].hidden,false);
 }
});

