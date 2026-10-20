import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {patchProxyMessages} from '../scripts/patch-proxy-messages.mjs';

function deliver(metadata){
 const source=patchProxyMessages(fs.readFileSync(new URL('../node_modules/@mercuryworkshop/scramjet/dist/scramjet.js',import.meta.url),'utf8'));
 assert.equal(patchProxyMessages(source),source);
 const start=source.indexOf('i.iswindow&&e.Proxy("window.postMessage"'),end=source.indexOf(',e.Proxy("BroadcastChannel.prototype.postMessage"',start);
 const context=vm.createContext({});
 vm.runInContext('location={origin:"https://nova.test"}',context);
 context.client=metadata;
 vm.runInContext('globalThis.sender=client;globalThis.payload={novaAction:"novaMovieVolume",volume:.5}',context);
 let hook,received;
 Object.assign(context,{i:{iswindow:true},n:{p:'sender'},o:{POLLUTANT:'pollutant'},e:{Proxy(name,handler){hook=handler}}});
 vm.runInContext(source.slice(start,end),context);
 hook.apply({args:[context.payload,'*'],fn:message=>{received=message},return(){}});
 return received;
}
test('Nova parent volume messages cross into a proxied player without missing metadata',()=>{
 const message=deliver(undefined);
 assert.equal(message.$scramjet$origin,'https://nova.test');
 assert.equal(message.$scramjet$data.novaAction,'novaMovieVolume');
 assert.equal(message.$scramjet$data.volume,.5);
});
test('provider messages retain the provider origin',()=>{
 assert.equal(deliver({url:{href:'https://cno.to/watch/1',origin:'https://cno.to'}}).$scramjet$origin,'https://cno.to');
});
