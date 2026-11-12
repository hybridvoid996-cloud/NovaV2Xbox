// Nova Weed UI panels. Everything talks to the game through the context object G.
import * as THREE from '/vendor/three/three.module.min.js';
import {ITEMS,MIXERS,EFFECTS,STRAINS,SHIRTS,HATS,RANKS,rankOf,productName,productValue,parseKey,mix,offerChance,clockText,POT_STAGES} from './economy.mjs';
import {makePerson} from './people.mjs';
import {PLACES,ROADS} from './world.mjs';
import {sfx} from './audio.mjs';

export function h(tag,props={},...kids){
 const el=document.createElement(tag);
 for(const [k,v]of Object.entries(props||{})){if(v==null||v===false)continue;if(k==='class')el.className=v;else if(k==='style'&&typeof v==='object'){for(const [p,val]of Object.entries(v))p.startsWith('--')?el.style.setProperty(p,val):el.style[p]=val}else if(k.startsWith('on'))el.addEventListener(k.slice(2),v);else if(k==='html')el.innerHTML=v;else el.setAttribute(k,v===true?'':v)}
 for(const kid of kids.flat())if(kid!=null&&kid!==false)el.append(kid.nodeType?kid:document.createTextNode(String(kid)));
 return el;
}
export const money=n=>'$'+Math.round(n).toLocaleString();
export const effectTags=effects=>h('span',{class:'nw-tags'},...effects.map(e=>h('span',{style:{'--c':EFFECTS[e]?.color||'#fff'}},EFFECTS[e]?.name||e)));

let modal=null;
export function openModal(G,content,{onClose}={}){closeModal(G);G.releaseLock();modal=h('div',{class:'nw-modal',onclick:e=>{if(e.target===modal)closeModal(G)}},content);modal._onClose=onClose;document.body.append(modal);G.paused=true;return modal}
export function closeModal(G,{resume=true}={}){if(!modal)return;const m=modal;modal=null;m.remove();m._onClose?.();G.paused=false;if(resume)G.askLock()}
export const modalOpen=()=>!!modal;
addEventListener('keydown',e=>{if(modal&&(e.key==='Escape'||e.key==='Tab'))e.preventDefault()});

function panel(title,sub,...kids){return h('div',{class:'nw-panel'},h('h2',{},title),sub?h('p',{class:'sub'},sub):null,...kids)}
function closeRow(G,extra=[]){return h('div',{class:'nw-actions'},...extra,h('button',{class:'nw-b',onclick:()=>closeModal(G)},'Close'))}

