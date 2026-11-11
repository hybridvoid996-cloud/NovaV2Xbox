export function isRecoverableAIError(error){
 if(error.status===402)return false;
 return [408,500,502,503,504].includes(error.status)||error.name==='AbortError'||error.name==='TypeError'||/unavailable|timed out|network|failed to fetch|current AI reply|3 seconds between/i.test(error.message||'');
}
// Keep one request ID through reconnection so a lost response can be replayed safely.
export async function recoverAIRequest(call,request,{onStatus=()=>{},sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=8}={}){
 for(let attempt=0;attempt<attempts;attempt++){
  try{return await call(request)}catch(error){
   if(!isRecoverableAIError(error)||attempt===attempts-1)throw error;
   onStatus('AI connection interrupted. Reconnecting… Your message is saved.');
   await sleep(Math.min(12000,3000*2**attempt));
  }
 }
}
