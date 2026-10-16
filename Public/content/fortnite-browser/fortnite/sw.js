/* Keep the game's real worker and file cache, using the directly deployed Nova API. */
const nativeFetch=self.fetch.bind(self),runtimeRoot='/content/fortnite-browser/',legacyRoot='/game-runtime/fortnite18/';
function relayURL(value){const url=new URL(value,self.location.href);if(url.origin!==self.location.origin||url.pathname===runtimeRoot+'fortnite/bootstrap.js')return null;const prefix=[runtimeRoot,legacyRoot].find(root=>url.pathname.startsWith(root));if(!prefix)return null;const target=new URL('/api/fortnite',self.location.origin);for(const [key,value]of url.searchParams)target.searchParams.append(key,value);target.searchParams.set('path',url.pathname.slice(prefix.length));return target.href}
self.fetch=async(input,init)=>{const request=new Request(input instanceof Request?input:new URL(input,self.location.href),init),target=relayURL(request.url);if(!target)return nativeFetch(request);if(request.method==='GET'||request.method==='HEAD')return nativeFetch(new Request(target,request));return nativeFetch(target,{method:request.method,headers:request.headers,body:await request.arrayBuffer(),cache:request.cache,credentials:'same-origin',mode:'same-origin',signal:request.signal})};
importScripts('/api/fortnite?path=fortnite/sw.js');
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.mode==='navigate'||!relayURL(url.href)||url.pathname.includes('/__fnvfs/'))return;
 // The original game worker owns shell assets and virtual game-file requests.
 if(event.request.method==='GET'&&!event.request.headers.has('Range')&&!event.request.headers.has('Authorization')&&/\.(?:js|mjs|wasm|otf|ttf|png)$/.test(url.pathname))return;
 event.respondWith(self.fetch(event.request));
});
