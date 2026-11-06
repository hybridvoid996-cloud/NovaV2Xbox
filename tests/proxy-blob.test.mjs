import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {patchProxyBlob} from '../scripts/patch-proxy-blob.mjs';
const original=readFileSync('node_modules/@mercuryworkshop/scramjet/dist/scramjet.js','utf8');
const patched=patchProxyBlob(original);
function extract(start,end){const from=patched.indexOf(start)+start.length;assert(from>=start.length);const to=patched.indexOf(end,from);assert(to>from);return patched.slice(from,to)}
test('only locally created blobs bypass the proxy when read as bytes',()=>{
 const e={context:{},meta:{},rewriteUrl:url=>'proxy:'+url};let returned;
 const create=new Function('e','t','i',extract('e.Proxy("URL.createObjectURL",{apply(t){','}}),e.Proxy("URL.revokeObjectURL"'));
 create(e,{call:()=> 'blob:https://nova.test/own-id',return:v=>{returned=v}},{IP:()=> 'blob:https://game.test/own-id'});
 assert.equal(returned,'blob:https://game.test/own-id');
 // Execute the patched fetch byte-read path, excluding its Request-instance check.
 const body=extract('e.Proxy("fetch",{apply(t){','}}),e.Proxy("Request"');const fetchHook=new Function('e','t','n','s',body);e.box={instanceof:()=>false};
 const run=url=>{const t={args:[url]};fetchHook(e,t,{Qf:x=>x},()=>({}));return t.args[0]};
 assert.equal(run(returned),'blob:https://nova.test/own-id');assert.equal(run('blob:https://game.test/other-id'),'proxy:blob:https://game.test/other-id');assert.equal(run('https://game.test/data.wasm'),'proxy:https://game.test/data.wasm');
 const other={...e,novaLocalBlobs:new Map};const t={args:[returned]};fetchHook(other,t,{Qf:x=>x},()=>({}));assert.equal(t.args[0],'proxy:'+returned);
});
test('unexpected dependency changes stop the build instead of silently losing blob support',()=>assert.throws(()=>patchProxyBlob('changed dependency')));

test('controller reads blob worker bytes in the owning game frame',async()=>{const {patchControllerBlob}=await import('../scripts/patch-proxy-blob.mjs');const source=readFileSync('node_modules/@mercuryworkshop/scramjet-controller/dist/controller.api.js','utf8');const result=patchControllerBlob(source);assert.notEqual(result,source);let calls=[];const r={contentWindow:{fetch:async url=>{calls.push(url);return new Response('worker bytes',{headers:{'content-type':'text/javascript'}})}}},t={Sr:{fromNativeResponse:x=>x}};const marker='fetchBlobUrl:async e=>';const start=result.indexOf(marker)+marker.length;const end=result.indexOf(',fetchDataUrl:',start);const read=new Function('r','t','fetch','return async e=>'+result.slice(start,end))(r,t,async()=>{throw new TypeError('partitioned blob')});const response=await read('blob:https://nova.test/own-id');assert.equal(await response.text(),'worker bytes');assert.equal(response.headers.get('content-type'),'text/javascript');assert.deepEqual(calls,['blob:https://nova.test/own-id']);assert.throws(()=>patchControllerBlob('changed dependency'));});

test('controller-created temporary script blobs use native reads without frame rewriting',async()=>{const {patchControllerBlob}=await import('../scripts/patch-proxy-blob.mjs');const result=patchControllerBlob(readFileSync('node_modules/@mercuryworkshop/scramjet-controller/dist/controller.api.js','utf8'));const marker='fetchBlobUrl:async e=>',start=result.indexOf(marker)+marker.length,end=result.indexOf(',fetchDataUrl:',start);let frameReads=0;const read=new Function('r','t','fetch','return async e=>'+result.slice(start,end))({contentWindow:{fetch:()=>{frameReads++;throw Error('must not rewrite controller blob')}}},{Sr:{fromNativeResponse:x=>x}},async()=>new Response('large inline script'));assert.equal(await (await read('blob:https://nova.test/temporary')).text(),'large inline script');assert.equal(frameReads,0);});
