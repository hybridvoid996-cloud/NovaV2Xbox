// Chat uses the existing account credit service. Old editor drafts stay untouched.
export function mountWorkspace() {
  let control;
  async function call(data) {
    if (['localhost','127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('local-ai-preview')==='1') {
      const response=await fetch('/api/local-ai-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      const result=await response.json();if(!response.ok)throw Error(result.error);return result;
    }
    control ||= import('./control-client.js');return (await control).control('aiWorkspace',data);
  }
  const footer=document.querySelector('.sidebar-foot'),count=document.createElement('small'),buy=document.createElement('button');
  count.className='chat-token-count';buy.textContent='+25,000 tokens · 500K coins';buy.type='button';footer.prepend(count,buy);
  const policy=document.createElement('small');policy.className='ai-token-policy';policy.textContent='Tokens: Anko models + Code mode. Older models are free in Chat.';buy.after(policy);
  async function refresh(){try{const result=await call({op:'status'});count.textContent=(result.preview?'Local demo · ':'')+result.tokens.toLocaleString()+' tokens · '+Number(result.coins||0).toLocaleString()+(result.preview?' test coins':' coins');buy.textContent='+'+Number(result.refillTokens||25000).toLocaleString()+' tokens · 500K '+(result.preview?'test coins':'coins')}catch{count.textContent='Sign in to use account tokens'}}
  buy.onclick=async()=>{buy.disabled=true;const status=document.getElementById('status');status.textContent='Purchasing tokens…';try{await call({op:'buy',requestId:crypto.randomUUID()});await refresh();status.textContent='Added 25,000 tokens.'}catch(error){status.textContent=error.message}finally{buy.disabled=false}};
  refresh();
  return {async request(data){try{return await call({op:'generate',requestId:crypto.randomUUID(),...data,mode:data.mode==='code'?'code':'chat'})}finally{refresh()}}};
}
