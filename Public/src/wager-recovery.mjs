// Keep uncertain coin mutations account-bound and replay their original ID.
export function wagerRecoveryKey(uid,action,body){return `nova-wager-pending:${uid}:${action}:${body.game||'mines'}`}
export async function recoverableWager({uid,action,body,send,storage,delay=ms=>new Promise(r=>setTimeout(r,ms))}){
 const key=wagerRecoveryKey(uid,action,body);
 let saved;
 try{saved=JSON.parse(storage?.getItem(key)||'null')}catch{}
 const mutation=body.op!=='status';
 const request=saved&&saved.action===action&&saved.body?.requestId?saved.body:body;
 if(mutation||request.op!=='status'){
  try{storage?.setItem(key,JSON.stringify({action,body:request}))}catch{}
 }
 for(let attempt=0;attempt<2;attempt++){
  try{
   const result=await send(request);
   try{storage?.removeItem(key)}catch{}
   return result;
  }catch(error){
   const uncertain=!error.status||error.status>=500||error.status===408;
   if(!uncertain){try{storage?.removeItem(key)}catch{}throw error}
   if(attempt===1)throw error;
   await delay(250);
  }
 }
}
