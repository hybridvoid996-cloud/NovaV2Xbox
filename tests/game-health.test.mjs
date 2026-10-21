import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyGameIssue,gameAssetResponse,reserveGameRetry,requestGameResource} from '../Public/src/game-health.mjs';

test('engine, emulator, memory and network failures get different recovery advice',()=>{
 assert.equal(classifyGameIssue('WebAssembly CompileError').kind,'engine');
 assert.equal(classifyGameIssue('SharedArrayBuffer is not defined').retry,false);
 assert.equal(classifyGameIssue('out of memory').retry,false);
 assert.equal(classifyGameIssue('WebSocket failed').retry,true);
 assert.equal(classifyGameIssue('404 not found').retry,false);
});
test('automatic startup reloads are limited across page reloads',()=>{
 const map=new Map(),storage={getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)};
 assert.equal(reserveGameRetry(storage,'one',1000),true);
 assert.equal(reserveGameRetry(storage,'one',2000),true);
 assert.equal(reserveGameRetry(storage,'one',3000),false);
 assert.equal(reserveGameRetry(storage,'two',3000),true);
 assert.equal(reserveGameRetry(storage,'one',123000),true);
});
test('WASM MIME repair preserves the engine bytes and other response properties',()=>{
 const body=new Uint8Array([0,97,115,109]),response={status:200,body,headers:[['Content-Type','application/octet-stream'],['X-Test','yes']]};
 const result=gameAssetResponse(new URL('https://game.test/game.wasm'),response);
 assert.equal(result.body,body);assert.deepEqual(result.headers,[['X-Test','yes'],['Content-Type','application/wasm']]);
 assert.equal(gameAssetResponse(new URL('https://game.test/game.data'),response),response);
});
test('transient server errors retry once, while missing files do not loop',async()=>{
 let calls=0;const args=[new URL('https://game.test/engine.js'),'GET',null,[]];
 const response=await requestGameResource(async()=>({status:++calls===1?503:200,headers:[]}),args,{delay:async()=>{}});
 assert.equal(calls,2);assert.equal(response.status,200);
 calls=0;await requestGameResource(async()=>{calls++;return {status:404,headers:[]} },args);assert.equal(calls,1);
});
test('stalled scripts are aborted and retried once, without replaying writes',async()=>{
 let calls=0,aborts=0;
 await assert.rejects(requestGameResource((...args)=>{calls++;args[4].addEventListener('abort',()=>aborts++);return new Promise(()=>{})},[new URL('https://game.test/engine.js'),'GET',null,[]],{timeout:5,delay:async()=>{}}),/timed out/);
 assert.equal(calls,2);assert.equal(aborts,2);
 calls=0;await assert.rejects(requestGameResource(async()=>{calls++;throw Error('network')},[new URL('https://game.test/save'),'POST','save',[]]),/network/);assert.equal(calls,1);
});
test('large game archives do not receive small startup deadlines',async()=>{
 const response=await requestGameResource(async()=>{await new Promise(r=>setTimeout(r,15));return {status:200,headers:[]}},[new URL('https://game.test/game.data'),'GET',null,[]],{timeout:1});assert.equal(response.status,200);
});
test('oversized public GitHub CDN assets use the same repository file without credentials',async()=>{const calls=[];const r=await requestGameResource(async(url,method,body,headers)=>{calls.push({url:url.href,headers});return calls.length===1?{status:403,body:'File size exceeded the configured limit of 20 MB.',headers:[]}:{status:200,body:'original game bytes',headers:[]}},[new URL('https://cdn.jsdelivr.net/gh/owner/game@abc123/Build/game.data'),'GET',null,[['Authorization','private'],['Cookie','private']],undefined]);assert.equal(r.status,200);assert.equal(calls[1].url,'https://raw.githubusercontent.com/owner/game/abc123/Build/game.data');assert.deepEqual(calls[1].headers,[])});
