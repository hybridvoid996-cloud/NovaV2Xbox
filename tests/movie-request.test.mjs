import test from 'node:test';
import assert from 'node:assert/strict';
import {requestMovieResource} from '../Public/src/movie-request.mjs';

test('a transient provider gateway failure retries once within the startup deadline',async()=>{
 let calls=0;
 const result=await requestMovieResource(async()=>({status:++calls===1?502:200}),[new URL('https://cno.to/watch/1'),'GET',null,[],undefined]);
 assert.equal(calls,2);assert.equal(result.status,200);
 calls=0;
 const failed=await requestMovieResource(async()=>{calls++;return {status:503}},[new URL('https://cno.to/watch/1'),'GET',null,[],undefined]);
 assert.equal(calls,2);assert.equal(failed.status,503);
});

test('a stalled startup request expires and aborts its underlying connection',async()=>{
 let signal;
 await assert.rejects(requestMovieResource((...args)=>{signal=args[4];return new Promise(()=>{})},[new URL('https://cno.to/api/stream/1'),'GET',null,[],undefined],{timeout:10}),{name:'MovieRequestTimeout'});
 assert.equal(signal.aborted,true);
});
test('media and range requests retain their original signal without a startup deadline',async()=>{
 const signal=new AbortController().signal;
 for(const [url,headers] of [['https://cdn.example/movie.mp4',[]],['https://cdn.example/api/media',[['Range','bytes=0-']]]]){
  const result=await requestMovieResource(async(...args)=>{assert.equal(args[4],signal);return 'stream'},[new URL(url),'GET',null,headers,signal],{timeout:1});
  assert.equal(result,'stream');
 }
});
test('leaving playback propagates cancellation to startup requests',async()=>{
 const controller=new AbortController();
 const result=requestMovieResource((...args)=>new Promise((_,reject)=>args[4].addEventListener('abort',()=>reject(Error('cancelled')))),[new URL('https://cno.to/watch/1'),'GET',null,[],controller.signal]);
 controller.abort();await assert.rejects(result,/cancelled/);
});

import {createMovieRequest} from '../Public/src/movie-request.mjs';test('metadata requests share in-flight work and remain reusable as responses',async()=>{let calls=0;const request=createMovieRequest(async()=>{calls++;return Response.json({title:'Anime'})});const responses=await Promise.all([request('/api/movies?op=details&id=21'),request('/api/movies?op=details&id=21')]);assert.equal(calls,1);assert.equal((await responses[0].json()).title,'Anime');assert.equal((await responses[1].json()).title,'Anime')});test('temporary metadata failures recover before returning and cache only the successful retry',async()=>{let calls=0;const request=createMovieRequest(async()=>{calls++;return calls===1?Response.json({error:'offline'},{status:502}):Response.json({ok:true})});assert.equal((await request('/api/movies?op=season&id=1')).status,200);assert.equal((await request('/api/movies?op=season&id=1')).status,200);assert.equal(calls,2)});

test('HTML deployment pages are retried and never cached as catalog data',async()=>{let calls=0;const request=createMovieRequest(async()=>{calls++;return calls<3?new Response('<!DOCTYPE html>Not found',{status:404}):Response.json({rails:{}})});await assert.rejects(request('/api/movies?op=anime'),/unavailable page/);assert.deepEqual(await (await request('/api/movies?op=anime')).json(),{rails:{}});assert.equal(calls,3)});
test('a transient missing watch page retries once without retrying missing media',async()=>{let calls=0;const result=await requestMovieResource(async()=>({status:++calls===1?404:200}),[new URL('https://cno.to/watch/550'),'GET',null,[],undefined]);assert.equal(result.status,200);assert.equal(calls,2);calls=0;await requestMovieResource(async()=>{calls++;return {status:404}},[new URL('https://cdn.example/movie.mp4'),'GET',null,[],undefined]);assert.equal(calls,1)});
test('movie metadata retries browser network failures once',async()=>{const {createMovieRequest}=await import('../Public/src/movie-request.mjs');let calls=0;const request=createMovieRequest(async()=>{if(++calls===1)throw TypeError('Failed to fetch');return Response.json({rails:{}})});assert.equal((await request('/api/movies?op=anime')).status,200);assert.equal(calls,2)});
