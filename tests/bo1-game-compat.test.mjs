import test from 'node:test';import assert from 'node:assert/strict';import {repairBo1Game} from '../Public/src/bo1-game-compat.mjs';
const response=body=>({status:200,headers:[['content-length','1']],body});
test('BO1 worker imports resolve against the source and retain capability checks',async()=>{
 const r=await repairBo1Game(new URL('https://vel.gg/bsz/capabilities.js'),response("worker = new Worker(new URL('./capability-worker.js', import.meta.url), { type: 'module' });"),{gameId:1026});
 assert.match(r.body,/new Worker\('https:\/\/vel.gg\/bsz\/capability-worker.js'/);assert.deepEqual(r.headers,[['content-type','text/javascript; charset=utf-8']]);
 const maps=await repairBo1Game(new URL('https://vel.gg/bsz/maps.js'),response("export const BASE = new URL('./', import.meta.url).pathname;"),{gameId:1026});assert.equal(maps.body,"export const BASE = '/bsz/';");
});
test('BO1 worker entry waits for imports before inspecting storage',async()=>{
 const r=await repairBo1Game(new URL('https://vel.gg/bsz/engine-download-worker.js'),response("import { installIcaseStorage } from './opfs-icase.js';\ninstallIcaseStorage();\nconst pending=[];self.onmessage=event=>pending.push(event);await import('./download-worker.js');"),{gameId:1026});assert.ok(r.body.indexOf('self.onmessage')<r.body.indexOf('await import'));assert.match(r.body,/await import\('https:\/\/vel.gg\/bsz\/opfs-icase.js'\)/);
 const other=response('untouched');assert.equal(await repairBo1Game(new URL('https://other.test/bsz/maps.js'),other,{gameId:1026}),other);assert.equal(await repairBo1Game(new URL('https://vel.gg/bsz/maps.js'),other,{gameId:1041}),other);
});

test('engine module uses its source directory and a rewritten static dependency',async()=>{
 const engine=await repairBo1Game(new URL('https://vel.gg/bsz/engine.js'),response("async function load(){const { default: createKisakBrowser } = await import(BASE + 'artifacts/KisakBlack-web.mjs');return createKisakBrowser({});}"),{gameId:1026});
 assert.match(engine.body,/^import createKisakBrowser from '\.\/artifacts\/KisakBlack-web.mjs'/);assert.ok(!engine.body.includes('await import(BASE'));
 const module=await repairBo1Game(new URL('https://vel.gg/bsz/artifacts/KisakBlack-web.mjs'),response('var _scriptName=import.meta.url;'),{gameId:1026});assert.match(module.body,/https:\/\/vel.gg\/bsz\/artifacts\/KisakBlack-web.mjs/);
});

test('free-pointer input is explicit, right-drag only, and preserves native lock by default',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('./fixtures/bo1-input.js',import.meta.url),'utf8');
 const patched=await repairBo1Game(new URL('https://vel.gg/bsz/input.js'),response(source),{gameId:1026});
 const handlers=new Map(), events=[];const target={addEventListener(n,f){handlers.set(n,f)},removeEventListener(){}};
 const document={...target,pointerLockElement:null,exitPointerLock(){}};const window={...target};
 let nativeCalls=0;const canvas={...target,dataset:{},requestPointerLock(){nativeCalls++;return Promise.reject(Error('root document'))},focus(){}};
 const create=new Function('document','window','performance',patched.body.replaceAll('export ','')+';return captureInput;')(document,window,{now:()=>1000});
 const input=create(canvas,e=>events.push(e));input.enable(true);await assert.rejects(input.lock(),/root document/);assert.equal(nativeCalls,1);
 canvas.dataset.novaFreePointer='true';await input.lock();assert.equal(nativeCalls,1);assert.equal(document.pointerLockElement,null);assert.equal(events.at(-1).locked,true);
 const move=handlers.get('mousemove');const before=events.length;move({target:canvas,buttons:0,movementX:5,movementY:2});assert.equal(events.length,before);move({target:canvas,buttons:2,movementX:5,movementY:2});assert.equal(events.at(-1).kind,'mouse');
 input.enable(false);const stopped=events.length;move({target:canvas,buttons:2,movementX:5,movementY:2});assert.equal(events.length,stopped);
});


test('fallback resume state follows gameplay without claiming browser pointer lock',async()=>{
 const source='const menu = engine.uiState(), locked = document.pointerLockElement === canvas;';
 const patched=await repairBo1Game(new URL('https://vel.gg/bsz/play.js'),response(source),{gameId:1026});
 const check=new Function('document','canvas','engine',patched.body+';return locked;');
 const canvas={dataset:{}};const document={pointerLockElement:null};
 assert.equal(check(document,canvas,{uiState:()=>0}),false);canvas.dataset.novaFreePointer='true';
 assert.equal(check(document,canvas,{uiState:()=>0}),true);assert.equal(check(document,canvas,{uiState:()=>1}),false);assert.equal(document.pointerLockElement,null);
});
