import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../Public/src/synapse-compat.js',import.meta.url),'utf8');
function fixture(){let release;const applied=[];class Peer{setRemoteDescription(){return new Promise(resolve=>{release=()=>{this.remoteDescription={type:'offer'};resolve()}})}addIceCandidate(c){assert.ok(this.remoteDescription);applied.push(c);return Promise.resolve()}createAnswer(){assert.ok(this.remoteDescription);return Promise.resolve({type:'answer'})}close(){}}const window={RTCPeerConnection:Peer};vm.runInNewContext(source,{window,Promise,WeakMap,DOMException,Response});return {api:window.NovaSynapseCompat,Peer,applied,release:()=>release()}}
test('buffers early ICE and waits for the remote description before answering',async()=>{const f=fixture();f.api.install();const pc=new f.Peer();const candidate=pc.addIceCandidate('early'),remote=pc.setRemoteDescription({}),answer=pc.createAnswer();await Promise.resolve();assert.equal(f.applied.length,0);f.release();await Promise.all([candidate,remote,answer]);assert.deepEqual(f.applied,['early'])});
test('close rejects pending candidates and does not apply them later',async()=>{const f=fixture();f.api.install();const pc=new f.Peer();const candidate=pc.addIceCandidate('early');pc.close();await assert.rejects(candidate,{name:'InvalidStateError'});assert.equal(f.applied.length,0)});

async function entryFixture(result,embedded=true){
 const f=fixture(),messages=[],nodes=new Map(),button={innerHTML:'Play Now',disabled:false,isConnected:true,parentElement:{append(box){nodes.set(box.id,box)}}};nodes.set('play-btn-el',button);
 const document={getElementById:id=>nodes.get(id),createElement:()=>({style:{},setAttribute(){}})};
 const app={customFetch:async()=>result,handlePlay:async function(){button.disabled=true;button.innerHTML='Connecting...';await this.customFetch('/phone/connect')},init(){}};
 const window={App:app},parent=embedded?{postMessage:message=>messages.push(message)}:window;
 const patched=await f.api.patchEntry({body:'const ready = window.App.init();',headers:[]});
 vm.runInNewContext(patched.body.slice(0,patched.body.indexOf('const ready')), {window,document,parent,clearInterval,Error});
 return {app,button,messages,nodes};
}
test('empty Synapse rejection reports its code and restores Play without a native popup',async()=>{
 const f=await entryFixture({code:30003,message:'',data:null});await f.app.handlePlay();
 assert.equal(f.button.disabled,false);assert.equal(f.button.innerHTML,'Play Now');
 assert.equal(f.nodes.has('nova-synapse-error'),false);
 assert.match(f.messages[0].message,/30003.*Retry or switch/);
 assert.equal(f.messages[0].achromaSynapse,'error');
});
test('zero remaining play time is recognized regardless of case without attempting a session',async()=>{
 for(const timeLeft of ['0H 0M','0h 0m',' 0H   0M ']){
  const f=await entryFixture({code:0,data:{android_instance_id:'instance'}});let connects=0;f.app.token='signed-in';f.app.timeLeft=timeLeft;f.app.customFetch=async()=>{connects++};await f.app.handlePlay();
  assert.equal(connects,0);assert.equal(f.messages.length,1);assert.match(f.messages[0].message,/no play time remaining/);assert.equal(f.button.disabled,false);
 }
});
test('standalone errors render once inline while embedded errors are sent only to Nova',async()=>{
 for(const embedded of [true,false]){
  const f=await entryFixture({},embedded);f.app.handlePlay= f.app.handlePlay.bind(f.app);
  f.app.token='signed-in';f.app.timeLeft='0H 0M';await f.app.handlePlay();
  assert.equal(f.messages.length,embedded?1:0);assert.equal(f.nodes.has('nova-synapse-error'),!embedded);
 }
});
test('provider time check also handles exhausted time after guest sign-in',async()=>{
 const f=fixture(),patched=await f.api.patchEntry({body:'if (this.timeLeft === "0h 0m") { alert("No time left."); }',headers:[]});
 const messages=[];vm.runInNewContext('(function(){'+patched.body+'}).call({timeLeft:"0H 0M"})',{alert:m=>messages.push(m)});
 assert.equal(messages.length,1);assert.match(messages[0],/no play time remaining/);
});
test('successful and queued sessions preserve the provider response without errors',async()=>{
 for(const data of [{android_instance_id:'instance',sid:'session'},{position:0},{position:4}]){
  const f=await entryFixture({code:'0',data});assert.equal((await f.app.customFetch('/phone/connect')).code,0);await f.app.handlePlay();assert.equal(f.messages.length,0);assert.equal(f.button.disabled,false);
 }
});
test('a malformed successful response cannot leave Connecting stuck',async()=>{
 const f=await entryFixture({code:0,data:{}});await f.app.handlePlay();assert.match(f.messages[0].message,/could not start/);assert.equal(f.button.innerHTML,'Play Now');
});
test('patches the broken loading call and injects compatibility before provider scripts',async()=>{const f=fixture();const response={body:'<head><script>socketBind;joinRoom;loading();</script>',headers:[['Content-Length','10'],['Content-Type','text/html']],status:200};const patched=await f.api.patchPlayer(response);assert.match(patched.body,/typeof loading/);assert.ok(patched.body.indexOf('__novaSynapseCompat')<patched.body.indexOf('socketBind'));assert.equal(patched.headers.length,1);const other={...response,body:'<head>Unrelated'};assert.equal(await f.api.patchPlayer(other),other)});

test('stale or repeated channel close cannot close a newer peer or throw on null',async()=>{
 const f=fixture(),html='<head><script>socketBind;joinRoom;_0x239d1b[a0_0x2ea2(0x252)] = () => {this.pc[a0_0x2ea2(0x1ff)]();this.pc = null;this[a0_0x2ea2(0x334)] = null;};</script>';
 const patched=await f.api.patchPlayer({body:html,headers:[]});const code=patched.body.slice(patched.body.lastIndexOf('<script>')+8,patched.body.lastIndexOf('</script>'));
 const channel={},keys={0x252:'onclose',0x1ff:'close',0x334:'channel'};let closes=0;const host={pc:{close(){closes++}},channel};vm.runInNewContext('(function(){'+code+'}).call(host)',{socketBind:null,joinRoom:null,host,_0x239d1b:channel,a0_0x2ea2:key=>keys[key]});
 channel.onclose();channel.onclose();assert.equal(closes,1);host.pc={close(){closes++}};host.channel={};channel.onclose();assert.equal(closes,1);
});
