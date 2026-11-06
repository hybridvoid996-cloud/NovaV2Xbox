import test from 'node:test';
import assert from 'node:assert/strict';
import {repairSkateGame} from '../Public/src/skate-game-compat.mjs';
const url=new URL('https://skate.aaddpp.lol/host.js?v=335e6b4e7f6b');
const body="const cacheApi = () => typeof caches !== 'undefined' && window.isSecureContext;function origin(){let saved=localStorage.getItem('skate3-source-origin');return (saved || location.origin).replace(/\\/+$/, '');}";
const response=()=>({status:200,body,headers:[['content-type','text/javascript'],['content-length','100'],['content-encoding','gzip']]});
test('Skate data requests use the source server and preserve explicit server overrides',async()=>{
 const result=await repairSkateGame(url,response(),{gameId:1046});
 assert.ok(result.body.includes('const cacheApi = () => false;'));
 const make=new Function('localStorage','location',result.body+';return origin();');
 assert.equal(make({getItem:()=>''},{origin:'http://127.0.0.1:8795'}),'https://skate.aaddpp.lol');
 assert.equal(make({getItem:()=> 'https://my-server.test/'},{origin:'https://nova.test'}),'https://my-server.test');
 assert.deepEqual(result.headers,[['content-type','text/javascript']]);
});
test('Skate repair is limited to its exact game and host module',async()=>{
 for(const [target,gameId] of [[url,1044],[new URL('https://other.test/host.js'),1046],[new URL('https://skate.aaddpp.lol/main.js'),1046]]){const r=response();assert.equal(await repairSkateGame(target,r,{gameId}),r)}
 await assert.rejects(repairSkateGame(url,{...response(),body:'changed loader'},{gameId:1046}),/loader changed/);
});
