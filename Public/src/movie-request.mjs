// Bound startup reads without putting a deadline on the movie's media stream.
export async function requestMovieResource(request,args,{timeout=12000}={}){
 const [url,method,body,headers,signal]=args;
 const startup=/^(GET|HEAD)$/.test(method)&&!headers.some(([name])=>name.toLowerCase()==='range')&&(/\/watch(?:\/|$)|\/embed(?:\/|$)|\/api\//.test(url.pathname)||/\.(?:html|js|json|m3u8)$/.test(url.pathname));
 if(!startup)return request(...args);
 if(timeout===12000&&/\/api\/stream(?:\/|$)/.test(url.pathname))timeout=Math.max(timeout,45000);
 const abort=new AbortController();let timer;
 const cancel=()=>abort.abort(signal?.reason);
 if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
 try{return await Promise.race([(async()=>{for(let attempt=0;;attempt++){const response=await request(url,method,body,headers,abort.signal);if(attempt||!([408,502,503,504].includes(response.status)||response.status===404&&/\/(?:watch|embed)(?:\/|$)/.test(url.pathname))||abort.signal.aborted)return response;try{await response.body?.cancel?.()}catch{}}})(),new Promise((_,reject)=>{timer=setTimeout(()=>{const error=Error('Movie startup request timed out');error.name='MovieRequestTimeout';reject(error);abort.abort(error)},timeout)})])}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
}

export function createMovieRequest(request=fetch,now=Date.now){const cache=new Map();const read=async(url,options)=>{for(let attempt=0;;attempt++){const response=await request(url,attempt?{...options,cache:'no-store'}:options);if(!/\/api\/movies\?/.test(String(url)))return response;const text=await response.text();let valid=true;try{JSON.parse(text)}catch{valid=false}if(attempt===0&&(!valid||[408,429,500,502,503,504].includes(response.status))&&!options.signal?.aborted)continue;if(!valid)throw Error('The movie service returned an unavailable page. Please retry in a moment.');return new Response(text,{status:response.status,headers:response.headers})}};return async(url,options={})=>{if(options.signal||!/[?&]op=(details|season|anime|home)(?:&|$)/.test(url))return read(url,options);let entry=cache.get(url);if(!entry||entry.until<now()){const promise=read(url,options).then(async response=>{const text=await response.text();if(!response.ok)cache.delete(url);return {text,status:response.status,headers:[...response.headers]}}).catch(e=>{cache.delete(url);throw e});entry={promise,until:now()+300000};cache.set(url,entry);if(cache.size>100)cache.delete(cache.keys().next().value)}const d=await entry.promise;return new Response(d.text,{status:d.status,headers:d.headers})}}
