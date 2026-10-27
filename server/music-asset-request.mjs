// A startup deadline must never become a deadline for an entire song body.
export async function requestMusicAsset(request,url,{method='GET',headers={},res,timeout=20000}={}){
 const controller=new AbortController();const close=()=>controller.abort();res?.once?.('close',close);
 const timer=setTimeout(()=>controller.abort(),timeout);timer.unref?.();
 try{for(let attempt=0;attempt<2;attempt++){
  let response;try{response=await request(url,{method,headers:attempt?{...headers,'Cache-Control':'no-cache'}:headers,cache:'no-store',redirect:'error',signal:controller.signal})}catch(error){if(attempt===0&&!controller.signal.aborted)continue;throw error}
  const temporary=[404,408,429,500,502,503,504].includes(response.status)||/text\/html/i.test(response.headers.get('content-type')||'');
  if(attempt===0&&temporary&&!controller.signal.aborted){await response.body?.cancel();continue}return response;
 }}
 catch(error){res?.removeListener?.('close',close);throw error}
 finally{clearTimeout(timer)}
}
