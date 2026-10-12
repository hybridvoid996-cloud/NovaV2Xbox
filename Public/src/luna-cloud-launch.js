/* The selected Luna title auto-starts; reveal it only after video playback begins. */
(()=>{
 const attached=new WeakSet();
 function attach(doc,item,{signal,onStatus=()=>{},onReady=()=>{},onError=()=>{}}={}){
  if(signal?.aborted||item.source!=='Luna'||!item.sourceId||!doc.getElementById('root')||!doc.defaultView)return false;
  if(attached.has(doc))return true;attached.add(doc);
  const win=doc.defaultView;let ended=false,opened=false,played=false,confirmed=false,lastStatus='',observer,timer,poll;
  const stop=()=>{if(ended)return;ended=true;observer?.disconnect();win.clearTimeout(timer);win.clearInterval(poll);signal?.removeEventListener('abort',stop);win.removeEventListener('pagehide',stop)};
  const status=text=>{if(text&&text!==lastStatus){lastStatus=text;onStatus(text)}};
  const update=()=>{
   if(ended)return;
   const frame=doc.querySelector('.player iframe');
   if(frame){
    try{const player=frame.contentDocument,video=player?.querySelector('video');
     if(video?.videoWidth>0&&video.readyState>=2&&!video.paused){status('Luna game connected.');onReady();stop();return}
     if(/Unable to Join Game|Connection failed after several attempts/i.test(player?.body?.innerText||'')){onError('Luna could not connect the game stream. Try again or choose another cloud.');stop();return}
    }catch{}
    status('Connecting Luna’s game stream…');return;
   }
   if(opened){
    const play=doc.querySelector('.details-card .hc-play-btn');
    if(!played&&play&&!play.disabled){played=true;play.click();status('Starting '+item.name+' on Luna…');return}
    const confirm=doc.querySelector('.warn-card .warn-confirm');
    if(played&&!confirmed&&confirm&&!confirm.disabled&&confirm.textContent.trim()==='I understand'&&/You are using a guest account\./.test(confirm.closest('.warn-card')?.textContent||'')){confirmed=true;confirm.click();status('Connecting your Luna guest session…');return}
    const message=doc.querySelector('.launch-toast,.login-err')?.textContent?.trim();if(message)status(message.slice(0,250));return;
   }
   const cards=[...doc.querySelectorAll('.tile-card')];
   if(!cards.length){const games=[...doc.querySelectorAll('header button,.topbar button,nav button')].find(b=>(b.getAttribute('aria-label')||b.getAttribute('title')||b.textContent).trim()==='Games');if(games){games.click();status('Loading Luna’s game library…')}return}
   const card=cards.find(c=>{const src=c.querySelector('img')?.getAttribute('src')||'';return src.includes('/'+item.sourceId+'_')||src.includes('/'+item.sourceId+'.')})||cards.find(c=>c.getAttribute('title')===item.name);
   const details=card?.querySelector('.tile-info');if(!details)return;
   opened=true;win.clearTimeout(timer);details.click();status('Preparing '+item.name+' on Luna…');
  };
  observer=new win.MutationObserver(update);observer.observe(doc.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
  timer=win.setTimeout(()=>{onError('Luna could not find this game. Try again or choose another cloud.');stop()},45000);
  poll=win.setInterval(update,150);signal?.addEventListener('abort',stop,{once:true});win.addEventListener('pagehide',stop,{once:true});update();return true;
 }
 window.NovaLunaCloud={attach};
})();
