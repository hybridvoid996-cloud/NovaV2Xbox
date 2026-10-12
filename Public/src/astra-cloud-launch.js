// Open the selected game and start its normal provider session once ready.
(()=>{
 const attached=new WeakSet();
 function attach(doc,item,{onExit,onReady=()=>{},onStatus=()=>{},onError=()=>{},signal}={}){
  if(signal?.aborted||!item?.name)return false;
  if(attached.has(doc))return true;
  if(!doc.querySelectorAll('button.mp-row[aria-label]').length)return false;
  const win=doc.defaultView;if(!win)return;attached.add(doc);
  let observer,timer,chosen=false,launched=false,stopped=false,exitRequested=false;
  function dialog(){
   const title=doc.getElementById('launch-session-title');
   if(title?.textContent.trim()===item.name)return title.closest('[role="dialog"]');
   return [...doc.querySelectorAll('[role="dialog"],dialog')].find(panel=>{if(typeof panel.querySelectorAll!=='function')return false;const heading=panel.querySelector?.('h1,h2,h3,[data-dialog-title]');return heading?.textContent.trim()===item.name||panel.getAttribute?.('aria-label')===item.name||panel.textContent?.trim().startsWith(item.name+'Do assignments')})||null;
  }
  function dismissButton(button){
   return button.querySelector('path[d="M1 1l12 12M13 1L1 13"]')||/^(close|dismiss)(?:\b|$)/i.test(button.getAttribute('aria-label')||'');
  }
  function preventDismiss(event){
   const panel=dialog();if(!panel)return;
   const button=event.target?.closest?.('button');
   if((event.type==='keydown'&&event.key==='Escape')||
      (event.type==='click'&&(event.target===panel.parentElement||(button&&panel.contains(button)&&dismissButton(button))))){
    event.preventDefault();event.stopImmediatePropagation();
   }
  }
  function streamExit(event){
   const button=event.target?.closest?.('button');
   if(button?.closest('.astra-hud-bar')&&button.textContent.trim()==='Exit'&&doc.querySelector('[aria-label="Game stream"]'))exitRequested=true;
   // Do not cancel the provider handler: it stops the remote session before
   // removing the stream. Only then should Nova navigate away.
  }
  function pageHidden(){if(stopped)return;stop();if(exitRequested)onExit?.()}
  function stop(){
   if(stopped)return;stopped=true;observer?.disconnect();win.clearTimeout(timer);
   doc.removeEventListener('click',preventDismiss,true);doc.removeEventListener('keydown',preventDismiss,true);doc.removeEventListener('click',streamExit,true);
   win.removeEventListener('pagehide',pageHidden);
  }
  function advance(){
   if(stopped)return;
   if(exitRequested){if(!doc.querySelector('[aria-label="Game stream"]')){stop();onExit?.()}return;}
   if(!chosen){
    const matches=[...doc.querySelectorAll('button.mp-row[aria-label]')].filter(b=>b.getAttribute('aria-label')===item.name);
    const button=matches[item.sourceOccurrence||0];if(!button)return;
    chosen=true;button.click();
   }
   const panel=dialog();if(!panel)return;
   const buttons=[...panel.querySelectorAll('button')];
   for(const button of buttons)if(dismissButton(button)){
    button.hidden=true;button.style.setProperty('display','none','important');
    button.setAttribute('aria-hidden','true');button.tabIndex=-1;
   }
   const launch=buttons.find(b=>/^(play now|launch(?: game)?|start game)$/i.test(b.textContent.trim()));
   if(!launched&&launch&&!launch.disabled&&launch.getAttribute('aria-disabled')!=='true'){
    // Set before clicking: React can synchronously update the same panel.
    launched=true;win.clearTimeout(timer);launch.click();onReady();
   }
  }
  observer=new win.MutationObserver(advance);
  observer.observe(doc.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','aria-disabled']});
  doc.addEventListener('click',preventDismiss,true);doc.addEventListener('keydown',preventDismiss,true);doc.addEventListener('click',streamExit,true);
  timer=win.setTimeout(()=>{if(!chosen){stop();onError?.('This game is not available in Astra’s current library. Try another cloud source.');return}onStatus('Astra is still loading. Waiting for its game controls…')},30000);signal?.addEventListener('abort',stop,{once:true});win.addEventListener('pagehide',pageHidden,{once:true});advance();return true;
 }
 async function patchRouter(response){
  const text=await new Response(response.body).text();
  // React Router initializes history with two arguments. Scramjet currently
  // rewrites its omitted URL to /undefined; supplying the current URL preserves it.
  const body=text.replace(/(\w+\.replaceState\(\{\.\.\.\w+\.state,idx:\w+\},"")\)/g,'$1,location.href)');
  return {...response,body,headers:[...response.headers].filter(([name])=>!['content-length','content-encoding'].includes(name.toLowerCase()))};
 }
 window.NovaAstraCloud={attach,patchRouter};
})();
