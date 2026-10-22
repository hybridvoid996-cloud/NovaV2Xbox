import test from 'node:test';
import assert from 'node:assert/strict';
import {requestGameResource} from '../Public/src/game-health.mjs';
const url=new URL('https://cdn.jsdelivr.net/gh/o/r@main/game/Build/game.wasm.part1');
test('split-file existence probes request one byte and preserve real file length',async()=>{
 const calls=[];let issues=0;const response=await requestGameResource(async(...args)=>{calls.push(args);return {status:206,body:new Uint8Array([42]),headers:[['content-range','bytes 0-0/25000000'],['content-length','1']]};},[url,'HEAD',null,[],undefined],{onIssue:()=>issues++});
 assert.equal(calls[0][1],'GET');assert.deepEqual(calls[0][3],[['Range','bytes=0-0']]);assert.equal(response.status,200);assert.equal(response.body.byteLength,0);assert.deepEqual(response.headers,[['Content-Length','25000000']]);assert.equal(issues,0);
});
test('an absent optional next part stays absent without reporting a broken game',async()=>{
 let issues=0;const response=await requestGameResource(async()=>({status:404,body:'missing',headers:[]}),[url,'HEAD',null,[],undefined],{onIssue:()=>issues++});assert.equal(response.status,404);assert.equal(issues,0);
});
test('large split-part probes use the original repository fallback with a range and no credentials',async()=>{
 const calls=[];const result=await requestGameResource(async(...args)=>{calls.push(args);return calls.length===1?{status:403,body:'File size exceeded the configured limit',headers:[]}:{status:206,body:new Uint8Array([1]),headers:[['Content-Range','bytes 0-0/25000000']]};},[url,'HEAD',null,[['Cookie','private'],['Authorization','private']],undefined]);
 assert.equal(calls[1][0].href,'https://raw.githubusercontent.com/o/r/main/game/Build/game.wasm.part1');assert.deepEqual(calls[1][3],[['Range','bytes=0-0']]);assert.equal(result.status,200);
});
test('ordinary HEAD requests keep their original method',async()=>{
 let method;await requestGameResource(async(u,m)=>{method=m;return {status:200,body:'',headers:[]}},[new URL('https://game.test/game.json'),'HEAD',null,[],undefined]);assert.equal(method,'HEAD');
});
