// Bridge between Nova Flip and the Nova account: identity, cosmetics, friends, coins.
const FB='https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
export const nova={auth:null,db:null,fb:null,user:null,profile:{name:'Guest'},coins:null,stats:null,signedIn:false};

export async function connect(){
 loadCosmetics();
 try{
  const [{auth,db},fb]=await Promise.all([import('../account-firebase.js'),import(FB)]);
  Object.assign(nova,{auth,db,fb});
  await auth.authStateReady();
  const u=auth.currentUser;
  if(u&&!u.isAnonymous){nova.user=u;nova.signedIn=true;nova.profile=await profileOf(u.uid,true)}
 }catch(e){console.warn('Nova Flip: account unavailable',e)}
 return nova;
}

export async function profileOf(uid,self=false){
 const {ref,get}=nova.fb;
 const reads=[get(ref(nova.db,'novaChatV2/profiles/'+uid)).catch(()=>null)];
 if(self)reads.push(get(ref(nova.db,'novaAccounts/'+uid)).catch(()=>null));
 const [chat,account]=await Promise.all(reads);
 const p={...(account?.val()||{}),...(chat?.val()||{})};
 if(account?.val()?.name)p.name=p.name||account.val().name;
 return {uid,name:String(p.displayName||p.name||'Nova player').slice(0,32),...p,name:String(p.displayName||p.name||'Nova player').slice(0,32)};
}

// Compact public identity sent into rooms so other players can render cosmetics without extra reads.
export function publicIdentity(p=nova.profile){
 const pick={};for(const k of ['name','photo','effect','decoration','nameGradient','nameRole','usernameFont','nitroBooster','nitroAnimation','profileTheme','banner','chatBanner'])if(p[k]!==undefined&&p[k]!==null)pick[k]=p[k];
 if(typeof pick.photo==='string'&&pick.photo.length>2000)delete pick.photo; // keep room payloads small
 if(typeof pick.banner==='string'&&pick.banner.length>2000)delete pick.banner;
 return pick;
}

let cosmeticsReady;
export function loadCosmetics(){
 if(cosmeticsReady)return cosmeticsReady;
 const css=document.createElement('link');css.rel='stylesheet';css.href='/src/home-cosmetics.css?v=20261027-profile329';document.head.append(css);
 cosmeticsReady=new Promise(resolve=>{if(window.NovaHomeCosmetics)return resolve();const s=document.createElement('script');s.src='/src/home-cosmetics.js?v=20261027-profile329';s.onload=()=>resolve();s.onerror=()=>resolve();document.head.append(s)});
 return cosmeticsReady;
}

// Avatar (photo, decoration, avatar effect) + name (font/gradient) using Nova's own renderer.
export function identity(p={},{size='md',effect=true,status}={}){
 const wrap=document.createElement('div');wrap.className='nf-id nf-id-'+size;
 const av=document.createElement('span');av.className='nf-avatar';
 const nm=document.createElement('b');nm.className='nf-name';
 wrap.append(av,nm);
 const paint=()=>{const C=window.NovaHomeCosmetics;const person={...p,status:status||p.status||'online'};
  if(C){C.avatar(av,person,effect);C.name(nm,person)}else{av.textContent=(p.name||'?')[0].toUpperCase();nm.textContent=p.name||'Player'}};
 paint();loadCosmetics().then(paint);addEventListener('nova-profile-changed',paint);
 return wrap;
}
// Profile card background: banner + animated profile effect.
export function surface(host,p={}){const go=()=>window.NovaHomeCosmetics?.surface(host,p,true);go();loadCosmetics().then(()=>setTimeout(go,50));addEventListener('nova-profile-changed',go,{once:true})}

export async function control(action,data){const {control}=await import('../control-client.js');return control(action,data)}

export async function refreshCoins(){
 if(!nova.signedIn)return null;
 try{const r=await control('novaFlip',{op:'stats'});nova.coins=r.coins??nova.coins;nova.stats=r.stats||nova.stats}catch{
  try{const s=await control('status');nova.coins=s.progress?.coins??null}catch{}
 }
 dispatchEvent(new Event('nf-wallet'));return nova.coins;
}

export function watchFriends(cb){
 if(!nova.signedIn)return ()=>{};
 const {ref,onValue}=nova.fb,uid=nova.user.uid;const subs=new Map(),people=new Map();
 const emit=()=>cb([...people.values()].sort((a,b)=>Number(b.online)-Number(a.online)||a.name.localeCompare(b.name)));
 const stop=onValue(ref(nova.db,'novaChatV2/friends/'+uid),snap=>{
  const ids=new Set(Object.keys(snap.val()||{}));
  for(const [id,off]of subs)if(!ids.has(id)){off();subs.delete(id);people.delete(id)}
  for(const id of ids){if(subs.has(id))continue;people.set(id,{uid:id,name:'Loading…',online:false});
   profileOf(id).then(p=>{if(!subs.has(id))return;people.set(id,{...people.get(id),...p,uid:id});emit()});
   subs.set(id,onValue(ref(nova.db,'novaChatV2/presence/'+id),s=>{const v=s.val();const cur=people.get(id);if(!cur)return;people.set(id,{...cur,online:!!v?.online,activity:v?.activity||''});emit()},()=>{}));
  }
  emit();
 },()=>cb([]));
 return ()=>{stop();for(const off of subs.values())off()};
}
