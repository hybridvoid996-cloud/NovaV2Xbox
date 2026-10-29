import test from 'node:test';
import assert from 'node:assert/strict';
import {withSharedBackend,SHARED_BACKEND} from '../server/shared-backend.mjs';
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},end(body){this.body=body}});
test('copies forward auth and body to fixed primary',async()=>{let call;const fn=withSharedBackend('voice',()=>assert.fail(),{env:{},request:async(url,options)=>{call={url,options};return {status:200,text:async()=>'{"ok":true}'}}});const res=response();await fn({method:'POST',headers:{host:'copy.example',authorization:'Bearer demo'},body:{action:'lobby'}},res);assert.equal(call.url,SHARED_BACKEND+'/api/voice');assert.equal(call.options.headers.Authorization,'Bearer demo');assert.equal(call.options.redirect,'error');assert.equal(res.statusCode,200)});
test('primary and independently configured sites use local handler',async()=>{for(const [env,host]of [[{},'novaoffical1.vercel.app'],[{FIREBASE_SERVICE_ACCOUNT_JSON:'private'},'copy.example']]){let called=false;await withSharedBackend('voice',()=>{called=true},{env,request:()=>assert.fail()})({headers:{host}},response());assert.ok(called)}});
test('loops and oversized requests are rejected',async()=>{const fn=withSharedBackend('voice',()=>assert.fail(),{env:{},request:()=>assert.fail()});let res=response();await fn({method:'POST',headers:{host:'copy.example','x-nova-shared-hop':'1'}},res);assert.equal(res.statusCode,503);res=response();await fn({method:'POST',headers:{host:'copy.example'},body:'a'.repeat(250001)},res);assert.equal(res.statusCode,413)});
test('failures hide details and unknown endpoints cannot forward',async()=>{const res=response();await withSharedBackend('voice',()=>assert.fail(),{env:{},request:()=>{throw Error('secret')}})({method:'POST',headers:{},body:{}},res);assert.equal(res.statusCode,503);assert.ok(!res.body.includes('secret'));assert.throws(()=>withSharedBackend('arbitrary',()=>{}))});

test('upstream payment and HTML errors never masquerade as JSON',async()=>{
 for(const [status,body]of [[402,'Payment required'],[500,'<html>Server failure</html>']]){
  const res=response();await withSharedBackend('owner-control',()=>assert.fail(),{env:{},request:async()=>({status,text:async()=>body})})({method:'POST',headers:{},body:{}},res);
  assert.equal(res.statusCode,503);assert.ok(JSON.parse(res.body).error.includes(status===402?'Vercel':'unavailable'));
 }
});
test('an older primary rank API reports the required deployment without hiding unrelated errors',async()=>{
 for(const action of ['rankBoard','rankPulse','status']){const res=response();const handler=withSharedBackend('owner-control',()=>assert.fail(),{env:{},request:async()=>({status:400,text:async()=>JSON.stringify({error:'Unknown action.'})})});await handler({method:'POST',headers:{host:'127.0.0.1:8794'},body:{action}},res);assert.equal(res.statusCode,action==='status'?400:503);assert.match(JSON.parse(res.body).error,action==='status'?/Unknown action/:/published to the main account server/)}
});
