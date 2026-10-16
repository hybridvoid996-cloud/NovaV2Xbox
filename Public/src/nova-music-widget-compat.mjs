// Preserve the calling frame's realm for Scramjet's postMessage adapter.
// Empty transfer lists do not change the public SoundCloud Widget protocol.
export async function musicWidgetResponse(target,response){
 if(response.status!==200)return response;
 let before,after;
 if(target.origin==='https://w.soundcloud.com'&&target.pathname==='/player/api.js'){before='i.postMessage(o,r)';after='i.postMessage(o,r,[])'}
 else if(target.origin==='https://widget.sndcdn.com'&&/^\/widget-\d+-[a-f0-9]+\.js$/.test(target.pathname)){before='o.postMessage(r,"*")';after='o.postMessage(r,"*",[])'}
 else return response;
 const source=await new Response(response.body).text();
 return {...response,body:source.replace(before,after),headers:response.headers.filter(([name])=>!['content-length','content-encoding'].includes(name.toLowerCase()))};
}
