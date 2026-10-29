import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../Public/content/noah-import/games/1036.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('window.__horseyPrepareMemory='),html.indexOf('window.__horseyStart='));
function fixture(){
 const buffer=new ArrayBuffer(768*1024*1024), words=new Uint32Array(buffer);
 words[537755296/4]=536870912; words[604883288/4]=273678336;
 const module={HEAPU8:new Uint8Array(buffer),_malloc:()=>700000000};
 const context={window:{}};vm.runInNewContext(source,context);
 return {words,module,prepare:context.window.__horseyPrepareMemory};
}
test('Horsey reclaims unused guest pages without exposing its image or runtime',()=>{
 const {words,module,prepare}=fixture();prepare(module);
 const bitmap=words[604883276/4], pages=module.HEAPU8.subarray(bitmap,bitmap+8192);
 assert.equal(words[604883268/4],1024);
 assert.ok(pages.subarray(0,1024).every(n=>n===1));
 assert.ok(pages.subarray(4096,4176).every(n=>n===1));
 assert.equal(pages.reduce((n,v)=>n+(v===0),0),7088); // 443 MB, formerly 251 MB.
 assert.equal(pages[8191],0); // never reaches the runtime at 512 MB.
 pages[1200]=1;prepare(module);assert.equal(pages[1200],1); // no reset after allocation.
});
test('Horsey refuses to alter an unexpected or already initialized allocator',()=>{
 const {words,module,prepare}=fixture();words[604883276/4]=123;
 assert.throws(()=>prepare(module),/layout changed/);
 assert.equal(words[604883276/4],123);
});
