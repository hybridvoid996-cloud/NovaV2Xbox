// Open the selected game and start its normal provider session once ready.
(()=>{
 const attached=new WeakSet();
 function attach(doc,item,{onExit,onReady=()=>{},onStatus=()=>{},onError=()=>{},onRecover=()=>{},signal}={}){
  if(signal?.aborted||!item?.name)return false;
  if(attached.has(doc))return true;
  if(!doc.querySelectorAll('button.mp-row[aria-label]').length)return false;
  const win=doc.defaultView;if(!win)return;attached.add(doc);
  let observer,timer,chosen=false,launched=false,stopped=false,exitRequested=false,seenStream=false,recoveryTimer;
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
   if(stopped)return;stopped=true;observer?.disconnect();win.clearTimeout(timer);win.clearTimeout(recoveryTimer);
   doc.removeEventListener('click',preventDismiss,true);doc.removeEventListener('keydown',preventDismiss,true);doc.removeEventListener('click',streamExit,true);
   win.removeEventListener('pagehide',pageHidden);
  }
  const style=doc.createElement('style');style.id='nova-astra-glass';style.textContent=`
.nova-astra-launch{background:linear-gradient(140deg,#ffffff24,#141a25ed 60%,#ffffff13)!important;border:1px solid #ffffff40!important;border-radius:28px!important;box-shadow:inset 0 1px 0 #ffffff65,0 24px 80px #0005!important;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);color:#fff!important;font-family:system-ui!important}
.nova-astra-launch:before{content:'NOVA CLOUD';display:block;padding:20px 24px 0;color:#cbd8ed;font:650 10px system-ui;letter-spacing:.22em}
.nova-astra-launch button:not([hidden]){border:1px solid #ffffff38!important;border-radius:15px!important;background:linear-gradient(140deg,#ffffff2c,#ffffff0d)!important;color:white!important;box-shadow:inset 0 1px 0 #ffffff45!important}
.nova-astra-launch input{background:#ffffff0c!important;border:1px solid #ffffff30!important;border-radius:12px!important;color:white!important}
.nova-astra-launch h1,.nova-astra-launch h2,.nova-astra-launch h3{color:#fff!important;letter-spacing:-.035em!important}.nova-astra-launch p{color:#cbd3e0!important}
.astra-hud-bar{background:linear-gradient(140deg,#ffffff24,#161d2bd9)!important;border:1px solid #ffffff35!important;box-shadow:inset 0 1px 0 #ffffff40,0 8px 30px #0003!important;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:18px!important}.astra-hud-bar button{background:#ffffff14!important;border:1px solid #ffffff25!important;border-radius:12px!important;color:white!important}
`;doc.head.append(style);
  function advance(){
   if(stopped)return;
   if(exitRequested){if(!doc.querySelector('[aria-label="Game stream"]')){stop();onExit?.()}return;}
   if(!chosen){
    const matches=[...doc.querySelectorAll('button.mp-row[aria-label]')].filter(b=>b.getAttribute('aria-label')===item.name);
    const button=matches[item.sourceOccurrence||0];if(!button)return;
    chosen=true;button.click();
   }
   const stream=doc.querySelector('[aria-label="Game stream"]');if(stream){seenStream=true;win.clearTimeout(recoveryTimer);recoveryTimer=null}
   const panel=dialog();if(!panel){if(seenStream&&!stream&&!recoveryTimer){recoveryTimer=win.setTimeout(()=>{recoveryTimer=null;if(stopped||exitRequested||doc.querySelector('[aria-label="Game stream"]')||dialog())return;stop();onRecover()},1500)}return}
   if(!panel.classList.contains('nova-astra-launch'))panel.classList.add('nova-astra-launch');

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
  observer.observe(doc.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','aria-disabled','class']});
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
