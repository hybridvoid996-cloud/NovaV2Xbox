// Inspect loader UI, not the game canvas: a still canvas alone is not a failure.
export function readGameLoading(doc){
 if(!doc?.querySelectorAll||!doc.defaultView)return null;
 const selectors='#unity-loading-bar,#unity-loading-container,#loading-screen,#loadingScreen,#loading-overlay,#loading,#loader,[role="progressbar"],progress';
 for(const node of doc.querySelectorAll(selectors)){
  if(node.hidden||node.closest('[hidden]'))continue;
  const style=doc.defaultView.getComputedStyle(node),rect=node.getBoundingClientRect();
  if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0||rect.width<1||rect.height<1)continue;
  const text=(node.innerText||'').trim().slice(0,600);
  const error=/failed to (?:load|download|fetch|decompress|initialize)|(?:loading|download|network) (?:error|failed)|unable to (?:load|download)|error (?:loading|downloading)/i.test(text);
  const progress=node.querySelector('[aria-valuenow],progress,[id*="progress-bar-full"],[class*="progress-bar-full"],[data-progress]')||node;
  const percent=text.match(/\b\d+(?:\.\d+)?\s*%/)?.[0]||'';
  return {error,text,signature:[node.id,percent,text.replace(/[.·…]+/g,'').replace(/\s+/g,' ').slice(0,180),progress.getAttribute('aria-valuenow'),progress.getAttribute('value'),progress.getAttribute('data-progress'),progress.style.width].join('|')};
 }
 return null;
}

export function createLoadingWatch({idle=90000,now=Date.now}={}){
 let last=now(),signature=null;
 return {
  progress(){last=now()},
  sample(state){
   if(!state){signature=null;last=now();return null}
   if(state.error)return {kind:'loading',retry:true,message:'The game’s loading screen reported a download failure. Retrying startup…'};
   if(signature!==state.signature){signature=state.signature;last=now();return null}
   if(now()-last>=idle)return {kind:'loading',retry:true,message:'The game’s loading screen stopped making progress. Retrying startup…'};
   return null;
  }
 };
}
