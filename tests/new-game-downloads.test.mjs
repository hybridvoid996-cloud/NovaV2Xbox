import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
for(const id of [1058,1059]){
 const html=fs.readFileSync(`Public/content/noah-import/games/${id}.html`,'utf8');
 const fn=html.slice(html.indexOf('async function fetchWithProgress'),html.indexOf('async function mergeFiles'));
 function loader(response){const ctx={Blob,Uint8Array,loadedBytes:0,loadingText:{textContent:''},fetch:async()=>response};vm.createContext(ctx);vm.runInContext(fn,ctx);return ctx.fetchWithProgress}
 test(`game ${id} rejects missing, HTML and empty download parts`,async()=>{
  for(const response of [new Response('not found',{status:404}),new Response('<!doctype html>',{headers:{'Content-Type':'text/html'}}),new Response(new Uint8Array())])await assert.rejects(loader(response)('part1'),/Could not download|returned a page|empty file/);
 });
 test(`game ${id} preserves downloaded bytes as a Blob`,async()=>{
  const blob=await loader(new Response(new Uint8Array([0,97,115,109])))('part1');
  assert(blob instanceof Blob);assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())],[0,97,115,109]);
 });
}
test('Turbo Dismount has an executable local progress callback without the rejected CDN dependency',()=>{
 const html=fs.readFileSync('Public/content/noah-import/games/1051.html','utf8');
 assert(!html.includes('src="TemplateData/UnityProgress.js"'));
 const code=html.match(/<script>\s*(\/\/ This build[\s\S]*?)<\/script>/)[1];
 let meter;
 const host={querySelector:()=>meter,appendChild:m=>meter=m};
 const ctx={document:{getElementById:()=>host,createElement:()=>({style:{},setAttribute(){},remove(){meter=null}})}};
 vm.createContext(ctx);vm.runInContext(code,ctx);ctx.UnityProgress({container:host},.6);assert.equal(meter.value,.6);ctx.UnityProgress({container:host},1);assert.equal(meter,null);
});
test('Turbo split downloads recover CDN failures without changing other requests',async()=>{
 const html=fs.readFileSync('Public/content/noah-import/games/1051.html','utf8');
 const code=html.match(/<script>\s*(\/\/ Recover only[\s\S]*?)<\/script>/)[1];
 const calls=[],ctx={Request,URL,document:{baseURI:'https://cdn.jsdelivr.net/gh/Nawsif/turbodismount@main/'},window:{fetch:async(url,options)=>{calls.push({url,options});return new Response('x',{status:new URL(url,'https://cdn.jsdelivr.net/gh/Nawsif/turbodismount@main/').hostname==='cdn.jsdelivr.net'?403:200})}}};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 const r=await ctx.window.fetch('Build/RawWebBuild32.data.unityweb.part004');
 assert.equal(r.status,200);assert.equal(calls[1].url,'https://raw.githubusercontent.com/Nawsif/turbodismount/main/Build/RawWebBuild32.data.unityweb.part004');assert.equal(calls[1].options.credentials,'omit');
 calls.length=0;await ctx.window.fetch('Build/UnityLoader.js');assert.equal(calls.length,1);
 calls.length=0;await ctx.window.fetch('Build/RawWebBuild32.data.unityweb.part004',{method:'POST'});assert.equal(calls.length,1);
});
test('Feed and Grow assembles ordered parts without a second contiguous allocation',async()=>{
 const html=fs.readFileSync('Public/content/noah-import/games/1060.html','utf8');
 const code=html.slice(html.indexOf('async function assembleSplitFile'),html.indexOf('async function loadGame'));
 let result;const ctx={Blob,PART_SIZES:{pack:[2,2]},setLoading(){},fetchChunkWithRetry:async(path,size)=>{assert.equal(size,2);return new Uint8Array(path.endsWith('0001')?[1,2]:[3,4]).buffer},URL:{createObjectURL:blob=>{result=blob;return 'blob:test'}}};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 assert.equal(await ctx.assembleSplitFile('pack',2,'application/octet-stream',0,70),'blob:test');
 assert.deepEqual([...new Uint8Array(await result.arrayBuffer())],[1,2,3,4]);
});
test('Turbo config resolves locally while preserving reconstructed engine asset URLs',()=>{
 const html=fs.readFileSync('Public/content/noah-import/games/1051.html','utf8');
 const config=JSON.parse(fs.readFileSync('Public/content/noah-import/runtime/turbo-build.json','utf8'));
 assert(html.includes('new URL("/content/noah-import/runtime/turbo-build.json", location.origin).href'));
 for(const field of ['dataUrl','wasmCodeUrl','wasmFrameworkUrl'])assert(config[field].startsWith('https://cdn.jsdelivr.net/gh/Nawsif/turbodismount@main/Build/'));
 assert.equal(config.TOTAL_MEMORY,805306368);
});
