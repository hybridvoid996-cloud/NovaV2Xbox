import test from 'node:test';
import assert from 'node:assert/strict';
import {directGameAsset} from '../Public/src/game-direct-asset.mjs';
const url=new URL('https://raw.githubusercontent.com/owner/game/revision/game.data.part1');
test('binary downloads preserve bytes and range without sending credentials',async()=>{
 const result=await directGameAsset(url,{gameId:259,headers:{Cookie:'private',Authorization:'private',range:'bytes=0-3'},fetcher:async(target,options)=>{
  assert.equal(target,url.href);assert.equal(options.credentials,'omit');assert.deepEqual(options.headers,{Range:'bytes=0-3'});
  return new Response(new Uint8Array([0,1,255,3]),{status:206,headers:{'Content-Type':'application/octet-stream','Content-Encoding':'gzip','Content-Length':'9','Content-Range':'bytes 0-3/9'}});
 }});
 assert.deepEqual([...result.body],[0,1,255,3]);assert.equal(result.status,206);assert.ok(!result.headers.some(([name])=>['content-encoding','content-length'].includes(name)));assert.ok(result.headers.some(([name])=>name==='content-range'));
});
test('blocked networks, host errors and text error pages return to the proxy path',async()=>{
 for(const fetcher of [async()=>{throw TypeError('blocked')},async()=>new Response('missing',{status:404}),async()=>new Response('Package limit exceeded',{headers:{'Content-Type':'text/plain'}})])assert.equal(await directGameAsset(url,{gameId:259,fetcher}),null);
 const timed=async(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
 assert.equal(await directGameAsset(url,{gameId:259,fetcher:timed,headerTimeout:5}),null);
});
test('the direct path excludes other hosts, scripts, movies, and write requests',async()=>{
 const fetcher=()=>{throw Error('Must not fetch')};
 for(const [target,options] of [[new URL('https://other.test/game.data'),{gameId:259}],[new URL('https://cdn.jsdelivr.net/a/game.js'),{gameId:259}],[url,{}],[url,{gameId:259,method:'POST'}]])assert.equal(await directGameAsset(target,{...options,fetcher}),null);
});
test('user cancellation is preserved instead of starting a proxy retry',async()=>{
 const controller=new AbortController();controller.abort();await assert.rejects(directGameAsset(url,{gameId:259,signal:controller.signal,fetcher:async()=>{throw controller.signal.reason}}));
});
