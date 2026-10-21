export function classifyGameIssue(value){
 const text=String(value?.message||value||'');
 if(/SharedArrayBuffer|cross.origin.isolat|COOP|COEP/i.test(text))return {kind:'isolation',retry:false,message:'This emulator needs browser isolation support. Its hosting configuration must be updated.'};
 if(/out of memory|memory access out of bounds|allocation failed/i.test(text))return {kind:'memory',retry:false,message:'The game ran out of memory. Close other tabs, then retry.'};
 if(/webgl|graphics context|context lost/i.test(text))return {kind:'graphics',retry:true,message:'The graphics connection stopped. Waiting for the browser to restore it…'};
 if(/compileerror|linkerror|wasm|webassembly|instantiate|unity.*abort|abort\(/i.test(text))return {kind:'engine',retry:true,message:'The game engine could not start. Retrying its startup…'};
 if(/404|not found|unexpected data size|integrity|checksum/i.test(text))return {kind:'asset',retry:false,message:'A required game file is missing or damaged. The game files need updating.'};
 if(/websocket|socket|failed to fetch|could not download|network|connection|empty page|proxy.*load|timed? ?out|code (?:18|35|56|92)/i.test(text))return {kind:'connection',retry:true,message:'The game connection stopped. Checking the connection…'};
 return {kind:'unknown',retry:false,message:'The game reported an error. You can retry without clearing your saves.'};
}

// Preserve formats and bytes; only repair the MIME label required by streaming WASM.
export function gameAssetResponse(url,response){
 if(response.status!==200||!url.pathname.endsWith('.wasm'))return response;
 return {...response,headers:[...response.headers.filter(([name])=>name.toLowerCase()!=='content-type'),['Content-Type','application/wasm']]};
}

export function reserveGameRetry(storage,key,now=Date.now()){
 try{const id='nova-game-recovery:'+key;const values=JSON.parse(storage.getItem(id)||'[]');const recent=(Array.isArray(values)?values:[]).filter(t=>typeof t==='number'&&now-t<120000&&t<=now);if(recent.length>=2)return false;storage.setItem(id,JSON.stringify([...recent,now]));return true}catch{return false}
}

export async function requestGameResource(request,args,{timeout=20000,onIssue=()=>{},onProgress=()=>{},delay=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const [url,method,body,headers,signal]=args;
 if(!['GET','HEAD'].includes(method))return request(...args);
 for(let attempt=0;;attempt++){
  const abort=new AbortController();let timer;
  const cancel=()=>abort.abort(signal?.reason);
  if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
  try{
   // Large ROMs, archives and media may legitimately take minutes on a laptop.
   const accept=headers.find(([name])=>name.toLowerCase()==='accept')?.[1]||'';
   const bounded=!headers.some(([name])=>name.toLowerCase()==='range')&&(/\.(?:js|json|html)$/.test(url.pathname)||accept.includes('text/html')||url.pathname==='/');
   const operation=request(url,method,body,headers,bounded?abort.signal:signal);
   let response=bounded?await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>{const error=Error('Game startup request timed out');reject(error);abort.abort(error)},timeout)})]):await operation;
   const github=url.hostname==='cdn.jsdelivr.net'&&url.pathname.match(/^\/gh\/([^/]+)\/([^/@]+)@([^/]+)\/(.+)$/);if(response.status===403&&github){const text=typeof response.body==='string'?response.body:await new Response(response.body).text();response={...response,body:text};if(/File size exceeded the configured limit/i.test(text)){const mirror=new URL('https://raw.githubusercontent.com/'+github[1]+'/'+github[2]+'/'+github[3]+'/'+github[4]);response=await request(mirror,method,body,headers.filter(([name])=>!['authorization','cookie'].includes(name.toLowerCase())),signal)}}
   if([408,502,503,504].includes(response.status)&&attempt===0&&!signal?.aborted){await delay(300);continue}
   if(response.status>=400)onIssue({kind:'asset',retry:false,message:response.status===404?'A required game file was not found.':'A game server returned an error.',status:response.status});
   else onProgress();
   return gameAssetResponse(url,response);
  }catch(error){if(attempt||signal?.aborted||!classifyGameIssue(error).retry)throw error;await delay(300)}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
 }
}