// ---------- shops ----------
export function openShop(G,kind){
 const S=G.S,rank=rankOf(S.xp);
 const titles={garden:['Green Thumb','Seeds, soil, pots and supplies. — Mira'],quick:['Quick Stop','Drinks and mixers. Open 24/7.'],thread:['Thread Co.','Look good, sell better.']};
 const list=h('div',{class:'nw-list'}),cash=h('b',{},money(S.money));
 const paint=()=>{cash.textContent=money(S.money);list.replaceChildren();
  if(kind==='thread'){
   for(const item of [...SHIRTS.map(s=>({...s,type:'shirt'})),...HATS.filter(x=>x.id!=='none').map(s=>({...s,type:'hat'}))]){
    const owned=S.owned[item.id],worn=S.shirt===item.id||S.hat===item.id;
    const btn=owned?h('button',{class:'nw-b'+(worn?'':' go'),disabled:worn||undefined,onclick:()=>{if(item.type==='shirt')S.shirt=item.id;else S.hat=item.id;G.applyOutfit();sfx.click();paint()}},worn?'Wearing':'Wear')
     :h('button',{class:'nw-b go',disabled:S.money<item.price||undefined,onclick:()=>{S.money-=item.price;S.owned[item.id]=true;if(item.type==='shirt')S.shirt=item.id;else S.hat=item.id;G.applyOutfit();sfx.cash();G.save();paint()}},money(item.price));
    list.append(h('div',{class:'nw-row'},h('span',{class:'nw-swatch',style:{background:item.stripe?`linear-gradient(${item.color} 60%,${item.stripe} 60%)`:item.color||'#444'}}),h('div',{class:'grow'},h('b',{},item.name),h('small',{},item.type==='hat'?'Hat':'Shirt')),btn));
   }
   return;
  }
  for(const [id,item]of Object.entries(ITEMS)){
   if(item.shop!==kind)continue;
   const locked=(item.rank||0)>rank;
   const have=id==='pot'?G.potList().length+' / 8':(S.inv[id]||0);
   const buy=n=>{const cost=item.price*n;if(S.money<cost){sfx.deny();G.toast('Not enough cash.','bad');return}
    if(id==='pot'){if(G.potList().length>=8){G.toast('The room is full: 8 pots max.','bad');return}if(G.coop){G.coop.addPot();G.toast('Added a pot to the shared grow room.','good')}else{S.pots.push({});G.refreshPots()}}
    else if(item.gives)for(const [k,q]of Object.entries(item.gives))S.inv[k]=(S.inv[k]||0)+q*n;else S.inv[id]=(S.inv[id]||0)+n;
    S.money-=cost;sfx.cash();G.save();G.onInventory();paint()};
   const desc=item.mixer?(()=>{const m=MIXERS[id];return h('span',{},'Adds ',effectTags([m.effect]))})():locked?'Unlocks at '+RANKS[item.rank].name:'Owned: '+have;
   list.append(h('div',{class:'nw-row'},h('span',{class:'ic'},item.icon),h('div',{class:'grow'},h('b',{},item.name),h('small',{},desc)),
    h('button',{class:'nw-b go',disabled:locked||S.money<item.price||undefined,onclick:()=>buy(1)},money(item.price)),
    id!=='pot'?h('button',{class:'nw-b',disabled:locked||S.money<item.price*5||undefined,onclick:()=>buy(5)},'×5'):null));
  }
 };
 paint();
 openModal(G,panel(titles[kind][0],titles[kind][1],h('p',{class:'sub'},'Cash: ',cash),list,closeRow(G)));
}

// ---------- packing ----------
export function openPacking(G){
 const S=G.S;const list=h('div',{class:'nw-list'});
 const paint=()=>{list.replaceChildren();const keys=Object.keys(S.products).filter(k=>S.products[k].buds>0);
  if(!keys.length){list.append(h('p',{class:'sub'},'No buds to pack. Harvest a plant first.'));return}
  for(const k of keys){const p=S.products[k];const n=Math.min(p.buds,S.inv.baggie||0);
   list.append(h('div',{class:'nw-row'},h('span',{class:'ic'},'🌿'),h('div',{class:'grow'},h('b',{},productName(k)),h('small',{},p.buds+' buds · '+(S.inv.baggie||0)+' baggies'),effectTags(parseKey(k).effects)),
    h('button',{class:'nw-b go',disabled:!n||undefined,onclick:()=>{p.buds-=n;p.bags+=n;S.inv.baggie-=n;sfx.bag();G.toast('Packed '+n+' bag'+(n>1?'s':'')+' of '+productName(k),'good');G.save();G.onInventory();paint()}},'Pack '+n)));
  }
  if(!(S.inv.baggie>0))list.append(h('p',{class:'sub'},'Out of baggies: buy more at Green Thumb.'));
 };
 paint();openModal(G,panel('Packing Table','One bud + one baggie = one bag ready to sell.',list,closeRow(G)));
}

