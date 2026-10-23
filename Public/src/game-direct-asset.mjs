// Public binary exports can use the browser's fast HTTP path. Networks that
// block these hosts still fall back to Nova's normal transport.
export async function directGameAsset(target,{gameId,method='GET',signal,headers={},fetcher=fetch,headerTimeout=2000}={}){
 if(!gameId||method!=='GET'||target.protocol!=='https:'||!['raw.githubusercontent.com','cdn.jsdelivr.net','fastly.jsdelivr.net','gcore.jsdelivr.net'].includes(target.hostname)||!/\.(?:wasm|data|unx|unityweb|webm)(?:\.part\d+)?$/.test(target.pathname))return null;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),headerTimeout);
 try{
  const range=Object.entries(headers).find(([name])=>name.toLowerCase()==='range')?.[1];
  const response=await fetcher(target.href,{mode:'cors',credentials:'omit',headers:range?{Range:range}:{},signal:AbortSignal.any([controller.signal,...(signal?[signal]:[])])});
  clearTimeout(timer);
  if(![200,206].includes(response.status)||/^text\//i.test(response.headers.get('content-type')||'')){await response.body?.cancel();return null}
  const body=new Uint8Array(await response.arrayBuffer());
  return {body,status:response.status,statusText:response.statusText,headers:[...response.headers].filter(([name])=>!['content-encoding','content-length'].includes(name.toLowerCase()))};
 }catch(error){if(signal?.aborted)throw error;return null}finally{clearTimeout(timer)}
}
