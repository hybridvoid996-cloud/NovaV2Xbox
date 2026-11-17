import test from 'node:test';import assert from 'node:assert/strict';
import {createTubeHandshake} from '../Public/src/novatube-handshake.mjs';
function fixture(){const sent=[],timers=new Map();let id=0;const api=createTubeHandshake({frame:{contentWindow:{postMessage:(data,origin)=>sent.push({data:JSON.parse(data),origin})}},origin:'https://www.youtube-nocookie.com',schedule:fn=>{timers.set(++id,fn);return id},cancel:id=>timers.delete(id)});return {api,sent,timers}}
test('repeats a missed readiness handshake and stops once YouTube responds',()=>{const f=fixture();f.api.start();assert.equal(f.sent.length,4);[...f.timers.values()][0]();assert.equal(f.sent.length,8);assert.ok(f.sent.every(m=>m.origin==='https://www.youtube-nocookie.com'));assert.equal(f.api.accept({event:'onReady'}),true);assert.equal(f.timers.size,0);assert.equal(f.api.accept({event:'onReady'}),false)});
test('a real playback update is sufficient when onReady was missed',()=>{for(const data of [{event:'initialDelivery',info:{playerState:-1}},{event:'infoDelivery',info:{currentTime:0}},{event:'infoDelivery',info:{videoData:{video_id:'aqz-KE-bpKQ'}}}]){const f=fixture();f.api.start();assert.equal(f.api.accept(data),true);assert.equal(f.timers.size,0)}});
test('unrelated messages and empty data do not report a ready player',()=>{const f=fixture();f.api.start();for(const data of [{},{event:'infoDelivery',info:{}},{event:'onError',info:153}])assert.equal(f.api.accept(data),false);assert.equal(f.timers.size,1);f.api.stop();assert.equal(f.timers.size,0);assert.equal(f.api.accept({event:'onReady'}),false)});


test('Scramjet readiness envelopes and nested JSON decode without trusting other message types',async()=>{
 const {decodeTubeMessage}=await import('../Public/src/novatube-handshake.mjs');
 const ready={event:'onReady'};
 const wrap=data=>({$scramjet$messagetype:'window',$scramjet$data:data});
 assert.deepEqual(decodeTubeMessage(wrap(JSON.stringify(wrap(JSON.stringify(ready))))),ready);
 assert.equal(decodeTubeMessage('invalid'),null);
 let deep=ready;for(let i=0;i<6;i++)deep=wrap(deep);assert.equal(decodeTubeMessage(deep),null);
 const f=fixture();f.api.start();assert.equal(f.api.accept(decodeTubeMessage(wrap(JSON.stringify(ready)))),true);assert.equal(f.timers.size,0);
});
test('saved channel URLs and handles normalize to a fixed YouTube channel target',async()=>{
 const {normalizeTubeChannelTarget:target}=await import('../Public/src/novatube-handshake.mjs');
 assert.equal(target('https://www.youtube.com/@YouTube/videos'),'@YouTube');
 assert.equal(target('/channel/UCabcdefghijklmnopqrstuv'),'UCabcdefghijklmnopqrstuv');
 assert.equal(target('@ab'),'@ab');assert.equal(target('https://evil.example/@YouTube'),'');assert.equal(target('javascript:alert(1)'),'');
});
test('proxy handshake uses native parent sender and supplies the parent origin',async()=>{
 const {postTubeMessage}=await import('../Public/src/novatube-handshake.mjs');const old=globalThis.location;globalThis.location={origin:'https://nova.example'};
 try{let sent;postTubeMessage({getAttribute:()=>'/~/sj/p/session/https%3A...',contentWindow:{postMessage:(data,origin)=>sent={data,origin}}},{event:'listening'},'*');assert.equal(sent.data.$scramjet$origin,'https://nova.example');assert.deepEqual(JSON.parse(sent.data.$scramjet$data),{event:'listening'});assert.equal(sent.origin,'*')}finally{if(old===undefined)delete globalThis.location;else globalThis.location=old}
});

test('commands do not invoke the Scramjet-patched child postMessage function',async()=>{
 const oldWindow=globalThis.window,oldLocation=globalThis.location;let sent;
 globalThis.window={postMessage:function(data,origin){sent={receiver:this,data,origin}}};globalThis.location={origin:'https://nova.example'};
 try{const {postTubeMessage}=await import('../Public/src/novatube-handshake.mjs?native-sender-test');const target={postMessage(){throw Error('proxied child method must not be called')}};postTubeMessage({contentWindow:target,getAttribute:()=>'/~/sj/p/session/embed'},{event:'listening'});assert.equal(sent.receiver,target);assert.equal(sent.data.$scramjet$origin,'https://nova.example')}finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation}
});

test('autoplay blocked is a live player response and stops handshake polling',()=>{const f=fixture();f.api.start();assert.equal(f.api.accept({event:'onAutoplayBlocked'}),true);assert.equal(f.timers.size,0)});