// ---------- mixing ----------
export function openMixing(G){
 const S=G.S;let pick=null,mixer=null;const body=h('div');
 const paint=()=>{body.replaceChildren();
  const products=Object.keys(S.products).filter(k=>S.products[k].bags>0);
  const mixers=Object.keys(MIXERS).filter(id=>S.inv[id]>0);
  if(!products.length){body.append(h('p',{class:'sub'},'You need bagged product to mix. Pack some at the packing table.'));return}
  if(!pick||!products.includes(pick))pick=products[0];
  body.append(h('b',{},'1. Product'),h('div',{class:'nw-list',style:{margin:'8px 0 14px'}},...products.map(k=>h('button',{class:'nw-row'+(k===pick?' sel':''),onclick:()=>{pick=k;paint()}},h('span',{class:'ic'},'👜'),h('div',{class:'grow'},h('b',{},productName(k)+' ×'+S.products[k].bags),effectTags(parseKey(k).effects)),h('span',{},money(productValue(k,S.products[k].quality))))) ));
  body.append(h('b',{},'2. Mixer'));
  if(!mixers.length){body.append(h('p',{class:'sub'},'No mixers. Buy some at Quick Stop.'));return}
  if(!mixer||!mixers.includes(mixer))mixer=mixers[0];
  body.append(h('div',{class:'nw-list',style:{margin:'8px 0 14px'}},...mixers.map(id=>h('button',{class:'nw-row'+(id===mixer?' sel':''),onclick:()=>{mixer=id;paint()}},h('span',{class:'ic'},'🧂'),h('div',{class:'grow'},h('b',{},MIXERS[id].name+' ×'+S.inv[id]),effectTags([MIXERS[id].effect]))))));
  const result=mix(pick,mixer),q=S.products[pick].quality,n=Math.min(S.products[pick].bags,S.inv[mixer]);
  body.append(h('div',{class:'nw-row sel'},h('span',{class:'ic'},'✨'),h('div',{class:'grow'},h('b',{},'→ '+productName(result)),effectTags(parseKey(result).effects)),h('b',{},money(productValue(result,q))+' /bag')),
   h('div',{class:'nw-actions'},h('button',{class:'nw-b go',onclick:()=>{const src=S.products[pick];src.bags-=n;S.inv[mixer]-=n;const dst=S.products[result]||(S.products[result]={bags:0,buds:0,quality:q});dst.quality=(dst.quality*dst.bags+q*n)/Math.max(1,dst.bags+n);dst.bags+=n;S.stats.mixed+=n;G.addXP(6*n);sfx.harvest();G.toast('Mixed '+n+'× '+productName(result),'good');G.save();G.onInventory();pick=result;paint()}},'Mix '+n+' bag'+(n>1?'s':''))));
 };
 paint();openModal(G,panel('Mixing Station','Mixers add effects and can transform existing ones. More effects = higher price.',body,closeRow(G)));
}

