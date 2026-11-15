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
test('capture permission resolves before automatic floating is requested',async()=>{
 const calls=[],stream={},floating={};let grant;
 const window=host({capture:options=>{calls.push(['capture',options]);return new Promise(resolve=>grant=resolve)},floating:async options=>{calls.push(['floating',options]);return floating}});
 const options={video:{displaySurface:'monitor'},audio:false},pending=window.NovaCaptureAndFloat(options);
 assert.equal(calls.length,1);grant(stream);const result=await pending;
 assert.deepEqual(calls.map(c=>c[0]),['capture','floating']);assert.equal(calls[0][1],options);assert.equal(result.stream,stream);assert.equal(result.floating,floating);assert.equal(result.floatError,'');
});
test('capture cancellation never opens an empty floating window',async()=>{
 const denied=Object.assign(Error('Cancelled'),{name:'NotAllowedError'});
 const window=host({capture:async()=>{throw denied},floating:()=>assert.fail('No floating window without capture consent')});
 await assert.rejects(window.NovaCaptureAndFloat({}),error=>error===denied);
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
