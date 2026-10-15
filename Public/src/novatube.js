(async() => {
 const {tubeURL}=await import('./novatube-url.mjs?v=20261015-tube62');const {tubeEmbedURL}=await import('./novatube-player.mjs?v=20261015-tube63');const patchedEmbeds=new WeakSet();
 const loading=document.getElementById('loading'),status=document.getElementById('status'),retry=document.getElementById('retry');
 let view,observer,timer,controller,navigation=0;const connectionOptions={videoBrand:'novatube',onRequestError:()=>{status.textContent='A video file could not connect. Retry the video.';retry.hidden=false}};let currentURL='https://voidgpt.xyz/~v/';const initialVideo=new URLSearchParams(location.search).get('v');if(/^[A-Za-z0-9_-]{11}$/.test(initialVideo||''))currentURL+='watch?v='+initialVideo;
 async function navigate(url){const generation=++navigation;currentURL=url;observer?.disconnect();clearTimeout(timer);loading.hidden=false;status.textContent=url.includes('/watch')?'Loading video…':'Loading NovaTube…';const old=view;if(old){try{const fresh=await NovaConnection.create(connectionOptions);if(generation!==navigation)return;controller=fresh}catch(error){if(generation!==navigation)return;status.textContent='Could not open the video. '+error.message;retry.hidden=false;return}}if(generation!==navigation)return;view=controller.createFrame();view.element.title='NovaTube videos';view.element.allow='autoplay; fullscreen; picture-in-picture';view.element.allowFullscreen=true;view.element.referrerPolicy='strict-origin-when-cross-origin';view.element.addEventListener('load',customize);document.body.append(view.element);view.go(url);old?.element.remove();timer=setTimeout(()=>{if(!loading.hidden){status.textContent='The video service is taking longer to respond. Try again.';retry.hidden=false}},45000)}
 function customize(){try{
  const doc=view.element.contentDocument;if(!doc?.body||doc.URL==='about:blank')return;
  const decoded=tubeURL(doc.URL,{prefix:view.prefix,origin:location.origin,base:currentURL});if(decoded)currentURL=decoded.href;const actual=new URL(doc.URL);if(actual.origin===location.origin&&actual.pathname.startsWith('/~v/')){navigate('https://voidgpt.xyz'+actual.pathname+actual.search+actual.hash);return;}
  if(!doc.getElementById('novatube-theme')){
   const style=doc.createElement('style');style.id='novatube-theme';style.textContent=`html,body,.shell,#app,#root,main,.main,.main-content,.content,.page,.watch,.feed{background:transparent!important;background-image:none!important;color-scheme:normal!important}.eaq,#vn-bg,#bg,#background,.page-background,.background,.backdrop,.wallpaper,body::before,body::after,.nav__out,.nav__acct,.nav__div{display:none!important}.nav__isl{background:rgba(15,19,17,.65)!important;backdrop-filter:none}.find,.desc{background:rgba(15,19,17,.5)!important}.vc__art{background:rgba(255,255,255,.06)!important}html{scrollbar-width:thin;scrollbar-color:#777 transparent}`;try{if(window.parent.NovaOS)style.textContent+='html,body,#app,#root,main,.shell,.page,.feed{background:transparent!important;background-image:none!important}.nav__isl,.find,.desc{background:#17223722!important;backdrop-filter:none!important}'}catch{}style.textContent+=' *,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';doc.head.append(style);
   doc.documentElement.style.setProperty('background','transparent','important');doc.documentElement.style.setProperty('color-scheme','normal','important');doc.body.style.setProperty('background','transparent','important');
   doc.addEventListener('submit',event=>{
    const form=event.target;if(!form.matches('#find,form[role=search]'))return;
    const input=form.querySelector('input[type=search],input');if(!input)return;
    event.preventDefault();event.stopImmediatePropagation();const target=new URL('https://voidgpt.xyz/~v/');if(input.value.trim())target.searchParams.set('q',input.value.trim());navigate(target.href);
   },true);
   doc.addEventListener('click',event=>{
    const a=event.target.closest?.('a[href]');if(!a||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const target=tubeURL(a.getAttribute('scramjet-attr-href')||a.getAttribute('href'),{base:currentURL,prefix:view.prefix,origin:location.origin});if(!target)return;
    event.preventDefault();event.stopImmediatePropagation();navigate(target.href);
   },true);
   observer?.disconnect();observer=new MutationObserver(customize);observer.observe(doc.body,{childList:true,subtree:true});
  }
  for(const embed of doc.querySelectorAll('iframe[src]')){if(patchedEmbeds.has(embed))continue;const raw=embed.getAttribute('scramjet-attr-src')||embed.getAttribute('src');const target=tubeEmbedURL(raw,location.origin);if(!target)continue;patchedEmbeds.add(embed);embed.referrerPolicy='strict-origin-when-cross-origin';embed.src=target.href}
  doc.title=doc.title.replace(/VoidTube/gi,'NovaTube');
  for(const heading of doc.querySelectorAll('#heading,.page-title'))if(/VoidTube/i.test(heading.textContent))heading.textContent=heading.textContent.replace(/VoidTube/gi,'NovaTube');
  loading.hidden=true;clearTimeout(timer);
 }catch{}}
 async function start(){retry.hidden=true;loading.hidden=false;status.textContent='Connecting through Nova…';try{
  controller=await NovaConnection.create(connectionOptions);await navigate(currentURL);
 }catch(e){status.textContent='Could not connect. '+e.message;retry.hidden=false}}
 retry.onclick=()=>{observer?.disconnect();clearTimeout(timer);navigation++;view?.element.remove();view=null;start()};setInterval(customize,1500);start();
})();