// ---------- selling ----------
export function openOffer(G,npc){
 const S=G.S,c=npc.c,memo=S.customers[c.id]||(S.customers[c.id]={met:false,loyalty:0});
 const products=Object.keys(S.products).filter(k=>S.products[k].bags>0);
 const body=h('div');let pick=products[0],qty=1,mult=1;
 const head=h('div',{class:'nw-row'},h('span',{class:'ic'},'🧍'),h('div',{class:'grow'},h('b',{},c.name),h('small',{},memo.met?'Likes: ':'New face. Make a good first impression.'),memo.met?effectTags(c.likes):null),h('small',{},'Loyalty '+'★'.repeat(Math.min(5,memo.loyalty))+'☆'.repeat(Math.max(0,5-memo.loyalty))));
 const paint=()=>{body.replaceChildren();
  if(!products.length){body.append(h('p',{class:'sub'},'You have nothing bagged to sell.'));return}
  const p=S.products[pick];const value=productValue(pick,p.quality);const price=Math.max(1,Math.round(value*mult));const chance=offerChance({...c,loyalty:memo.loyalty},pick,price,p.quality);
  body.append(h('div',{class:'nw-list'},...products.map(k=>h('button',{class:'nw-row'+(k===pick?' sel':''),onclick:()=>{pick=k;qty=1;paint()}},h('span',{class:'ic'},'👜'),h('div',{class:'grow'},h('b',{},productName(k)+' ×'+S.products[k].bags),effectTags(parseKey(k).effects)),h('span',{},money(productValue(k,S.products[k].quality)))))));
  const qtyRow=h('div',{class:'nw-setting'},h('span',{},'Bags'),...[1,2,3,4,5].filter(n=>n<=p.bags).map(n=>h('button',{class:'nw-b'+(n===qty?' go':''),onclick:()=>{qty=n;paint()}},n)));
  const slider=h('input',{type:'range',class:'nw-range',min:'50',max:'200',value:String(Math.round(mult*100)),oninput:e=>{mult=e.target.value/100;paint()}});
  body.append(qtyRow,h('div',{class:'nw-setting'},h('span',{},'Price per bag ',h('small',{},'Market value '+money(value))),h('b',{},money(price))),slider,
   h('p',{class:'sub',style:{margin:'12px 0 6px'}},'Chance they say yes: '+Math.round(chance*100)+'%'),h('div',{class:'nw-meter'},h('i',{style:{width:chance*100+'%',background:chance>.6?'#5dff8a':chance>.3?'#ffd166':'#ff5a6e'}})),
   h('div',{class:'nw-actions'},h('button',{class:'nw-b go',onclick:()=>{closeModal(G);G.trySale(npc,pick,qty,price,chance)}},'Offer '+qty+' for '+money(price*qty))));
 };
 paint();
 openModal(G,panel('Make an offer',null,head,h('div',{style:{height:'10px'}}),body,closeRow(G)),{onClose:()=>npc.w.release()});
}

