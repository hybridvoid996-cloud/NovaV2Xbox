import {hackProducts} from './hack-products.mjs?v=20261112-hackfix1';
import {control} from './control-client.js';
const product=hackProducts.find(p=>p.id===new URLSearchParams(location.search).get('product')&&p.client),status=document.getElementById('status'),retry=document.getElementById('retry');
let view,loading=false,watch=0;
const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n};

// Opens the provider client as its own top-level tab (no proxy). Blooket's browser security
// check only passes there, not through Nova's proxy or inside an embedded frame.
function openDirect(){const tab=window.open(product.client,'_blank','noopener');if(!tab)say('Your browser blocked the new tab. Allow pop-ups for Nova, then try again.',true)}
function say(message,withDirect=false,withProxy=false){
 status.hidden=false;status.replaceChildren(el('span',message));
 const row=el('div');row.className='hc-actions';
 if(withDirect){const b=el('button','Open '+product.name+' in a new tab');b.className='hc-primary';b.onclick=openDirect;row.append(b)}
 if(withProxy){const b=el('button','Try through Nova’s proxy');b.onclick=()=>{loading=false;void proxy()};row.append(b)}
 if(row.children.length)status.append(row);
}
// A proxied page that is still on a "Just a moment…" security check after 20 seconds will not finish.
function watchChallenge(frame){
 clearInterval(watch);let seconds=0;
 watch=setInterval(()=>{seconds++;let doc=null;try{doc=frame.contentDocument}catch{}
  const stuck=!!doc&&/just a moment|security verification/i.test((doc.title||'')+' '+(doc.body?.innerText||'').slice(0,400));
  if(!stuck&&seconds>3){clearInterval(watch);return}
  if(stuck&&seconds>=20){clearInterval(watch);say(product.name+' is showing a security check that blocks Nova’s proxy. Open it in its own tab instead — it works there.',true)}
 },1000);
}
async function proxy(){
 if(loading)return;loading=true;retry.hidden=true;
 try{
  view?.element.remove();say('Connecting to '+product.name+'…');
  const connection=await NovaConnection.create({onProgress:message=>say(message)});
  view=connection.createFrame();view.element.title=product.name;view.element.allow='autoplay; fullscreen; clipboard-write';
  view.element.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-downloads allow-pointer-lock allow-popups allow-modals');
  view.element.addEventListener('load',()=>{status.hidden=true;retry.hidden=false;try{NovaSessionRuntime.attachChild?.(view.element.contentWindow)}catch{}watchChallenge(view.element)},{once:true});
  document.getElementById('stage').append(view.element);view.go(product.client);
 }catch(e){say(e.message||'The client could not connect. Try again.',!!product?.client);retry.hidden=false}
 finally{loading=false}
}
async function launch(){
 if(!product){say('Choose a client from the Nova Hacks shop.');return}
 document.getElementById('title').textContent=product.name;document.title='Nova · '+product.name;document.getElementById('art').src=product.art;
 const direct=document.getElementById('direct');if(direct){direct.hidden=false;direct.onclick=openDirect}
 say('Checking your Nova unlock…');
 try{const {owned}=await control('hackAccess');if(!owned?.[product.id])throw Error('This pack is locked. Unlock it in the Nova Hacks shop for '+product.price.toLocaleString()+' coins.')}
 catch(e){say(e.message);retry.hidden=false;return}
 if(product.openInTab){say(product.name+' opens in its own tab: Blooket’s security check blocks proxies. Join with your game PIN there, then use the X-GUI menu for cheats.',true,true);return}
 void proxy();
}
retry.onclick=launch;
launch();
