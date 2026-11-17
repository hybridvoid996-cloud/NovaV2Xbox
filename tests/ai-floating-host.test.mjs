import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../Public/src/ai-floating-host.js',import.meta.url),'utf8');
function host({capture=async()=>({id:'capture'}),floating=async()=>({id:'floating'}),supported=true}={}){
 const window={navigator:{mediaDevices:{getDisplayMedia:capture}}};window.top=window;
 if(supported)window.documentPictureInPicture={requestWindow:floating};
 vm.runInNewContext(source,{window,Error});return window;
}
test('capture and floating start in the original click before awaiting permission',async()=>{
 const calls=[],stream={},floating={};let grant;
 const window=host({capture:options=>{calls.push(['capture',options]);return new Promise(resolve=>grant=resolve)},floating:async options=>{calls.push(['floating',options]);return floating}});
 const options={video:{displaySurface:'monitor'},audio:false},pending=window.NovaCaptureAndFloat(options);
 assert.equal(calls.length,2);grant(stream);const result=await pending;
 assert.deepEqual(calls.map(c=>c[0]),['capture','floating']);assert.equal(calls[0][1],options);assert.equal(result.stream,stream);assert.equal(result.floating,floating);assert.equal(result.floatError,'');
});
test('capture cancellation closes the reserved floating window',async()=>{
 const denied=Object.assign(Error('Cancelled'),{name:'NotAllowedError'});
 let closed=false;
 const window=host({capture:async()=>{throw denied},floating:async()=>({close(){closed=true}})});
 await assert.rejects(window.NovaCaptureAndFloat({}),error=>error===denied);assert.equal(closed,true);
});
test('browser activation rejection preserves the stream and supplies a retry reason',async()=>{
 const stream={};const window=host({capture:async()=>stream,floating:async()=>{throw Error('User activation required')}});
 const result=await window.NovaCaptureAndFloat({});assert.equal(result.stream,stream);assert.equal(result.floating,null);assert.match(result.floatError,/activation/);
});
test('unsupported floating API returns a useful capability error',async()=>{
 const window=host({supported:false});const result=await window.NovaCaptureAndFloat({});
 assert.equal(result.floating,null);assert.match(result.floatError,/Chrome or Edge/);
});
test('iframe scripts never register an iframe-owned floating API',()=>{
 const window={top:{}};vm.runInNewContext(source,{window,Error});assert.equal(window.NovaOpenScreenFloat,undefined);assert.equal(window.NovaCaptureAndFloat,undefined);
});


test('simultaneous float clicks share one request and reuse the live window',async()=>{
 let calls=0,grant;
 const window=host({floating:()=>{calls++;return new Promise(resolve=>grant=resolve)}});
 const first=window.NovaOpenScreenFloat(),second=window.NovaOpenScreenFloat();
 assert.equal(calls,1);assert.equal(first,second);
 const floating={closed:false};window.documentPictureInPicture.window=floating;grant(floating);
 assert.equal(await first,floating);assert.equal(await window.NovaOpenScreenFloat(),floating);assert.equal(calls,1);
});
test('Chrome automatic PiP reattaches screen help instead of opening a separate video player',async()=>{
 const actions=new Map(),floating={closed:false};let opened=0,attached;
 const window=host({floating:async()=>{opened++;return floating}});
 window.navigator.mediaSession={setActionHandler:(name,callback)=>actions.set(name,callback)};
 const unbind=window.NovaBindScreenFloat(value=>{attached=value});
 await actions.get('enterpictureinpicture')();assert.equal(attached,floating);assert.equal(opened,1);
 window.documentPictureInPicture.window=floating;await actions.get('enterpictureinpicture')();assert.equal(opened,1);
 unbind();assert.equal(actions.get('enterpictureinpicture'),null);
});