// ---------- phone ----------
export function openPhone(G,app='home'){
 const S=G.S;const body=h('div',{class:'nw-phone-body'});const unread=S.messages.filter(m=>!m.read).length;
 const go=a=>{app=a;paint()};
 const head=(title)=>h('div',{class:'nw-phone-head'},h('button',{class:'nw-b',onclick:()=>go('home')},'‹'),h('h3',{},title));
 const paint=()=>{body.replaceChildren();
  if(app==='home'){const apps=[['messages','💬','Messages','#2fbf71',S.messages.filter(m=>!m.read).length],['products','🌿','Products','#5dff8a'],['map','🗺️','Map','#3f8cff'],['profile','🧢','Profile','#ff7ad9'],['rent','🏠','Rent','#ffd166'],['settings','⚙️','Settings','#9aa3ad']];
   body.append(h('div',{class:'nw-apps'},...apps.map(([id,ic,name,col,badge])=>h('button',{class:'nw-app',onclick:()=>{sfx.click();go(id)}},h('i',{style:{'--a':col}},ic),badge?h('span',{class:'badge'},badge):null,name))),
    h('div',{class:'nw-row'},h('div',{class:'grow'},h('b',{},RANKS[rankOf(S.xp)].name),h('small',{},S.xp+' XP · Day '+S.day+' · '+clockText(S.minute))),h('b',{},money(S.money))));}
  if(app==='messages'){body.append(head('Messages'));const list=[...S.messages].reverse();if(!list.length)body.append(h('p',{class:'sub'},'No messages yet.'));for(const m of list){m.read=true;body.append(h('div',{class:'nw-msg'},h('b',{},m.from+' · Day '+m.day),m.text))}}
  if(app==='products'){body.append(head('Products'));const keys=Object.keys(S.products).filter(k=>S.products[k].bags||S.products[k].buds);if(!keys.length)body.append(h('p',{class:'sub'},'Nothing yet. Grow something!'));for(const k of keys){const p=S.products[k];body.append(h('div',{class:'nw-row'},h('div',{class:'grow'},h('b',{},productName(k)),h('small',{},p.bags+' bags · '+p.buds+' buds · quality '+Math.round(p.quality*100)+'%'),effectTags(parseKey(k).effects)),h('b',{},money(productValue(k,p.quality)))))}
   body.append(h('p',{class:'sub',style:{marginTop:'12px'}},'Inventory'),h('div',{class:'nw-list'},...Object.entries(S.inv).filter(([,n])=>n>0).map(([id,n])=>h('div',{class:'nw-row'},h('span',{class:'ic'},ITEMS[id]?.icon||'•'),h('div',{class:'grow'},ITEMS[id]?.name||id),h('b',{},'×'+n)))))}
  if(app==='map'){body.append(head('Map'));const cv=h('canvas',{class:'nw-map',width:'600',height:'600'});body.append(cv,h('p',{class:'sub'},'🟢 You  🟡 Shops  🔵 Police  🟣 Orders'));drawMap(G,cv)}
  if(app==='profile'){body.append(head('Profile'));const pv=h('canvas',{class:'nw-preview'});body.append(pv,
   h('div',{class:'nw-row'},h('div',{class:'grow'},h('b',{},RANKS[rankOf(S.xp)].name),h('small',{},S.xp+' XP'),h('div',{class:'nw-meter',style:{marginTop:'6px'}},h('i',{style:{width:Math.min(100,progressPct(S.xp))+'%',background:'#5dff8a'}})))),
   h('div',{class:'nw-list',style:{marginTop:'8px'}},...[['Bags sold',S.stats.sold],['Money earned',money(S.stats.earned)],['Plants harvested',S.stats.grown],['Bags mixed',S.stats.mixed],['Times busted',S.stats.busted]].map(([a,b])=>h('div',{class:'nw-row'},h('div',{class:'grow'},a),h('b',{},b)))));setTimeout(()=>outfitPreview(G,pv),0)}
  if(app==='rent'){body.append(head('Rent'));const late=S.day>S.rentDue;body.append(h('div',{class:'nw-row'},h('div',{class:'grow'},h('b',{},'Apartment 4B'),h('small',{},late?'LATE: was due day '+S.rentDue:'Due on day '+S.rentDue+' (today is day '+S.day+')')),h('b',{},money(S.rent))),h('div',{class:'nw-actions'},h('button',{class:'nw-b go',disabled:S.money<S.rent||undefined,onclick:()=>{G.payRent();paint()}},'Pay '+money(S.rent))))}
  if(app==='settings'){body.append(head('Settings'),settingsList(G))}
 };
 paint();
 const screen=h('div',{class:'nw-phone-screen'},h('div',{class:'nw-phone-bar'},h('span',{},clockText(S.minute)),h('span',{},'NovaCell ▮▮▮')),body);
 openModal(G,h('div',{class:'nw-phone'},screen),{onClose:()=>G.onInventory()});sfx.click();
}
function progressPct(xp){const r=rankOf(xp);const cur=RANKS[r].xp,next=RANKS[r+1]?.xp;return next?(xp-cur)/(next-cur)*100:100}
function drawMap(G,cv){
 const x=cv.getContext('2d'),W=cv.width,s=W/240,P=v=>(v+120)*s;
 x.fillStyle='#1d2b20';x.fillRect(0,0,W,W);x.fillStyle='#2f3a33';
 for(const r of ROADS){x.fillRect(P(r-5),0,10*s,W);x.fillRect(0,P(r-5),W,10*s)}
 x.fillStyle='#2f5e33';x.fillRect(P(-51),P(69),42*s,42*s);
 const dot=(px,pz,c,label,r=7)=>{x.fillStyle=c;x.beginPath();x.arc(P(px),P(pz),r,0,7);x.fill();if(label){x.fillStyle='#fff';x.font='bold 18px Segoe UI';x.fillText(label,P(px)+10,P(pz)+6)}};
 dot(PLACES.home.x,PLACES.home.z,'#fff','Home');dot(PLACES.garden.x,PLACES.garden.z,'#ffd166','Green Thumb');dot(PLACES.quick.x,PLACES.quick.z,'#ffd166','Quick Stop');dot(PLACES.thread.x,PLACES.thread.z,'#ffd166','Thread Co.');dot(PLACES.police.x,PLACES.police.z,'#5aa0ff','Police');dot(PLACES.park.x,PLACES.park.z,'#7dffa3','Park');
 for(const n of G.npcs)if(n.order)dot(n.g.position.x,n.g.position.z,'#c77dff',n.c.name.split(' ')[0]);
 for(const o of G.police)dot(o.g.position.x,o.g.position.z,'#5aa0ff',null,5);
 const p=G.player.pos;x.save();x.translate(P(p.x),P(p.z));x.rotate(-G.player.yaw);x.fillStyle='#5dff8a';x.beginPath();x.moveTo(0,-12);x.lineTo(8,9);x.lineTo(-8,9);x.closePath();x.fill();x.restore();
}
function outfitPreview(G,cv){
 const w=cv.clientWidth||320,hh=cv.clientHeight||240;const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});r.setPixelRatio(Math.min(2,devicePixelRatio));r.setSize(w,hh,false);
 const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight('#fff','#335533',1.6));const d=new THREE.DirectionalLight('#fff',2);d.position.set(2,3,4);sc.add(d);
 const cam=new THREE.PerspectiveCamera(35,w/hh,.1,50);cam.position.set(0,1.4,4.6);cam.lookAt(0,1.1,0);
 const person=makePerson(G.outfitLook());sc.add(person);
 let alive=true;const loop=t=>{if(!alive||!cv.isConnected){alive=false;r.dispose();return}person.rotation.y=t/1600;r.render(sc,cam);requestAnimationFrame(loop)};requestAnimationFrame(loop);
}

