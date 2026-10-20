import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {patchProxyEvents} from '../scripts/patch-proxy-events.mjs';

function fixture(){
 const original=fs.readFileSync(new URL('../node_modules/@mercuryworkshop/scramjet/dist/scramjet.js',import.meta.url),'utf8');
 const source=patchProxyEvents(original),start=source.indexOf('e.Proxy("EventTarget.prototype.addEventListener"'),end=source.indexOf('let A=[',start);
 assert(start>=0&&end>start);assert.equal(patchProxyEvents(source),source);
 const hooks=new Map(),client={eventcallbacks:new WeakMap(),Proxy(name,handler){hooks.set(name,handler)}};
 vm.runInNewContext(source.slice(start,end),{e:client,a:fn=>new Proxy(fn,{apply(target,receiver,args){return Reflect.apply(target,receiver,args)}})});
 const target=new EventTarget();
 const call=(method,args)=>{const context={this:target,args};hooks.get('EventTarget.prototype.'+method).apply(context);return EventTarget.prototype[method].apply(target,context.args)};
 return {target,add:(...args)=>call('addEventListener',args),remove:(...args)=>call('removeEventListener',args)};
}
test('legacy engine feature detection sees one callback after duplicate registration',()=>{
 const f=fixture();let calls=0;const callback=()=>calls++;
 f.add('click',callback);f.add('click',callback);f.target.dispatchEvent(new Event('click'));
 assert.equal(calls,1);f.remove('click',callback);f.target.dispatchEvent(new Event('click'));assert.equal(calls,1);
});
test('capture registrations remain independent and removal matches capture',()=>{
 const f=fixture();let calls=0;const callback=()=>calls++;
 f.add('click',callback,{capture:false});f.add('click',callback,{capture:true});f.add('click',callback,true);
 f.target.dispatchEvent(new Event('click'));assert.equal(calls,2);
 f.remove('click',callback,{capture:true});f.target.dispatchEvent(new Event('click'));assert.equal(calls,3);
});
test('once and aborted listeners can be registered again without losing callbacks',()=>{
 const f=fixture();let calls=0;const callback=()=>calls++;
 f.add('click',callback,{once:true});f.target.dispatchEvent(new Event('click'));f.target.dispatchEvent(new Event('click'));assert.equal(calls,1);
 f.add('click',callback);f.target.dispatchEvent(new Event('click'));assert.equal(calls,2);
 f.remove('click',callback);const controller=new AbortController();f.add('click',callback,{signal:controller.signal});controller.abort();
 f.add('click',callback);f.target.dispatchEvent(new Event('click'));assert.equal(calls,3);
});
