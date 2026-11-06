// Keep byte reads of a frame's own Blob URLs in that frame. Sending the read
// to the parent controller can fail across browser storage/agent partitions.
// This does not turn arbitrary blob URLs into native-origin URLs: only URLs
// created and recorded by this exact Scramjet client can use the fast path.
export function patchProxyBlob(source){
 const create='r.startsWith("blob:")?t.return((0,i.IP)(r,e.context,e.meta)):t.return(r)';
 const fetch='let r=(0,n.Qf)(t.args[0]);t.args[0]=e.rewriteUrl(r,s(t.args[1]))';
 const revoke='let r=(0,n.Qf)(t.args[0]);t.args[0]=(0,i.$n)(r,e.context,e.meta),t.call()';
 if(!source.includes(create)||source.split(fetch).length!==3||!source.includes(revoke))throw Error('Scramjet Blob/fetch hooks changed; review same-frame blob support.');
 return source.replace(create,'r.startsWith("blob:")?(()=>{const v=(0,i.IP)(r,e.context,e.meta);(e.novaLocalBlobs??=new Map).set(v,r);e.novaLocalBlobs.set(r,r);t.return(v)})():t.return(r)')
 .replaceAll(fetch,'let r=(0,n.Qf)(t.args[0]);const local=e.novaLocalBlobs?.get(r);if(local){t.args[0]=local;return}t.args[0]=e.rewriteUrl(r,s(t.args[1]))')
 .replace(revoke,'let r=(0,n.Qf)(t.args[0]);const local=e.novaLocalBlobs?.get(r);e.novaLocalBlobs?.delete(r);if(local)e.novaLocalBlobs?.delete(local);t.args[0]=(0,i.$n)(r,e.context,e.meta),t.call()');
}

export function patchControllerBlob(source){
 const marker='fetchBlobUrl:async e=>t.Sr.fromNativeResponse(await fetch(e))';
 if(source.split(marker).length!==2)throw Error('Scramjet controller blob reader changed; review frame-owned reads.');
 // Large data: scripts become temporary blobs in the controller itself. Read
 // those natively first; routing them through the frame rewrites them again.
 // Frame-created blobs still need their owning frame on partitioned browsers.
 return source.replace(marker,'fetchBlobUrl:async e=>{let response;try{response=await fetch(e)}catch(error){if(!r.contentWindow)throw error;response=await r.contentWindow.fetch(e)}return t.Sr.fromNativeResponse(new Response(await response.arrayBuffer(),{status:response.status,statusText:response.statusText,headers:response.headers}))}');
}
