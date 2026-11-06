// The inspected host module reads location.origin outside Scramjet's virtual
// location wrapper. Pin only its default data server, preserving user overrides.
export async function repairSkateGame(url,response,{gameId}={}){
 if(String(gameId)!=='1046'||url.origin!=='https://skate.aaddpp.lol'||url.pathname!=='/host.js'||response.status!==200)return response;
 const text=await new Response(response.body).text();
 const marker="return (saved || location.origin).replace(/\\/+$/, '');";
 if(!text.includes(marker))throw Error('Skate’s data loader changed. Nova needs a compatibility update.');
 // The source already provides an IndexedDB download cache. Use it here:
 // Scramjet's CacheStorage key wrappers reject this loader's synthetic URLs.
 const repaired=text.replace(marker,"return (saved || 'https://skate.aaddpp.lol').replace(/\\/+$/, '');")
  .replace("const cacheApi = () => typeof caches !== 'undefined' && window.isSecureContext;",'const cacheApi = () => false;');
 return {...response,body:repaired,headers:response.headers.filter(([name])=>!['content-length','content-encoding'].includes(name.toLowerCase()))};
}
