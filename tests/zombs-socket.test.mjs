import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {once} from 'node:events';import WebSocket,{WebSocketServer} from 'ws';import {createZombsSocketServer,zombsSocketTarget} from '../server/zombs-socket.mjs';import {isZombsMatchSocket,connectZombsSocket} from '../Public/src/zombs-socket.mjs';
import {socketPacketIsBinary} from '../server/zombs-socket.mjs';
import {EventEmitter} from 'node:events';
test('a hosted adapter without message flags relays real binary packets end to end',async()=>{
 const emit=WebSocket.prototype.emit;
 WebSocket.prototype.emit=function(event,...args){if(event==='message'&&this._isServer){const [data,binary]=args;return emit.call(this,event,binary?data:data.toString())}return emit.call(this,event,...args)};
 let upstream,client;const bridge=createZombsSocketServer({openUpstream(){upstream=new EventEmitter();upstream.readyState=WebSocket.OPEN;upstream.terminate=()=>{};upstream.close=()=>{};upstream.send=(data,options)=>{assert.equal(options.binary,true);upstream.emit('message',data)};queueMicrotask(()=>upstream.emit('open'));return upstream}});
 try{
  bridge.listen(0,'127.0.0.1');await once(bridge,'listening');const origin='http://127.0.0.1:'+bridge.address().port;
  client=new WebSocket(origin.replace('http:','ws:')+'/api/zombs-socket?target='+encodeURIComponent('wss://zombs-2d4dcbcc-0.eggs.gg/'),{origin});
  await once(client,'open');client.send(JSON.stringify({type:'connect',cookie:''}));assert.equal(JSON.parse((await once(client,'message'))[0]).type,'ready');
  const echoed=once(client,'message');client.send(Buffer.from([0,128,255]));const [packet,binary]=await echoed;assert.equal(binary,true);assert.deepEqual([...packet],[0,128,255]);
 }finally{WebSocket.prototype.emit=emit;client?.terminate();await new Promise(resolve=>bridge.close(resolve))}
});
test('binary packets stay binary when a hosted socket adapter omits the ws flag',()=>{
 assert.equal(socketPacketIsBinary(Buffer.from([0,128,255]),undefined),true);
 assert.equal(socketPacketIsBinary(new ArrayBuffer(3),undefined),true);
 assert.equal(socketPacketIsBinary('2',undefined),false);
 assert.equal(socketPacketIsBinary(Buffer.from('text'),false),false);
});
test('Royale relay accepts only the official gateway and known regional probes',()=>{
 for(const target of ['wss://mason-ipv4.zombsroyale.io/gateway/?EIO=4&transport=websocket','wss://pinger-useast.eggs.gg/']){
  assert.equal(zombsSocketTarget(target),target);assert.equal(isZombsMatchSocket(target),true);
 }
 for(const target of ['wss://mason-ipv4.zombsroyale.io/other','wss://mason-ipv4.zombsroyale.io/gateway/?EIO=4&transport=websocket&redirect=https://evil.test','wss://pinger-useast.eggs.gg.evil.test/']){
  assert.throws(()=>zombsSocketTarget(target));assert.equal(isZombsMatchSocket(target),false);
 }
});
const target='wss://zombs-2d4dcbcc-0.eggs.gg/';
test('match bridge accepts only official secure Zombs match hosts',()=>{assert.equal(zombsSocketTarget(target),target);assert.equal(isZombsMatchSocket(new URL(target)),true);for(const value of ['ws://zombs-2d4dcbcc-0.eggs.gg/','wss://127.0.0.1/','wss://zombs-2d4dcbcc-0.eggs.gg.evil.test/','wss://user@zombs-2d4dcbcc-0.eggs.gg/','wss://zombs-2d4dcbcc-0.eggs.gg:444/','wss://zombs-2d4dcbcc-0.eggs.gg/?next=x']){assert.throws(()=>zombsSocketTarget(value));assert.equal(isZombsMatchSocket(value),false)}});
test('browser bridge keeps binary packets and close events intact',async()=>{let socket;class FakeSocket{constructor(url){this.url=url;this.readyState=1;socket=this}send(data){this.sent=data}close(code,reason){this.closed=[code,reason]}}const events=[],[send,close]=connectZombsSocket(new URL(target),[],[['Cookie','session=fixture']],()=>events.push('open'),data=>events.push(data),(code,reason)=>events.push([code,reason]),()=>events.push('error'),{WebSocketClass:FakeSocket,origin:'https://nova.test'});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(new URL(socket.url).origin,'wss://nova.test');assert.equal(new URL(socket.url).searchParams.get('target'),target);const packet=new Uint8Array([0,255,2]).buffer;socket.onopen();assert.equal(JSON.parse(socket.sent).cookie,'session=fixture');assert.deepEqual(events,[]);socket.onmessage({data:JSON.stringify({type:'ready'})});socket.onmessage({data:packet});await new Promise(resolve=>setTimeout(resolve,0));send(packet);assert.equal(socket.sent,packet);assert.equal(events[1],packet);close(1000,'done');assert.deepEqual(socket.closed,[1000,'done']);socket.onclose({code:1000,reason:'done'});assert.deepEqual(events.at(-1),[1000,'done'])});
test('server bridge completes the upstream handshake and relays binary traffic in both directions',async()=>{const upstream=new WebSocketServer({host:'127.0.0.1',port:0});await once(upstream,'listening');upstream.on('connection',ws=>{ws.send(Buffer.from([9,0,255]));ws.on('message',(data,binary)=>ws.send(data,{binary}))});const bridge=createZombsSocketServer({openUpstream:url=>{assert.equal(url,target);return new WebSocket('ws://127.0.0.1:'+upstream.address().port)}});bridge.listen(0,'127.0.0.1');await once(bridge,'listening');const origin='http://127.0.0.1:'+bridge.address().port;let client;try{const messages=[];client=new WebSocket(origin.replace('http','ws')+'/api/zombs-socket?target='+encodeURIComponent(target),{origin});client.on('message',(data,binary)=>{if(binary)messages.push([data,binary])});await once(client,'open');const handshake=once(client,'message');client.send(JSON.stringify({type:'connect',cookie:'fixture=one'}));await handshake;client.send(Buffer.from([0,128,255]));for(let i=0;i<100&&messages.length<2;i++)await new Promise(resolve=>setTimeout(resolve,10));assert.equal(messages.length,2);assert.deepEqual([...messages[0][0]],[9,0,255]);assert.deepEqual([...messages[1][0]],[0,128,255]);assert(messages.every(([,binary])=>binary));const reject=await new Promise((resolve,reject)=>{const request=http.request(origin+'/api/zombs-socket?target='+encodeURIComponent(target),{headers:{Connection:'Upgrade',Upgrade:'websocket',Origin:'https://other.test','Sec-WebSocket-Version':'13','Sec-WebSocket-Key':'dGhlIHNhbXBsZSBub25jZQ=='}},res=>{res.resume();resolve(res.statusCode)});request.on('error',reject);request.end()});assert.equal(reject,403)}finally{client?.terminate();for(const ws of upstream.clients)ws.terminate();await new Promise(resolve=>bridge.close(resolve));await new Promise(resolve=>upstream.close(resolve))}});

