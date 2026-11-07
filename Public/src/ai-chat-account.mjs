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
  count.className='chat-token-count';buy.textContent='+2,000 tokens · 500K coins';buy.type='button';footer.prepend(count,buy);
  async function refresh(){try{const result=await call({op:'status'});count.textContent=result.tokens.toLocaleString()+' tokens available'}catch{count.textContent='Sign in to use account tokens'}}
  buy.onclick=async()=>{buy.disabled=true;try{await call({op:'buy',requestId:crypto.randomUUID()});await refresh()}catch(error){document.getElementById('status').textContent=error.message}finally{buy.disabled=false}};
  refresh();
  return {async request(data){try{return await call({op:'generate',requestId:crypto.randomUUID(),...data,mode:'chat'})}finally{refresh()}}};
}
