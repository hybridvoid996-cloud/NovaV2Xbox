import test from 'node:test';import assert from 'node:assert/strict';
import {wiiFileHead} from '../Public/src/wii-file-head.mjs';
import {patchProxyXHR} from '../scripts/patch-proxy-xhr.mjs';
import {readFileSync} from 'node:fs';
const url=new URL('https://playobsidian.com/cdn/assets/html/46975ef1-a576-49c2-b0ae-b740301204d2/1/game/sys/main.dol');
test('Wii HEAD uses a one-byte range and reconstructs the real file size',async()=>{
 let args;const signal=new AbortController().signal;
 const r=await wiiFileHead(async(...a)=>{args=a;return {status:206,headers:[['content-range','bytes 0-0/3491808'],['content-length','1']],body:new Uint8Array([0])}},[url,'HEAD',null,[],signal],1047);
 assert.equal(args[1],'GET');assert.deepEqual(args[3],[['Range','bytes=0-0']]);assert.equal(args[4],signal);assert.equal(r.status,200);assert.equal(new Headers(r.headers).get('content-length'),'3491808');assert.equal(r.body,null);
});
test('Wii HEAD rejects corrupt ranges and does not intercept other games or writes',async()=>{
 for(const [u,m,id]of[[url,'POST',1047],[url,'HEAD',1044],[new URL('https://other.test/file'),'HEAD',1047]])assert.equal(await wiiFileHead(()=>assert.fail('unexpected request'),[u,m,null,[]],id),null);
 await assert.rejects(wiiFileHead(async()=>({status:206,headers:[],body:''}),[url,'HEAD',null,[]],1047),/invalid file size/);
});
test('worker sync XHR retains rewritten native reads instead of the window bridge',()=>{
 const s=patchProxyXHR(readFileSync('node_modules/@mercuryworkshop/scramjet/dist/scramjet.js','utf8'));
 const start=s.indexOf('let s=t.this[i];if(!s||s[2])return;'),end=s.indexOf('let o=new SharedArrayBuffer',start);
 const run=new Function('e','t','i',s.slice(start,end)+';return "bridge"');
 const key=Symbol();const ctx={this:{[key]:['HEAD','rewritten',false]},return:()=>assert.fail('must retain native send')};
 assert.equal(run({global:{},flagEnabled:()=>assert.fail('worker needs no bridge')},ctx,key),undefined);
 assert.equal(run({global:{document:{}},flagEnabled:()=>true},ctx,key),'bridge');
 assert.throws(()=>patchProxyXHR('changed source'));
});
