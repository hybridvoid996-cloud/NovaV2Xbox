/* Presentation only. Capture, approval, input and session ownership stay in renderer/main. */
(()=>{
 const $=id=>document.getElementById(id),api=window.novaRemote;
 const views={connections:['Your desktop, anywhere.','A familiar space. A seamless connection.'],stream:['A smoother connection.','Fine-tune your stream, without leaving your space.'],appearance:['Make yourself at home.','The same Nova, with your own atmosphere.'],activity:['Every connection, at a glance.','A local history of your access and sessions.']};
 let profile=null,enabled=false,current='connections',sharing=false,backgroundKey='',ready=false;
 const read=(key,fallback)=>{try{return localStorage.getItem('nova-remote-'+key)??fallback}catch{return fallback}};
 const preferences={background:read('background','true')!=='false',motion:read('motion','true')!=='false',light:read('light','false')==='true'};
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 function text(id,value){const e=$(id);if(e&&e.textContent!==value)e.textContent=value}
 function select(view){if(!views[view])return;current=view;for(const name of Object.keys(views))$('view-'+name).hidden=name!==view;for(const button of document.querySelectorAll('[data-view]')){if(button.dataset.view===view)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')}text('view-title',views[view][0]);text('view-description',views[view][1]);text('view-breadcrumb',view==='stream'?'STREAM SETTINGS':view.toUpperCase());$('workspace-scroll').scrollTop=0}
 document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.view)));
 document.querySelector('.side-brand').addEventListener('click',event=>{event.preventDefault();select('connections')});
 document.querySelectorAll('[data-window]').forEach(button=>button.addEventListener('click',()=>api.windowControl?.(button.dataset.window)));
 function safeBackground(value){
  if(value?.type==='gradient'&&Array.isArray(value.colors)&&value.colors.length===3&&value.colors.every(c=>/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(c)))return {type:'gradient',colors:value.colors,direction:/^(?:to (?:left|right|top|bottom)(?: (?:left|right|top|bottom))?|[0-9.-]+deg)$/.test(value.direction)?value.direction:'135deg'};
  if(['image','video'].includes(value?.type)&&typeof value.url==='string'&&value.url.length<=4000){try{const url=new URL(value.url);if(url.protocol==='https:'&&!url.username&&!url.password)return {type:value.type,url:url.href}}catch{}}
  return null;
 }
 function background(){
  const value=preferences.background?safeBackground(profile?.background):null,key=JSON.stringify(value),video=$('wallpaper-video'),image=$('wallpaper-image'),gradient=$('account-background'),preview=$('background-preview');
  document.body.classList.toggle('has-wallpaper',!!value);document.body.classList.toggle('low-effects',preferences.light);document.body.classList.toggle('motion-paused',!preferences.motion||preferences.light||reduced.matches||sharing);
  if(backgroundKey!==key){backgroundKey=key;video.pause();video.removeAttribute('src');video.load();image.hidden=true;image.removeAttribute('src');video.hidden=true;gradient.style.background='';preview.style.backgroundImage='';
   if(value?.type==='gradient'){const css=`linear-gradient(${value.direction},${value.colors.join(',')})`;gradient.style.background=css;preview.style.backgroundImage=css}
   if(value?.type==='image'){image.src=value.url;image.hidden=false;preview.style.backgroundImage=`url("${value.url.replace(/["\\\n\r]/g,c=>encodeURIComponent(c))}")`}
   if(value?.type==='video'){video.src=value.url;video.hidden=false}
   text('background-description',value?'Your Nova '+(value.type==='gradient'?'colors':value.type==='video'?'video background':'background'):'Nova glass · default background');
  }
  const play=value?.type==='video'&&preferences.motion&&!preferences.light&&!reduced.matches&&!document.hidden&&!sharing;
  if(play)video.play().catch(()=>{});else video.pause();
 }
 $('wallpaper-image').addEventListener('error',()=>{$('wallpaper-image').hidden=true;text('background-description','Your background is unavailable · showing Nova glass')});
 $('wallpaper-video').addEventListener('error',()=>{$('wallpaper-video').hidden=true;text('background-description','Your background is unavailable · showing Nova glass')});
 for(const [id,key]of [['sync-background','background'],['background-motion','motion'],['lighter-effects','light']]){$(id).checked=preferences[key];$(id).addEventListener('change',()=>{preferences[key]=$(id).checked;try{localStorage.setItem('nova-remote-'+key,String(preferences[key]))}catch{}background()})}
 document.addEventListener('visibilitychange',background);reduced.addEventListener?.('change',background);
 function access(){document.body.classList.toggle('is-enabled',enabled);$('nav-status').classList.toggle('online',enabled);$('footer-dot').classList.toggle('online',enabled);$('access-badge').querySelector('i').classList.toggle('online',enabled);$('access-badge').querySelector('span').textContent=enabled?'Access enabled':'Access disabled';text('footer-state',sharing?'Your screen is being shared':enabled?'Online · waiting for your connection':'Ready when you are')}
 window.NovaRemoteUI={
  update(state={}){if(state.device!==undefined){profile=state.device?.profile||null;$('signed-out-account').hidden=!!profile;enabled=state.enabled===true}if(state.profile!==undefined)profile=state.profile;if(state.enabled!==undefined)enabled=state.enabled===true;if(state.version)text('app-version','v'+state.version);if(state.relay)text('relay-summary',state.relay.tls?'TLS relay configured':state.relay.configured?'TURN relay configured':'No server relay · set one in Nova Computer');access();background()},
  session(state,capture){sharing=state==='connected'||state==='connecting';text('connection-metric',state==='connected'?'Connected':state==='connecting'?'Connecting…':state==='reconnecting'?'Reconnecting…':'Waiting');if(state==='reconnecting')sharing=true;if(capture)text('capture-metric',capture);if(state==='idle')text('capture-metric','Not sharing');access();background();if(state!=='idle'&&current!=='connections')select('connections')},
  ready(){if(ready)return;ready=true;requestAnimationFrame(()=>$('boot').classList.add('is-ready'))},
  activity(count){$('activity-empty').hidden=count>0}
 };
 background();
 // A rendering or account-service error must never leave a permanent loading cover.
 setTimeout(()=>window.NovaRemoteUI.ready(),5000);
})();
