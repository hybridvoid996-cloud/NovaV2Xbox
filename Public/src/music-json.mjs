// A deployment's HTML error page must never become playback metadata.
export async function musicJSON(request,url,options={}){
 const {shouldRetry,...settings}=options;
 for(let attempt=0;attempt<2;attempt++){
  let response,data;
  try{
   response=await request(url,{...settings,cache:'no-store'});
   const html=/text\/html/i.test(response.headers?.get('content-type')||'');
   if(html){await response.body?.cancel();throw Object.assign(Error('The music connection returned an unavailable page. Retrying may restore playback.'),{status:response.status})}
   try{data=await response.json()}catch{throw Object.assign(Error('The music connection returned an unavailable page. Please retry.'),{status:response.status})}
   if(!response.ok)throw Object.assign(Error(data?.error||'The music connection is temporarily unavailable.'),{status:response.status});
   if(!data||typeof data!=='object'||Array.isArray(data))throw Object.assign(Error('The music service returned invalid playback data.'),{status:502});
   return data;
  }catch(error){
   if(error.name==='AbortError'||options.signal?.aborted)throw error;
   if(attempt===0&&(!shouldRetry||shouldRetry())&&(!error.status||[200,404,408,429,500,502,503,504].includes(error.status)))continue;
   throw error;
  }
 }
}
