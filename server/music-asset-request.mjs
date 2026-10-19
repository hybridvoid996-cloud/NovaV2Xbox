// A startup deadline must never become a deadline for an entire song body.
export async function requestMusicAsset(request,url,{method='GET',headers={},res,timeout=20000}={}){
 const controller=new AbortController();const close=()=>controller.abort();res?.once?.('close',close);
 const timer=setTimeout(()=>controller.abort(),timeout);timer.unref?.();
 try{return await request(url,{method,headers,redirect:'error',signal:controller.signal})}
 catch(error){res?.removeListener?.('close',close);throw error}
 finally{clearTimeout(timer)}
}
