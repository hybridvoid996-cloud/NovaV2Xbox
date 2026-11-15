// Nova Weed UI panels. Everything talks to the game through the context object G.
import * as THREE from '/vendor/three/three.module.min.js';
import {GUNS,ITEMS,MIXERS,VAPES,EFFECTS,STRAINS,SHIRTS,HATS,RANKS,rankOf,productName,productValue,parseKey,mix,offerChance,clockText,POT_STAGES} from './economy.mjs?v=15';
import {makePerson} from './people.mjs?v=15';
import {PLACES,ROADS} from './world.mjs?v=15';
import {sfx} from './audio.mjs?v=15';
import {iconEl} from './icons.mjs?v=15';
import {openStore} from './shops.mjs?v=15';
import {APP_ICONS,APP_COLORS,statusIcons,messagesView,contactsView,mapView} from './phone.mjs?v=15';

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

// ---------- talking: a line of dialogue over the person + numbered replies ----------
export function openTalk(G,{name,line,options}){
 const opts=options.filter(Boolean);
 const pick=i=>{const o=opts[i];if(!o)return;sfx.click();if(o.fn){closeModal(G,{resume:false});o.fn()}else closeModal(G)};
 const el=h('div',{class:'nw-talk'},h('div',{class:'say'},h('small',{},name),h('p',{},line)),
  h('div',{class:'opts'},...opts.map((o,i)=>h('button',{class:'opt'+(o.dim?' dim':''),onclick:()=>pick(i)},h('kbd',{},'['+(i+1)+']'),h('span',{},o.label),o.note?h('em',{},o.note):null))));
 const key=e=>{if(!el.isConnected)return removeEventListener('keydown',key,true);const n=Number(e.key);if(n>=1&&n<=opts.length){e.preventDefault();e.stopPropagation();pick(n-1)}};
 addEventListener('keydown',key,true);
 openModal(G,el);document.querySelector('.nw-modal')?.classList.add('talk');
}
const CLERKS={garden:['Mira','Hey there! Need seeds, soil or anything for the grow?'],quick:['Sal','Welcome to Quick Stop. What can I get you?'],thread:['Jules','Looking sharp is half the job. Want to try something on?'],gas:['Dee','Fuel & Go. Drinks, snacks, vapes... what’ll it be?'],arms:['Vic','Keep your voice down. You buying or browsing?']};
export function openShop(G,kind,{direct=false}={}){
 if(!direct){const [nm,line]=CLERKS[kind]||['Clerk','What can I get you?'];return openTalk(G,{name:nm,line,options:[{label:kind==='thread'?'Show me what you’ve got':'I’d like to buy something',fn:()=>openShop(G,kind,{direct:true})},{label:'Never mind'}]})}
 if(kind!=='thread')return openStore(G,kind,{h,money,openModal,closeModal,sfx});
 const S=G.S,rank=rankOf(S.xp);
 const titles={garden:['Green Thumb','Seeds, soil, pots and supplies. — Mira'],quick:['Quick Stop','Drinks and mixers. Open 24/7.'],thread:['Thread Co.','Look good, sell better.'],arms:['Vic’s Trunk','Guns, ammo and med kits. Cash only. Works on NPCs and cops, never on other players.']};
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
   const have=id==='pot'?G.potCount()+' / '+(G.maxPots?.()||8):(S.inv[id]||0);
   const buy=n=>{if(item.gun&&S.inv[id]){G.toast('You already own the '+item.name+'.');return}if(item.gun)n=1;const cost=item.price*n;if(S.money<cost){sfx.deny();G.toast('Not enough cash.','bad');return}
    if(id==='pot'){if(G.potCount()>=(G.maxPots?.()||8)){G.toast('No room for more pots. Buy a house with a greenhouse for more.','bad');return}if(G.coop){G.coop.addPot();G.toast('Added a pot to the shared grow room.','good')}else{G.addPotLocal();G.refreshPots()}}
    else if(item.gives)for(const [k,q]of Object.entries(item.gives))S.inv[k]=(S.inv[k]||0)+q*n;else S.inv[id]=(S.inv[id]||0)+n;
    S.money-=cost;if(item.gun){G.mag=G.mag||{};G.mag[id]=GUNS[id].mag;G.toast('Comes loaded. Press R to reload, buy ammo boxes here.','good')}sfx.cash();G.save();G.onInventory();paint()};
   const desc=item.vape&&!locked?h('span',{},VAPES[id].hits+' hits · you have '+(S.inv[id]||0)+' ',effectTags([VAPES[id].effect])):item.mixer?(()=>{const m=MIXERS[id];return h('span',{},'Adds ',effectTags([m.effect]))})():locked?'Unlocks at '+RANKS[item.rank].name:'Owned: '+have;
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
  body.append(h('b',{},'1. Product'),h('div',{class:'nw-list',style:{margin:'8px 0 14px'}},...products.map(k=>h('button',{class:'nw-row'+(k===pick?' sel':''),onclick:()=>{pick=k;paint()}},iconEl('bag',EFFECTS[parseKey(k).effects.at(-1)]?.color||STRAINS[parseKey(k).strain]?.color),h('div',{class:'grow'},h('b',{},productName(k)+' ×'+S.products[k].bags),effectTags(parseKey(k).effects)),h('span',{},money(productValue(k,S.products[k].quality))))) ));
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
 const head=h('div',{class:'nw-row nw-offerhead'},h('span',{class:'nw-avatar'},c.name.split(' ').map(w=>w[0]).join('')),h('div',{class:'grow'},h('b',{},c.name),h('small',{},memo.met?'Likes: ':'New face. Make a good first impression.'),memo.met?effectTags(c.likes):null),h('small',{},'Loyalty '+'★'.repeat(Math.min(5,memo.loyalty))+'☆'.repeat(Math.max(0,5-memo.loyalty))));
 const paint=()=>{body.replaceChildren();
  if(!products.length){body.append(h('p',{class:'sub'},'You have nothing bagged to sell.'));return}
  const p=S.products[pick];const value=productValue(pick,p.quality);const price=Math.max(1,Math.round(value*mult));const chance=offerChance({...c,loyalty:memo.loyalty},pick,price,p.quality);
  body.append(h('div',{class:'nw-list'},...products.map(k=>h('button',{class:'nw-row'+(k===pick?' sel':''),onclick:()=>{pick=k;qty=1;paint()}},iconEl('bag',EFFECTS[parseKey(k).effects.at(-1)]?.color||STRAINS[parseKey(k).strain]?.color),h('div',{class:'grow'},h('b',{},productName(k)+' ×'+S.products[k].bags),effectTags(parseKey(k).effects)),h('span',{},money(productValue(k,S.products[k].quality)))))));
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
 let thread=null;const go=a=>{app=a;thread=null;paint()};
 const head=(title,back)=>h('div',{class:'nw-phone-head'},h('button',{class:'nw-back',onclick:()=>back?back():go('home'),'aria-label':'Back',html:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>'}),h('h3',{},title));
 const paint=()=>{body.replaceChildren();
  if(app==='home'){
   const NAMES={messages:'Messages',contacts:'Contacts',map:'Map',products:'Products',jobs:'Jobs',bank:'Bank',rides:'Rides',profile:'Profile',rent:'Rent',homes:'Homes',dealers:'Dealers',settings:'Settings'};
   const badge={messages:S.messages.filter(m=>!m.read).length,contacts:G.npcs.filter(n=>n.order).length};
   const tile=id=>h('button',{class:'nw-app',onclick:()=>{sfx.click();go(id)}},h('i',{style:{'--a':APP_COLORS[id]},html:APP_ICONS[id]}),badge[id]?h('span',{class:'badge'},badge[id]):null,h('span',{class:'nm'},NAMES[id]));
   body.append(h('div',{class:'nw-widget'},h('b',{},clockText(S.minute)),h('small',{},'Day '+S.day+' · '+RANKS[rankOf(S.xp)].name),h('div',{class:'cash'},h('span',{},h('small',{},'Cash'),money(S.money)),h('span',{},h('small',{},'Bank'),money(S.bank||0)))),
    h('div',{class:'nw-apps'},...['products','jobs','dealers','bank','rides','homes','profile','rent'].map(tile)),
    h('div',{class:'nw-dock'},...['messages','contacts','map','settings'].map(tile)));}
  if(app==='messages')messagesView(G,body,{h,head,thread,setThread:t=>{thread=t;paint()}});
  if(app==='contacts')contactsView(G,body,{h,head,effectTags,money});
  if(app==='products'){body.append(head('Products'));const keys=Object.keys(S.products).filter(k=>S.products[k].bags||S.products[k].buds);if(!keys.length)body.append(h('p',{class:'sub'},'Nothing yet. Grow something!'));const rename=(k,row)=>{const inp=h('input',{class:'nw-name',maxlength:'22',value:S.names?.[k]||productName(k),'aria-label':'Product name'});const save=()=>{S.names=S.names||{};const v=inp.value.trim().slice(0,22);if(v)S.names[k]=v;else delete S.names[k];G.save();G.onInventory();paint()};inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')save()});row.replaceChildren(inp,h('button',{class:'nw-b go',onclick:save},'Save'));setTimeout(()=>inp.select(),20)};
   const row=(k,dim)=>{const p=S.products[k];const col=EFFECTS[parseKey(k).effects.at(-1)]?.color||STRAINS[parseKey(k).strain]?.color;const r=h('div',{class:'nw-row'+(dim?' dim':'')});r.append(iconEl('bag',col),h('div',{class:'grow'},h('b',{},productName(k)),h('small',{},dim?'Recipe · none in stock':p.bags+' bags · '+p.buds+' buds · quality '+Math.round(p.quality*100)+'%'),effectTags(parseKey(k).effects)),h('b',{},money(productValue(k,p.quality||1))),h('button',{class:'nw-b',onclick:()=>rename(k,r)},'Name'));return r};
   for(const k of keys)body.append(row(k,false));
   const book=Object.keys(S.products).filter(k=>!keys.includes(k));if(book.length){body.append(h('p',{class:'sub',style:{marginTop:'12px'}},'Recipe book · products you’ve made before'));for(const k of book)body.append(row(k,true))}
   body.append(h('p',{class:'sub',style:{marginTop:'10px'}},'Create new products at the mixing station: every mixer adds or changes an effect. Give your best ones a name.'))
   body.append(h('p',{class:'sub',style:{marginTop:'12px'}},'Inventory'),h('div',{class:'nw-list'},...Object.entries(S.inv).filter(([,n])=>n>0).map(([id,n])=>h('div',{class:'nw-row'},iconEl(id),h('div',{class:'grow'},ITEMS[id]?.name||id),h('b',{},'×'+n)))))}
  if(app==='map')mapView(G,body,{h,head,PLACES,ROADS});
  if(app==='profile'){body.append(head('Profile'));const pv=h('canvas',{class:'nw-preview'});body.append(pv,
   h('div',{class:'nw-row'},h('div',{class:'grow'},h('b',{},RANKS[rankOf(S.xp)].name),h('small',{},S.xp+' XP'),h('div',{class:'nw-meter',style:{marginTop:'6px'}},h('i',{style:{width:Math.min(100,progressPct(S.xp))+'%',background:'#5dff8a'}})))),
   h('div',{class:'nw-list',style:{marginTop:'8px'}},...[['Bags sold',S.stats.sold],['Money earned',money(S.stats.earned)],['Plants harvested',S.stats.grown],['Bags mixed',S.stats.mixed],['Times busted',S.stats.busted]].map(([a,b])=>h('div',{class:'nw-row'},h('div',{class:'grow'},a),h('b',{},b)))));setTimeout(()=>outfitPreview(G,pv),0)}
  if(app==='rent'){body.append(head('Rent'));const late=S.day>S.rentDue;body.append(h('div',{class:'nw-row'},h('div',{class:'grow'},h('b',{},'Apartment 4B'),h('small',{},late?'LATE: was due day '+S.rentDue:'Due on day '+S.rentDue+' (today is day '+S.day+')')),h('b',{},money(S.rent))),h('div',{class:'nw-actions'},h('button',{class:'nw-b go',disabled:S.money<S.rent||undefined,onclick:()=>{G.payRent();paint()}},'Pay '+money(S.rent))))}
  if(app==='dealers'){body.append(head('Dealers'));G.dealersView?.(body,paint)}
  if(app==='homes'){body.append(head('Homes'));G.homesView?.(body,paint)}
  if(app==='bank'){body.append(head('Bank'));G.bankView?.(body,paint)}
  if(app==='rides'){body.append(head('Rides'));G.ridesView?.(body,paint)}
  if(app==='jobs'){body.append(head('Jobs'));G.jobsView?.(body,paint);G.careersView?.(body,paint)}
  if(app==='settings'){body.append(head('Settings'),settingsList(G))}
 };
 paint();
 const screen=h('div',{class:'nw-phone-screen'},h('div',{class:'nw-phone-bar'},h('span',{},clockText(S.minute)),h('i',{class:'island'}),h('span',{html:statusIcons})),body,h('i',{class:'homebar',onclick:()=>go('home')}));
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
 for(const m of (G.jobMarks?.()||[]))dot(m.x,m.z,'#5dff8a',m.label||null,m.label?8:5);
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
 const keys=[['W A S D','Move'],['Shift','Sprint'],['Space','Jump'],['E','Interact'],['Tab','Phone'],['1–9 / wheel','Pick item'],['Click / F','Use item'],['R','Reload'],['Q','Punch'],['B','Skateboard'],['T','Chat (online)'],['Esc','Pause']];
 const tabs={Display:()=>[range('Field of view','fov',60,105,1,v=>v+'°'),range('Render quality','renderScale',.5,1,.05,v=>Math.round(v*100)+'%'),toggle('Camera bob','Camera sway when walking','viewBob'),toggle('Show FPS','','showFps')],
  Graphics:()=>[toggle('Glow & color','Bloom, warm color grading and vignette','post'),toggle('Shadows','Turn off for more FPS on laptops','shadows'),toggle('Screen effects','Smoke haze and product effects','effects')],
  Audio:()=>[range('Volume','volume',0,1,.05,v=>Math.round(v*100)+'%')],
  Controls:()=>[range('Mouse sensitivity','sensitivity',.2,3,.05,v=>v.toFixed(2)),toggle('Invert mouse Y','','invertY'),h('div',{class:'nw-keylist'},...keys.map(([k,v])=>h('div',{},h('kbd',{},k),h('span',{},v))))]};
 let cur='Display';const bar=h('div',{class:'nw-tabs'}),body=h('div',{class:'nw-tabbody'});
 const paint=()=>{bar.replaceChildren(...Object.keys(tabs).map(t=>h('button',{class:t===cur?'on':'',onclick:()=>{cur=t;paint()}},t)));body.replaceChildren(...tabs[cur]())};paint();
 wrap.append(bar,body);
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
 let vis='private';const visRow=h('div',{class:'nw-tabs',style:{margin:'0 0 8px'}});const paintVis=()=>visRow.replaceChildren(...[['private','Private · invite or code'],['public','Public · anyone can join']].map(([k,l])=>h('button',{class:k===vis?'on':'',onclick:()=>{vis=k;paintVis()}},l)));paintVis();
 const lobbyList=h('div',{class:'nw-list',style:{marginTop:'6px'}},h('p',{class:'sub'},'Looking for public sessions…'));
 const hostBtn=h('button',{class:'nw-b go',onclick:()=>busy(hostBtn,()=>G.hostSession(pickSave(),{visibility:vis}))},'Host a session');
 const joinBtn=h('button',{class:'nw-b go',onclick:()=>busy(joinBtn,()=>G.joinSession(code.value,pickSave()))},'Join');
 body.append(
  visRow,
  h('div',{class:'nw-row'},h('div',{class:'grow'},h('b',{},'Host'),h('small',{},'Friends join your city. Everyone shares your grow room, time of day and customers.')),hostBtn),
  h('div',{class:'nw-row'},h('div',{class:'grow'},h('b',{},'Join with a code'),code),joinBtn),
  h('p',{class:'sub',style:{margin:'12px 0 0'}},'Public sessions'),lobbyList,
  h('p',{class:'sub',style:{marginTop:'12px'}},'Your money, items, rank and outfit are yours and save to your own game. Up to 4 players. Needs a Nova account.'),status);
 openModal(G,panel('Play with Friends',null,body,closeRow(G)));
 G.net().then(n=>{if(!n.signedIn){status.textContent='Sign in to Nova first to play with friends.';hostBtn.disabled=joinBtn.disabled=true;lobbyList.replaceChildren(h('p',{class:'sub'},'Sign in to see public sessions.'));return}
  const stop=G.watchLobbies(list=>lobbyList.replaceChildren(...(list.length?list.map(l=>{const b=h('button',{class:'nw-b go',onclick:()=>busy(b,()=>G.joinSession(l.code,pickSave()))},'Join');return h('div',{class:'nw-row'},h('div',{class:'grow'},h('b',{},l.name||'Island'),h('small',{},'Host '+l.host+' · Day '+(l.day||1)+' · '+l.count+'/'+l.max+' players')),b)}):[h('p',{class:'sub'},'No public sessions right now. Host one!')])),()=>lobbyList.replaceChildren(h('p',{class:'sub'},'Public sessions need the updated database rules to be published.')));
  const m=document.querySelector('.nw-modal');if(m)m._onClose=stop}).catch(()=>{status.textContent='Could not reach Nova accounts.'});
 if(prefill)setTimeout(()=>code.focus(),50);
}
export function openInvite(G){
 const list=h('div',{class:'nw-list'},h('p',{class:'sub'},'Loading friends…'));
 openModal(G,panel('Invite friends','Session code: '+G.coop.code+' · friends get a notification in Nova.',list,closeRow(G)));
 G.net().then(()=>{const stop=G.watchFriends(friends=>{list.replaceChildren(...(friends.length?friends.map(f=>{const b=h('button',{class:'nw-b'+(f.online?' go':''),onclick:async()=>{b.disabled=true;try{await G.coop.invite(f.uid);b.textContent='Invited ✓'}catch(e){b.disabled=false;G.toast(e.code==='PERMISSION_DENIED'?'Invites need the updated Firebase rules.':'Invite failed.','bad')}}},'Invite');return h('div',{class:'nw-row'},h('span',{class:'nw-swatch',style:{background:f.online?'#3ce39b':'#555',borderRadius:'50%',width:'12px',height:'12px'}}),h('div',{class:'grow'},h('b',{},f.name),h('small',{},f.online?'Online':'Offline')),b)}):[h('p',{class:'sub'},'No friends yet. Add friends in Nova Chat, or share the code: '+G.coop.code)]))});const m=document.querySelector('.nw-modal');if(m)m._onClose=stop})}

// ---------- invite Nova friends (hosts a session first if needed) ----------
export function openFriends(G,{onHosted}={}){
 const list=h('div',{class:'nw-friends'},h('p',{class:'sub'},'Loading your Nova friends…'));
 const status=h('p',{class:'sub nw-fstatus'});
 const seats=h('div',{class:'nw-fseats'});
 const paintSeats=()=>{const c=G.coop;const ppl=c?[{name:'You',me:true},...[...c.players.values()]]:[{name:'You',me:true}];seats.replaceChildren(...[0,1,2,3].map(i=>{const p=ppl[i];return h('div',{class:'seat'+(p?' on':'')},p?h('b',{html:p.me?'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="12" cy="8" r="4.2"/><path d="M3.5 21c.8-4.6 4.2-7 8.5-7s7.7 2.4 8.5 7z"/></svg>':undefined},p.me?null:(p.name||'?').slice(0,2).toUpperCase()):h('span',{},'+'),h('small',{},p?p.name:'Open'))}))};
 paintSeats();const seatIv=setInterval(()=>{if(!seats.isConnected)return clearInterval(seatIv);paintSeats()},1000);
 status.textContent=G.coop?'Session '+G.coop.code+' · friends get an invite in Nova and join with one click.':'Inviting someone starts an online session from your latest save.';
 const ensureHost=async()=>{if(G.coop)return G.coop;status.textContent='Starting your session…';const c=await G.hostSession(G.loadSave()||G.newSave());onHosted?.();status.textContent='Session '+c.code+' is live. Friends join with one click from Nova.';return c};
 const el=h('div',{class:'nw-panel nw-invite'},h('div',{class:'ihead'},h('h2',{},'Invite friends'),h('button',{class:'x',onclick:()=>closeModal(G),'aria-label':'Close'},'×')),seats,status,list,
  G.coop?h('div',{class:'nw-actions'},h('button',{class:'nw-b',onclick:()=>navigator.clipboard?.writeText(G.coop.code).then(()=>G.toast('Code copied.'))},'Copy code '+G.coop.code)):null);
 openModal(G,el);
 G.net().then(n=>{if(!n.signedIn){list.replaceChildren(h('p',{class:'sub'},'Sign in to Nova to invite friends.'));return}
  const stop=G.watchFriends(friends=>{list.replaceChildren(...(friends.length?friends.map(f=>{
   const av=f.photo||f.avatar||f.photoURL;const b=h('button',{class:'nw-b'+(f.online?' go':''),onclick:async()=>{b.disabled=true;b.textContent='…';try{const c=await ensureHost();await c.invite(f.uid);b.textContent='Invited';b.classList.add('done');sfx.cash()}catch(e){b.disabled=false;b.textContent='Invite';G.toast(e.code==='PERMISSION_DENIED'?'Invites need the updated Firebase rules.':(e.message||'Invite failed.'),'bad')}}},'Invite');
   return h('div',{class:'nw-friend'},h('span',{class:'av'+(f.online?' on':'')},av?h('img',{src:av,alt:''}):(f.name||'?').slice(0,2).toUpperCase()),h('div',{class:'t'},h('b',{},f.name),h('small',{},f.online?(f.activity||'Online'):'Offline')),b)}):[h('p',{class:'sub'},'No friends yet. Add friends in Nova Chat first.')]))});
  const m=document.querySelector('.nw-modal');if(m)m._onClose=stop}).catch(()=>list.replaceChildren(h('p',{class:'sub'},'Could not reach Nova.')));
}
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
 const coop=G.coop,ck=G.clockNow();
 const item=(label,fn,cls='')=>h('button',{class:'nw-mi '+cls,onclick:()=>{sfx.click();fn()}},label);
 openModal(G,h('div',{class:'nw-pause'},
  h('div',{class:'head'},h('small',{},'PAUSED'),h('span',{},'Day '+ck.day+' · '+clockText(ck.minute)+(coop?' · Session '+coop.code:''))),
  h('nav',{class:'nw-mlist'},
   item('Resume',()=>closeModal(G)),
   G.isOwner?item('Admin panel',()=>{closeModal(G,{resume:false});G.openAdmin()},'owner'):null,
   item('Phone',()=>{closeModal(G,{resume:false});openPhone(G)}),
   item('Settings',()=>{closeModal(G,{resume:false});openSettings(G)}),
   item('Invite friends',()=>{closeModal(G,{resume:false});openFriends(G)}),
   coop?item('Copy session code',()=>navigator.clipboard?.writeText(coop.code).then(()=>G.toast('Code copied.'))):null,
   coop?item(coop.isHost?'End session':'Leave session',async()=>{closeModal(G);await G.endSession()},'red'):null,
   item('I\u2019m stuck',()=>{closeModal(G);G.player.teleport(G.PLACES.spawn.x,G.PLACES.spawn.z,Math.PI);G.toast('Moved you to the bus stop.')}),
   item('Save game',()=>{G.save();G.toast('Game saved.','good')}),
   item('Save & quit',()=>{G.save();closeModal(G,{resume:false});G.toMenu()},'red')),
  coop&&coop.players.size?h('div',{class:'nw-pplayers'},h('small',{},'IN THIS SESSION'),...[...coop.players.values()].map(rp=>h('div',{},h('b',{},rp.name),coop.isHost?h('button',{class:'nw-b red',onclick:async()=>{await coop.kick(rp.uid);G.toast(rp.name+' was removed.')}},'Kick'):null))):null,
  h('div',{class:'nw-keys'},h('kbd',{},'Esc'),'Back')),{});
 modal_pause();
}
function modal_pause(){document.querySelector('.nw-modal')?.classList.add('pause')}
export function potLabel(p,i,owned){if(i>=owned)return 'Empty spot: buy a Grow Pot at Green Thumb';if(!p.soil)return 'Add soil';if(!p.strain)return 'Plant a seed';if(p.progress>=1)return 'Harvest '+STRAINS[p.strain].name;return (p.water<.35?'Water ':'Check ')+STRAINS[p.strain].name+' · '+POT_STAGES[Math.min(3,Math.floor(p.progress*4))]+' '+Math.round(p.progress*100)+'%'}
