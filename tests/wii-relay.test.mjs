import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';
import {wiiTarget,handleWii} from '../server/wii-relay.mjs';
test('Wii paths are pinned and the extracted partition layout is normalized',()=>{
 assert.match(wiiTarget({url:'/game-runtime/wii/game/part/sys/main.dol'}).href,/\/1\/game\/sys\/main.dol$/);
 assert.match(wiiTarget({url:'/api/fortnite?path=game%2Fmain.dol'}).href,/\/game\/sys\/main.dol$/);
 for(const path of ['../secret','//evil.test/a','https://evil.test/a','%252e%252e/secret','game\\secret'])assert.throws(()=>wiiTarget({url:'/api/fortnite?path='+encodeURIComponent(path)}));
});
test('Wii relays range and HEAD metadata without forwarding account cookies or accepting uploads',async()=>{
 let calls=0;const server=createServer((req,res)=>handleWii(req,res,async(url,opts)=>{calls++;assert.equal(url.hostname,'playobsidian.com');assert.equal(opts.headers.has('cookie'),false);assert.equal(opts.headers.has('authorization'),false);if(opts.method==='HEAD')return new Response(null,{headers:{'Content-Length':'30'}});assert.equal(opts.headers.get('range'),'bytes=1-3');return new Response('abc',{status:206,headers:{'Content-Range':'bytes 1-3/30','Content-Length':'3'}})}));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{const r=await fetch(base+'/game-runtime/wii/game/part/sys/main.dol',{headers:{Range:'bytes=1-3',Cookie:'private=secret',Authorization:'Bearer secret'}});assert.equal(r.status,206);assert.equal(await r.text(),'abc');const h=await fetch(base+'/game-runtime/wii/game/part/sys/main.dol',{method:'HEAD'});assert.equal(h.headers.get('content-length'),'30');const p=await fetch(base+'/game-runtime/wii/nand',{method:'POST',body:'save'});assert.equal(p.status,405);assert.equal(calls,2)}finally{await new Promise(r=>server.close(r))}
});