// ---------- settings ----------
export function settingsList(G){
 const s=G.settings;const wrap=h('div');
 const toggle=(label,sub,key)=>{const b=h('button',{class:'nw-toggle',role:'switch','aria-checked':String(!!s[key]),'aria-label':label,onclick:()=>{s[key]=!s[key];b.setAttribute('aria-checked',String(!!s[key]));G.applySettings()}});return h('div',{class:'nw-setting'},h('span',{},label,h('small',{},sub)),b)};
 const range=(label,key,min,max,step,fmt=v=>v)=>{const out=h('b',{},fmt(s[key]));const inp=h('input',{type:'range',class:'nw-range',min,max,step,value:String(s[key]),oninput:e=>{s[key]=Number(e.target.value);out.textContent=fmt(s[key]);G.applySettings()}});return h('div',{},h('div',{class:'nw-setting',style:{borderBottom:0,paddingBottom:0}},h('span',{},label),out),inp)};
 wrap.append(range('Mouse sensitivity','sensitivity',.2,3,.05,v=>v.toFixed(2)),range('Field of view','fov',60,105,1,v=>v+'°'),range('Volume','volume',0,1,.05,v=>Math.round(v*100)+'%'),range('Render quality','renderScale',.5,1,.05,v=>Math.round(v*100)+'%'),
  toggle('Shadows','Turn off for more FPS','shadows'),toggle('Invert mouse Y','','invertY'),toggle('Head bob','Camera sway when walking','viewBob'),toggle('Show FPS','','showFps'),toggle('Screen effects','Visual effects from products and drinks','effects'));
 return wrap;
}
export function openSettings(G){openModal(G,panel('Settings',null,settingsList(G),closeRow(G)))}
export function openCredits(G){openModal(G,panel('Credits','Nova Weed is an original Nova game.',h('div',{class:'nw-list'},...[['Game','Made for Nova'],['Engine','three.js (MIT license)'],['Art & sound','Made in code for Nova'],['City','Nova City, a fictional town']].map(([a,b])=>h('div',{class:'nw-row'},h('div',{class:'grow'},h('small',{},a),h('b',{},b))))),closeRow(G)))}
// ---------- co-op ----------
export function openCoopMenu(G,prefill=''){
 const body=h('div'),status=h('p',{class:'sub'});
 const code=h('input',{class:'nw-code',maxlength:'5',placeholder:'CODE',value:prefill,'aria-label':'Session code',autocomplete:'off',spellcheck:'false',oninput:e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')}});
 const busy=async(btn,fn)=>{btn.disabled=true;status.textContent='Connecting…';try{await fn();closeModal(G,{resume:false})}catch(e){status.textContent=e.code==='PERMISSION_DENIED'?'Online co-op needs the updated Firebase rules to be published.':(e.message||String(e));btn.disabled=false}};
 const pickSave=()=>G.loadSave()||G.newSave();
 const hostBtn=h('button',{class:'nw-b go',onclick:()=>busy(hostBtn,()=>G.hostSession(pickSave()))},'Host a session');
 const joinBtn=h('button',{class:'nw-b go',onclick:()=>busy(joinBtn,()=>G.joinSession(code.value,pickSave()))},'Join');
 body.append(
  h('div',{class:'nw-row'},h('span',{class:'ic'},'🏠'),h('div',{class:'grow'},h('b',{},'Host'),h('small',{},'Friends join your city. Everyone shares your grow room, time of day and customers.')),hostBtn),
  h('div',{class:'nw-row'},h('span',{class:'ic'},'🔑'),h('div',{class:'grow'},h('b',{},'Join with a code'),code),joinBtn),
  h('p',{class:'sub',style:{marginTop:'12px'}},'Your money, items, rank and outfit are yours and save to your own game. Up to 4 players. Needs a Nova account.'),status);
 openModal(G,panel('Play with Friends',null,body,closeRow(G)));
 G.net().then(n=>{if(!n.signedIn){status.textContent='Sign in to Nova first to play with friends.';hostBtn.disabled=joinBtn.disabled=true}}).catch(()=>{status.textContent='Could not reach Nova accounts.'});
 if(prefill)setTimeout(()=>code.focus(),50);
}
export function openInvite(G){
 const list=h('div',{class:'nw-list'},h('p',{class:'sub'},'Loading friends…'));
 openModal(G,panel('Invite friends','Session code: '+G.coop.code+' · friends get a notification in Nova.',list,closeRow(G)));
 G.net().then(()=>{const stop=G.watchFriends(friends=>{list.replaceChildren(...(friends.length?friends.map(f=>{const b=h('button',{class:'nw-b'+(f.online?' go':''),onclick:async()=>{b.disabled=true;try{await G.coop.invite(f.uid);b.textContent='Invited ✓'}catch(e){b.disabled=false;G.toast(e.code==='PERMISSION_DENIED'?'Invites need the updated Firebase rules.':'Invite failed.','bad')}}},'Invite');return h('div',{class:'nw-row'},h('span',{class:'nw-swatch',style:{background:f.online?'#3ce39b':'#555',borderRadius:'50%',width:'12px',height:'12px'}}),h('div',{class:'grow'},h('b',{},f.name),h('small',{},f.online?'Online':'Offline')),b)}):[h('p',{class:'sub'},'No friends yet. Add friends in Nova Chat, or share the code: '+G.coop.code)]))});const m=document.querySelector('.nw-modal');if(m)m._onClose=stop})}
export function openGift(G,rp){
 const S=G.S,body=h('div');
 const send=async payload=>{try{await G.coop.gift(rp.uid,payload);sfx.cash();G.toast('Sent to '+rp.name+'.','good');G.onInventory();G.save();closeModal(G)}catch{G.toast('Gift failed.','bad')}};
 body.append(h('b',{},'Cash'),h('div',{class:'nw-actions',style:{justifyContent:'flex-start',margin:'8px 0 16px'}},...[10,50,100,500].map(n=>h('button',{class:'nw-b',disabled:S.money<n||undefined,onclick:()=>{if(S.money<n)return;S.money-=n;send({money:n})}},money(n)))));
 const keys=Object.keys(S.products).filter(k=>S.products[k].bags>0);
 body.append(h('b',{},'Bags'),keys.length?h('div',{class:'nw-list',style:{marginTop:'8px'}},...keys.map(k=>h('div',{class:'nw-row'},h('div',{class:'grow'},h('b',{},productName(k)+' ×'+S.products[k].bags),effectTags(parseKey(k).effects)),...[1,5].map(n=>h('button',{class:'nw-b',disabled:S.products[k].bags<n||undefined,onclick:()=>{const p=S.products[k];if(p.bags<n)return;p.bags-=n;send({key:k,bags:n,quality:p.quality})}},'Give '+n))))):h('p',{class:'sub'},'No bags to give.'));
 openModal(G,panel('Give to '+rp.name,'Gifts arrive instantly in their game.',body,closeRow(G)));
}
export function openChat(G){
 const input=h('input',{class:'nw-chat-input',maxlength:'160',placeholder:'Say something to your crew… (Enter to send)','aria-label':'Chat message',onkeydown:e=>{if(e.key==='Enter'){G.coop?.chat(input.value);closeModal(G)}if(e.key==='Escape')closeModal(G)}});
 openModal(G,h('div',{class:'nw-panel',style:{width:'min(520px,100%)'}},input));setTimeout(()=>input.focus(),30);
}
export function openPause(G){
 const coop=G.coop;
 openModal(G,panel('Paused','Day '+G.clockNow().day+' · '+clockText(G.clockNow().minute)+(coop?' · Session '+coop.code:''),h('div',{class:'nw-list'},
  h('button',{class:'nw-b go',onclick:()=>closeModal(G)},'Resume'),
  coop?h('div',{class:'nw-row'},h('div',{class:'grow'},h('small',{},coop.isHost?'You are hosting':'In a friend’s session'),h('b',{style:{fontSize:'22px',letterSpacing:'.2em'}},coop.code)),h('button',{class:'nw-b',onclick:()=>navigator.clipboard?.writeText(coop.code).then(()=>G.toast('Code copied.'))},'Copy')):null,
  coop?h('button',{class:'nw-b',onclick:()=>{closeModal(G,{resume:false});openInvite(G)}},'Invite friends'):null,
  coop?h('div',{class:'nw-list'},...[...coop.players.values()].map(rp=>h('div',{class:'nw-row'},h('div',{class:'grow'},h('b',{},rp.name)),coop.isHost?h('button',{class:'nw-b red',onclick:async()=>{await coop.kick(rp.uid);G.toast(rp.name+' was removed.')}},'Kick'):null))):null,
  coop?h('button',{class:'nw-b red',onclick:async()=>{closeModal(G);await G.endSession()}},coop.isHost?'End session (play solo)':'Leave session'):null,
  h('button',{class:'nw-b',onclick:()=>{closeModal(G,{resume:false});openPhone(G)}},'Open phone'),
  h('button',{class:'nw-b',onclick:()=>{closeModal(G,{resume:false});openSettings(G)}},'Settings'),
  h('button',{class:'nw-b',onclick:()=>{G.save();G.toast('Game saved.','good')}},'Save game'),
  h('button',{class:'nw-b red',onclick:()=>{G.save();closeModal(G,{resume:false});G.toMenu()}},'Save & quit to menu'))));
}
export function potLabel(p,i,owned){if(i>=owned)return 'Empty spot: buy a Grow Pot at Green Thumb';if(!p.soil)return 'Add soil';if(!p.strain)return 'Plant a seed';if(p.progress>=1)return 'Harvest '+STRAINS[p.strain].name;return (p.water<.35?'Water ':'Check ')+STRAINS[p.strain].name+' · '+POT_STAGES[Math.min(3,Math.floor(p.progress*4))]+' '+Math.round(p.progress*100)+'%'}