test('engine compilation finishes before connecting and cancellation prevents a late connection',async()=>{
 let ready,created=0;const engineReady=()=>new Promise(resolve=>ready=resolve);
 class Socket{constructor(){created++}}
 const events=[];
 const [,close]=connectZombsSocket(target,[],[],()=>{},()=>{},(...args)=>events.push(args),()=>{}, {WebSocketClass:Socket,origin:'https://nova.test',engineReady});
 await Promise.resolve();assert.equal(created,0);close();ready();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(created,0);assert.equal(events.length,1);
});
test('closed connections cannot deliver stale join packets or write to a closed socket',async()=>{
 let socket,ready;const events=[];
 class Socket{constructor(){socket=this;this.readyState=1}send(data){events.push(data)}close(){this.readyState=2}}
 const [send,close]=connectZombsSocket(target,[],[],()=>events.push('open'),()=>{events.push('packet');send('join')},()=>events.push('close'),()=>events.push('error'),{WebSocketClass:Socket,origin:'https://nova.test',engineReady:()=>new Promise(resolve=>ready=resolve)});
 await Promise.resolve();assert.equal(socket,undefined);ready();await new Promise(resolve=>setTimeout(resolve,0));
 socket.onmessage({data:'{"type":"ready"}'});socket.onmessage({data:new ArrayBuffer(1)});assert.deepEqual(events,['open','packet','join']);
 close();send('late');socket.onmessage({data:new ArrayBuffer(1)});socket.onclose({code:1000,reason:''});socket.onclose({code:1000,reason:''});assert.deepEqual(events,['open','packet','join','close']);
});

test('an abnormal upstream disconnect is reported as a failure rather than a successful close',async()=>{
 const bridge=createZombsSocketServer({openUpstream(){const upstream=new EventEmitter();upstream.readyState=WebSocket.OPEN;upstream.terminate=()=>{};upstream.close=()=>{};queueMicrotask(()=>{upstream.emit('open');setTimeout(()=>upstream.emit('close',1006),10)});return upstream}});
 let client;try{bridge.listen(0,'127.0.0.1');await once(bridge,'listening');const origin='http://127.0.0.1:'+bridge.address().port;client=new WebSocket(origin.replace('http:','ws:')+'/api/zombs-socket?target='+encodeURIComponent(target),{origin});await once(client,'open');const closed=once(client,'close');client.send(JSON.stringify({type:'connect',cookie:''}));const [code,reason]=await closed;assert.equal(code,1011);assert.match(reason.toString(),/unexpectedly/)}finally{client?.terminate();await new Promise(resolve=>bridge.close(resolve))}
});
