import test from 'node:test';import assert from 'node:assert/strict';
import {mergeGameParts,repairGettingOverIt} from '../Public/src/getting-over-it-compat.mjs';
test('an external-link failure cannot terminate the Unity callback',async()=>{
 const url=new URL('https://playobsidian.com/cdn/assets/html/c75db71a-ed5a-4ed9-9cf2-5c73fb513c79/1.7/Build/GettingOverIt.framework.js');
 const response=await repairGettingOverIt(url,{status:200,headers:[],body:'function openLink(str){window.open(str,"_blank","")}'},{gameId:557});
 let calls=0;const callback=new Function('window','console',response.body+';return openLink;')({open(){calls++;throw Error('blocked')}},{warn(){}});
 assert.doesNotThrow(()=>callback('https://example.com'));assert.equal(calls,1);
});
test('large game parts keep their order with at most three concurrent downloads',async()=>{
 let active=0,max=0;
 const blob=await mergeGameParts([0,1,2,3,4],async i=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5-i));active--;return new Blob([String(i)])});
 assert.equal(await blob.text(),'01234');assert.equal(max,3);
 assert.equal((await mergeGameParts(['Build/Game.wasm.part1'],async()=>new Blob(['wasm']))).type,'application/wasm');
 await assert.rejects(mergeGameParts([1],async()=>{throw Error('offline')}),/offline/);
});
test('layout repair applies only to the inspected Getting Over It document',async()=>{
 const url=new URL('https://playobsidian.com/cdn/assets/html/c75db71a-ed5a-4ed9-9cf2-5c73fb513c79/1.7/index.html');
 const r={status:200,headers:[['content-length','1'],['content-type','text/html']],body:'<head></head><body><div id="unity-container"></div></body>'};
 const result=await repairGettingOverIt(url,r,{gameId:557});assert.match(result.body,/data-nova-responsive="true"/);assert.match(result.body,/transform:none!important/);assert.match(result.body,/font:500 clamp/);assert.match(result.body,/height:100dvh/);assert.deepEqual(result.headers,[['content-type','text/html']]);
 assert.equal(await repairGettingOverIt(url,r,{gameId:1047}),r);assert.equal(await repairGettingOverIt(new URL('https://other.test/index.html'),r,{gameId:557}),r);
});
test('patched source merge returns a readable object URL after all parts finish',async()=>{
 const url=new URL('https://playobsidian.com/cdn/assets/html/c75db71a-ed5a-4ed9-9cf2-5c73fb513c79/1.7/index.html');
 const body='async function mergeFiles(parts) { const buffers = await Promise.all(parts.map(fetchWithProgress)); return URL.createObjectURL(new Blob(buffers)); }';
 const result=await repairGettingOverIt(url,{status:200,headers:[],body},{gameId:557});
 const merge=new Function('fetchWithProgress',result.body+';return mergeFiles;')(async x=>new Blob([x]));
 const objectUrl=await merge(['game',' bytes']);try{assert.equal(await (await fetch(objectUrl)).text(),'game bytes')}finally{URL.revokeObjectURL(objectUrl)}
});
