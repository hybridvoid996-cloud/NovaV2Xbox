// Nova Weed: an original first-person grow-and-sell game made for Nova.
import * as THREE from '/vendor/three/three.module.min.js';
import {GUNS,VAPES,STRAINS,EFFECTS,ITEMS,SHIRTS,HATS,RANKS,rankOf,productName,productValue,parseKey,baseProduct,tickPot,potStage,harvestYield,newSave,clockText,isNight} from './economy.mjs?v=15';
import {makePerson,randomLook,makeCustomers,Walker,animatePerson} from './people.mjs?v=15';
import {buildWorld,walkGraph,makeSky,PLACES,WALK} from './world.mjs?v=15';
import {Player} from './player.mjs?v=15';
import {createAction,spawnDealer} from './action.mjs?v=15';
import {createRides} from './vehicles.mjs?v=15';
import {createLife} from './life.mjs?v=15';
import {buildShops} from './shops.mjs?v=15';
import {createGPS} from './phone.mjs?v=15';
import {checkOwner,openAdmin} from './admin.mjs?v=15';
import {createPost} from './post.mjs?v=15';
import {buildProps} from './props.mjs?v=15';
import {createHomes,createBuyerFx} from './homes.mjs?v=15';
import {iconEl} from './icons.mjs?v=15';
import {setProductNames} from './economy.mjs?v=15';
import {buildMenuSet} from './menu.mjs?v=15';
import {makePlantModel,makePotModel,makeSoil} from './plants.mjs?v=15';
import {createFx,exhale,wisp,puff,chimney,exhaust,haze} from './fx.mjs?v=15';
import {sfx,engine,startAmbience,setVolume,resume as resumeAudio} from './audio.mjs?v=15';
import {openTalk,openFriends,h,money,openModal,closeModal,modalOpen,openShop,openPacking,openMixing,openOffer,openPhone,openSettings,openCredits,openPause,potLabel,effectTags,openCoopMenu,openGift,openChat} from './ui.mjs?v=15';
import {Coop,spawnAvatar,updateAvatars,applyTargets} from './coop.mjs?v=15';

const LEAF='<svg class="leaf" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="nwLeafGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9ffe4"/><stop offset=".5" stop-color="#5dff8a"/><stop offset="1" stop-color="#0f8f42"/></linearGradient></defs><path d="M50 6c6 16 7 30 3 44 9-13 21-21 37-24-7 14-19 24-33 29 12-1 24 3 33 11-13 3-25 1-35-5 3 8 4 16 3 24l-3 9h-4l-1-9c-1-8 0-16 3-24-10 6-22 8-35 5 9-8 21-12 33-11C40 50 28 40 21 26c16 3 28 11 37 24-4-14-3-28 3-44Z"/></svg>';
const logo=()=>h('div',{class:'nw-logo',html:LEAF+'<small>NOVA</small><b>WEED</b>'});

// ---------- settings + save ----------
const SET_KEY='novaweed-settings',SAVE_KEY='novaweed-save';
const settings={sensitivity:1,fov:75,volume:.7,renderScale:1,shadows:true,invertY:false,viewBob:true,showFps:false,effects:true};
try{Object.assign(settings,JSON.parse(localStorage.getItem(SET_KEY)||'{}'))}catch{}
const SLOT_KEY=i=>'novaweed-slot-'+i;
try{if(!localStorage.getItem(SLOT_KEY(1))&&localStorage.getItem(SAVE_KEY)){const old=JSON.parse(localStorage.getItem(SAVE_KEY));if(old?.version===1){old.slot=1;old.name=old.name||'Island 1';old.created=old.created||Date.now();localStorage.setItem(SLOT_KEY(1),JSON.stringify(old))}}}catch{}
const readSlots=()=>[1,2,3,4,5].map(i=>{try{const s=JSON.parse(localStorage.getItem(SLOT_KEY(i))||'null');return s?.version===1?{...newSave(),...s,slot:i}:null}catch{return null}});
const loadSave=()=>readSlots().filter(Boolean).sort((a,b)=>(b.lastPlayed||0)-(a.lastPlayed||0))[0]||null;

// ---------- renderer ----------
const canvas=h('canvas',{id:'nw-canvas'});document.body.append(canvas);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(settings.fov,innerWidth/innerHeight,.05,1000);scene.add(camera);
const post=createPost(renderer);
function resize(){renderer.setPixelRatio(Math.min(1.5,devicePixelRatio)*settings.renderScale);renderer.setSize(innerWidth,innerHeight,false);const v=renderer.getDrawingBufferSize(new THREE.Vector2());post.setSize(v.x,v.y);post.enabled=settings.post!==false;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
addEventListener('resize',resize);

// ---------- game context shared with the UI ----------
const G={settings,S:null,paused:false,npcs:[],police:[],player:null,effects:{},mode:'loading',coop:null};
// In co-op everyone shares the host's grow room and clock.
const potList=()=>G.coop?G.coop.pots:G.S.pots;
// pots can have gaps (a greenhouse fills its own slots), so count only real ones
const potCount=()=>potList().filter(Boolean).length;G.potCount=potCount;
G.addPotLocal=()=>{const S=G.S,max=G.maxPots?.()||8;for(let i=0;i<max;i++)if(!S.pots[i]){S.pots[i]={};return true}return false};
const clockNow=()=>G.coop&&!G.coop.isHost&&G.coop.clock?G.coop.clock:{minute:G.S.minute,day:G.S.day};
G.potList=potList;G.clockNow=clockNow;
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname))window.__nw=G; // local testing only
G.save=()=>{if(G.S)try{G.S.slot=G.S.slot||1;G.S.lastPlayed=Date.now();G.S.created=G.S.created||Date.now();localStorage.setItem(SLOT_KEY(G.S.slot),JSON.stringify(G.S))}catch{}};
G.applySettings=()=>{try{localStorage.setItem(SET_KEY,JSON.stringify(settings))}catch{}setVolume(settings.volume);renderer.shadowMap.enabled=settings.shadows;scene.traverse(o=>{if(o.material)o.material.needsUpdate=true});resize();fpsEl.hidden=!settings.showFps};
G.releaseLock=()=>{if(document.pointerLockElement)document.exitPointerLock()};
G.askLock=()=>{if(G.mode==='play'&&!modalOpen())clickToPlay.hidden=false};

// ---------- loading screen ----------
const loading=h('div',{class:'nw-loading'},h('div',{class:'smoke'},...Array.from({length:8},(_,i)=>h('i',{style:{left:(i*13)%100+'%',animationDelay:-i*1.2+'s'}}))),
 h('div',{class:'nw-load-box'},logo(),h('div',{class:'nw-bar'},h('i')),h('div',{class:'nw-load-text'},'Starting…'),h('div',{class:'nw-tip'},'Tip: mix your product at home. More effects means customers pay more.')));
document.body.append(loading);
const TIPS=['Tip: water your plants. Dry plants grow slower and lose quality.','Tip: police patrol the main streets. Sell where nobody is watching.','Tip: regulars text you orders. Bring what they like for a bonus.','Tip: sleep in your bed at night to skip to morning.','Tip: Fertilizer makes plants grow faster and yield more.','Tip: price too high and customers walk away.'];
const step=async(text,pct)=>{loading.querySelector('.nw-load-text').textContent=text;loading.querySelector('.nw-bar i').style.width=pct+'%';loading.querySelector('.nw-tip').textContent=TIPS[Math.floor(Math.random()*TIPS.length)];await new Promise(r=>setTimeout(r,120));await new Promise(requestAnimationFrame)};

// ---------- HUD ----------
const hud=h('div',{class:'nw-hud',hidden:true});
const moneyChip=h('span',{class:'nw-chip money'}),rankChip=h('span',{class:'nw-chip'}),clock=h('div',{class:'nw-clock nw-chip'});
const quest=h('div',{class:'nw-quest'}),prompt=h('div',{class:'nw-prompt',hidden:true}),hotbar=h('div',{class:'nw-hotbar'}),heldName=h('div',{class:'nw-held-name'}),stam=h('div',{class:'nw-stamina'},h('i')),effectsBox=h('div',{class:'nw-effects'}),toasts=h('div',{class:'nw-toasts'});
const fpsEl=h('span',{class:'nw-chip',hidden:!settings.showFps});
hud.append(h('div',{class:'nw-cross'}),h('div',{class:'nw-top'},moneyChip,rankChip,fpsEl,clock),quest,effectsBox,prompt,heldName,stam,hotbar,toasts);
const vignette=h('div',{class:'nw-vignette'});
const clickToPlay=h('div',{class:'nw-click',hidden:true,onclick:()=>{resumeAudio();try{const p=canvas.requestPointerLock?.();p?.catch?.(()=>G.toast('Click again to capture the mouse.'))}catch{}}},h('div',{},'Click to play',h('small',{},'WASD move · Shift sprint · Space jump · E interact · Tab phone · 1-9 items · Click use · R reload · B board · Esc pause')));
const veil=h('div',{class:'nw-veil'});const eyelids=h('div',{class:'nw-eyelids'},h('i',{class:'top'}),h('i',{class:'bot'}));
document.body.append(vignette,veil,eyelids,hud,clickToPlay);
const banners=h('div',{class:'nw-banners'});document.body.append(banners);
const TICON={good:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',bad:'<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 3l10 18H2z"/><rect x="11" y="9" width="2" height="6" fill="#111"/><rect x="11" y="16.5" width="2" height="2" fill="#111"/></svg>','':'<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="12" r="10"/><rect x="11" y="10" width="2" height="7" fill="#111"/><rect x="11" y="6.5" width="2" height="2" fill="#111"/></svg>'};
G.toast=(text,kind='')=>{const clean=String(text).replace(/^[\u2700-\u27BF\u{1F300}-\u{1FAFF}\u2600-\u26FF\u2B06\u2714\u2716\uFE0F\s]+/u,'');const t=h('div',{class:'nw-toast '+kind},h('span',{class:'ti',html:TICON[kind]||TICON['']}),h('span',{class:'tx'},clean),h('i',{class:'bar'}));toasts.append(t);setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),300)},4200);while(toasts.children.length>4)toasts.firstChild.remove()};
G.banner=(from,text)=>{const ini=from.replace(/\(.*\)/,'').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();const hue=[...from].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
 const b=h('button',{class:'nw-banner',onclick:()=>{b.remove();if(G.mode==='play'&&!modalOpen())openPhone(G,'messages')}},h('span',{class:'av',style:{'--h':hue}},ini),h('div',{class:'t'},h('div',{class:'top'},h('small',{},'MESSAGES'),h('small',{},'now')),h('b',{},from),h('span',{},text)));
 banners.append(b);setTimeout(()=>{b.classList.add('out');setTimeout(()=>b.remove(),400)},6000);while(banners.children.length>2)banners.firstChild.remove()};
G.message=(from,text)=>{G.S.messages.push({from,text,day:G.S.day,read:false});if(G.S.messages.length>60)G.S.messages.shift();sfx.buzz();G.banner(from,text)};

// ---------- world ----------
let world,sky,player,graph,fx,action,rides,menuSet,life,shops,gps,homes,buyerFx,pots=[];
async function build(){
 await step('Starting engine…',8);resize();
 await step('Building Nova City…',25);world=buildWorld(scene);G.world=world;graph=walkGraph();
 await step('Lighting the streets…',45);sky=makeSky(scene,renderer);fx=createFx(scene);G.fx=fx;menuSet=buildMenuSet(scene);
 await step('Waking up the locals…',62);
 const customers=makeCustomers(16);
 customers.forEach((c,i)=>{const g=makePerson(randomLook(c.seed));scene.add(g);const w=new Walker(g,graph,{seed:c.seed,start:(i*7)%graph.nodes.length,speed:1.1+((c.seed%7)/10)});G.npcs.push({c,g,w,cooldown:0,order:null,smoker:c.seed%3===0,smokeT:2+i%5})});
 // shop clerks
 for(const [key,look]of [['garden',{shirt:'#2f7d45',hat:'cap',hatColor:'#1f5c33'}],['quick',{shirt:'#c0392b'}],['thread',{shirt:'#5b3a8c',hat:'beanie',hatColor:'#ff6ad5'}]]){const p=PLACES[key].clerk;const g=makePerson(randomLook(key.length*91,look));g.position.set(p.x,0,p.z);g.rotation.y=p.z<0?0:Math.PI;scene.add(g);G[key+'Clerk']=g}
 // police
 const idx=(x,z)=>WALK.indexOf(x)*WALK.length+WALK.indexOf(z);
 const routes=[[idx(-53.5,-53.5),idx(53.5,-53.5),idx(53.5,53.5),idx(-53.5,53.5)],[idx(-6.5,-66.5),idx(-6.5,66.5),idx(6.5,66.5),idx(6.5,-66.5)],[idx(-66.5,-6.5),idx(-66.5,53.5),idx(-6.5,53.5),idx(-6.5,-6.5)],[idx(6.5,-53.5),idx(66.5,-53.5),idx(66.5,6.5),idx(6.5,6.5)]];
 routes.forEach((route,i)=>{const g=makePerson(randomLook(700+i,{shirt:'#24385f',pants:'#1a2338',police:true}));scene.add(g);G.police.push({g,w:new Walker(g,graph,{seed:9+i,start:route[0],route,speed:1.5}),night:i>=1})});
 await step('Planting the grow room…',78);
 player=new Player(camera,canvas,world.colliders,settings);G.player=player;if(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('debug'))window.__nwDebug={G,camera,scene,player};
 for(let i=0;i<8;i++)pots.push(makePot(world.potSlots[i]));
 G.PLACES=PLACES;G.openShop=k=>openShop(G,k);G.openAdmin=()=>openAdmin(G,{h,money,openModal,closeModal,sfx});checkOwner(G);G.talk=o=>openTalk(G,o);G.closePhone=()=>closeModal(G);G.dealer=spawnDealer(scene,world);
 action=createAction(G,{scene,camera,player,world,graph,fx,sfx,h,hud,money});G.action=action;
 G.rank=()=>rankOf(G.S.xp);rides=createRides(G,{scene,camera,player,world,fx,sfx,engine,h,hud,money});G.rides=rides;
 life=createLife(G,{scene,camera,player,sfx,h,hud,money,openModal,closeModal,colliders:world.colliders});G.life=life;
 shops=buildShops(G,{scene,world,sfx,h,money,openModal,closeModal});G.shops=shops;
 gps=createGPS(G,{scene,player,graph,camera,hud,h});
 homes=createHomes(G,{scene,world,sfx,h,money,addPotSlots:(slots)=>{for(const s of slots){world.potSlots.push(s);pots.push(makePot(s))}G.refreshPots()}});buyerFx=createBuyerFx(G,{fx,player});buildProps(scene,world);G.sleep=()=>sleep();G.openPhoneApp=a=>openPhone(G,a);
 await step('Rolling up…',92);
 sky.update(19*60,{x:0,z:0},world);renderer.compile(scene,camera);
 await step('Ready',100);
}

// ---------- pots ----------
function makePot(pos){
 const g=new THREE.Group();g.position.copy(pos);scene.add(g);
 const {g:potG,body:pot}=makePotModel();g.add(potG);
 const soil=makeSoil();soil.position.y=.57;
 const {plant,buds,leafMat,budMat}=makePlantModel();plant.position.y=.57;
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.47,.025,8,28).rotateX(Math.PI/2),new THREE.MeshStandardMaterial({color:'#3fa9d6',emissive:'#3fa9d6',emissiveIntensity:.6}));ring.position.y=.03;
 g.add(soil,plant,ring);
 return {g,pot,soil,plant,buds,ring,leafMat,budMat};
}
function refreshPot(i){
 const v=pots[i],p=potList()[i];const owned=!!p;
 v.g.visible=owned;if(!owned)return;
 v.soil.visible=!!p.soil;const stage=potStage(p);v.plant.visible=stage>=0;
 if(stage>=0){const s=.25+Math.min(1,p.progress)*.85;v.plant.scale.setScalar(s);v.buds.visible=stage>=3;v.leafMat.color.set(p.water<=0?'#8a9a3a':STRAINS[p.strain].color);v.budMat.color.set(STRAINS[p.strain].bud||'#9be06a');v.budMat.emissiveIntensity=stage>=4?.6:.15}
 v.ring.visible=!!p.strain&&p.progress<1;v.ring.material.color.set(p.water>.35?'#3fa9d6':p.water>0?'#ffd166':'#ff5a6e');v.ring.material.emissive.copy(v.ring.material.color);
}
G.refreshPots=()=>{for(let i=0;i<pots.length;i++)refreshPot(i)};

// ---------- outfit ----------
G.outfitLook=()=>{const s=SHIRTS.find(x=>x.id===G.S.shirt)||SHIRTS[0],hat=HATS.find(x=>x.id===G.S.hat)||HATS[0];return {skin:'#e2b48c',hair:'#2b1d14',shirt:s.color,stripe:s.stripe,hood:s.hood,pants:'#26324a',hat:hat.id==='none'?null:hat.id,hatColor:hat.color}};
G.outfitLookFor=S=>{const s=SHIRTS.find(x=>x.id===S.shirt)||SHIRTS[0],hat=HATS.find(x=>x.id===S.hat)||HATS[0];return {skin:'#e2b48c',hair:'#2b1d14',shirt:s.color,stripe:s.stripe,hood:s.hood,pants:'#26324a',hat:hat.id==='none'?null:hat.id,hatColor:hat.color}};
G.applyOutfit=()=>{player.setShirt((SHIRTS.find(x=>x.id===G.S.shirt)||SHIRTS[0]).color);G.coop?.setLook(G.outfitLook())};

// ---------- XP, money, rent ----------
G.addXP=n=>{const before=rankOf(G.S.xp);G.S.xp+=n;const after=rankOf(G.S.xp);if(after>before){sfx.level();G.toast('⬆ Rank up: '+RANKS[after].name+'!','good');if(after===1)G.message('Mira (Green Thumb)','Heard you’re moving up. Comet Haze seeds are on my shelf now.');if(after===3)G.message('Mira (Green Thumb)','Starlight OG seeds just came in. Only for serious growers.')}};
G.payRent=()=>{const S=G.S;if(!G.payAny(S.rent)){sfx.deny();G.toast('Not enough money for rent.','bad');return}S.rentPaid=(S.rentPaid||0)+1;S.rentDue=S.day+3;S.rent=Math.round(S.rent*1.25/5)*5;sfx.cash();G.toast('Rent paid. Next: '+money(S.rent)+' on day '+S.rentDue,'good');G.message('Dex','Got the rent. Respect. Next one’s '+money(S.rent)+'.');G.save()};

// ---------- hotbar + using items ----------
let hotIndex=0,hotItems=[];
G.onInventory=()=>{const S=G.S;hotItems=[];
 for(const [k,p]of Object.entries(S.products))if(p.bags>0)hotItems.push({type:'bag',key:k,icon:'👜',name:productName(k),qty:p.bags,color:EFFECTS[parseKey(k).effects.at(-1)]?.color||STRAINS[parseKey(k).strain]?.color});
 for(const id of ['drink_energy','drink_cola','drink_water','snack_chips'])if(S.inv[id]>0)hotItems.push({type:'drink',id,name:ITEMS[id].name,qty:S.inv[id]});
 if(S.inv.snack_bar>0)hotItems.push({type:'med',id:'snack_bar',name:'Protein Bar',qty:S.inv.snack_bar});
 for(const id of Object.keys(GUNS))if(S.inv[id]>0)hotItems.push({type:'gun',id,icon:'🔫',name:GUNS[id].name,qty:S.inv.ammo||0});
 if(S.inv.med_kit>0)hotItems.push({type:'med',id:'med_kit',icon:'🩹',name:'Med Kit',qty:S.inv.med_kit});
 for(const [id,v]of Object.entries(VAPES))if(S.inv[id]>0)hotItems.push({type:'vape',id,icon:'💨',name:v.short+' vape',qty:S.inv[id],color:v.body});
 for(const id of Object.values(STRAINS).map(s=>s.seed))if(S.inv[id]>0)hotItems.push({type:'seed',id,icon:'🌱',name:ITEMS[id].name,qty:S.inv[id]});
 hotItems=hotItems.slice(0,9);hotIndex=Math.min(hotIndex,Math.max(0,hotItems.length-1));paintHotbar()};
function paintHotbar(){
 hotbar.replaceChildren(...hotItems.map((it,i)=>h('div',{class:'nw-slot'+(i===hotIndex?' sel':'')},h('span',{class:'n'},i+1),iconEl(it.type==='bag'?'bag':it.id,it.type==='bag'?it.color:null,'hi'),h('span',{class:'q'},it.qty),it.color?h('span',{class:'dot',style:{background:it.color}}):null)));
 const cur=hotItems[hotIndex];heldName.textContent=!cur&&hotIndex===-1&&hotItems.length?'Hands · click or Q to punch':cur?cur.name+(cur.type==='bag'?' · click to smoke':cur.type==='vape'?' · click to hit · '+cur.qty+' left':cur.type==='gun'?' · click to shoot · R reload':cur.type==='med'?' · click to heal':cur.type==='drink'?' · click to drink':''):'';
 if(G.smokeUntil>performance.now()/1000&&cur?.type!=='vape')return;
 G.heldGun=cur?.type==='gun'?cur.id:null;
 if(cur?.type==='gun'){player?.setHeld('gun',cur.id);return}
 player?.setHeld(cur?.type==='med'?null:cur?.type==='vape'?'vape':cur?.type==='bag'?'bag':cur?.type==='drink'?'can':cur?.type==='seed'?'seed':null,cur?.color);
}
function useItem(){
 if(G.throwBall?.(camera))return;
 const it=hotItems[hotIndex];if(G.paused||player.hitting||G.driving)return;if(!it){G.punch?.();return}const S=G.S;
 const now=performance.now()/1000;
 if(it.type==='gun'){action.fire(it.id);return}
 if(it.type==='med'){if((S.hp??100)>=100)return G.toast('You’re already at full health.');const heal=it.id==='snack_bar'?20:60;S.inv[it.id]--;S.hp=Math.min(100,(S.hp??100)+heal);sfx.drink();G.toast((it.id==='snack_bar'?'Snack break.':'Patched up.')+' +'+heal+' health','good');G.onInventory();G.save();return}
 if(it.type!=='bag'&&it.type!=='vape')player.swing();
 if(it.type==='bag'){const p=S.products[it.key];if(!p?.bags)return;p.bags--;sfx.inhale();player.setHeld('joint');player.hit(1500);G.smokeUntil=now+8;G.smokeKind='smoking';
  setTimeout(()=>{exhale(fx,camera,{amount:1.1});sfx.exhale();if(Math.random()<.3)setTimeout(()=>{sfx.cough();let k=0;const shake=()=>{if(k++>18)return;player.pitch+=(Math.random()-.5)*.03;player.yaw+=(Math.random()-.5)*.02;requestAnimationFrame(shake)};shake();G.toast('*cough cough*')},700)},1400);setTimeout(()=>{if(G.smokeUntil>performance.now()/1000)exhale(fx,camera,{amount:.45,duration:.6})},4600);
  const {effects}=parseKey(it.key);applyEffects(['high',...effects],45);G.toast('You smoked '+productName(it.key));setTimeout(()=>{G.smokeUntil=0;G.smokeKind='';G.onInventory()},8000)}
 else if(it.type==='vape'){const v=VAPES[it.id];if(!(S.inv[it.id]>0))return;S.inv[it.id]--;sfx.vape();player.hit(1600);G.smokeKind='vaping';G.smokeUntil=now+3.2;
  setTimeout(()=>{exhale(fx,camera,{amount:1.9,color:v.cloud,duration:1.4});sfx.exhale()},1450);
  applyEffects(v.high?['high',v.effect]:[v.effect],v.seconds);if(!S.inv[it.id])G.toast(v.name+' is empty.');
  setTimeout(()=>{G.smokeUntil=0;G.smokeKind='';G.onInventory()},3200)}
 else if(it.type==='drink'){S.inv[it.id]--;sfx.drink();applyEffects([ITEMS[it.id].drink],it.id==='drink_water'?1:40,it.id==='drink_water');G.toast('You drank '+ITEMS[it.id].name);G.onInventory()}
 else if(it.type==='seed')G.toast('Plant seeds in a pot at home (press E on the pot).');
 G.save();
}

// ---------- effects ----------
function applyEffects(list,seconds,clear=false){const now=performance.now()/1000;if(clear){G.effects={};G.toast('Refreshed. Effects cleared.');return}for(const e of list)G.effects[e]=Math.max(G.effects[e]||0,now)+seconds}
function effectState(t){
 const now=performance.now()/1000;for(const [k,v]of Object.entries(G.effects))if(v<now)delete G.effects[k];
 const on=k=>!!G.effects[k];
 player.speedMul=(on('energy')?1.4:1)*(on('calm')?.85:1)*(on('sleepy')?.75:1)*(G.adminSpeed||1);
 player.jumpMul=on('fizzy')?1.6:1;
 const fovTarget=settings.fov+(on('focus')?-14:0)+(on('energy')?8:0);camera.fov+=(fovTarget-camera.fov)*.05;camera.updateProjectionMatrix();
 let filter='',vig='';
 if(settings.effects){
  if(on('high'))filter+=` saturate(${1.35+Math.sin(t*.7)*.15}) contrast(1.05)`;
  if(on('fruity'))filter+=` hue-rotate(${Math.sin(t*.6)*50}deg)`;
  if(on('glow'))filter+=' brightness(1.25)';
  if(on('fresh'))filter+=' saturate(1.3)';
  if(on('sleepy'))filter+=' brightness(.82) blur(.6px)';
  if(on('calm'))filter+=' blur(.35px)';
  if(on('spicy'))vig='radial-gradient(circle,transparent 45%,rgba(255,60,20,.35))';
  else if(on('sleepy'))vig='radial-gradient(circle,transparent 35%,rgba(0,0,30,.6))';
  else if(on('glow'))vig='radial-gradient(circle,transparent 50%,rgba(150,255,80,.22))';
  else if(on('high'))vig='radial-gradient(circle,transparent 55%,rgba(60,160,80,.25))';
 }
 eyelids.classList.toggle('on',!!(settings.effects&&on('high')));
 canvas.style.filter=filter.trim();vignette.style.background=vig;vignette.style.opacity=vig?1:0;
 const wob=settings.effects&&(on('high')||on('giggly')||on('fizzy'))?1:0;camera.rotation.z=wob*(Math.sin(t*1.3)*.02+(on('giggly')?Math.sin(t*2.7)*.03:0));
 if(settings.effects&&on('spicy'))camera.position.x+=Math.sin(t*40)*.006;
 effectsBox.replaceChildren(...Object.keys(G.effects).map(k=>h('span',{style:{'--c':k==='high'?'#5dff8a':EFFECTS[k]?.color||'#fff'}},(k==='high'?'Lifted':EFFECTS[k]?.name||k)+' '+Math.ceil(G.effects[k]-now)+'s')));
}

// ---------- interactions ----------
function interactables(){
 const S=G.S,list=[];const P=(x,z,r,label,act,y=0)=>list.push({x,z,r,label,act});
 world.potSlots.forEach((v,i)=>P(v.x,v.z,1.5,potLabel(potList()[i]||{},i,potCount()),()=>potAction(i)));
 if(G.coop)for(const rp of G.coop.players.values())if(rp.model)P(rp.model.position.x,rp.model.position.z,2.4,'Give something to '+rp.name,()=>openGift(G,rp));
 P(-14,-23,1.9,'Packing table',()=>openPacking(G));
 P(-14,-18,1.9,'Mixing station',()=>openMixing(G));
 P(-30,-13,2,isNight(clockNow().minute)?'Sleep until morning':'Bed (sleep after 8 PM)',sleep);
 P(-21.5,-12.4,1.6,'Rent: '+money(S.rent)+(S.day>S.rentDue?' (LATE)':' · due day '+S.rentDue),()=>openPhone(G,'rent'));
 for(const k of ['garden','quick','thread']){const c=PLACES[k].clerk;P(c.x,c.z+(c.z<0?2.4:-2.4),3,'Shop at '+PLACES[k].label,()=>openShop(G,k))}
 G.actionInteract?.(P);rides?.interact(P);G.lifeInteract?.(P);G.shopsInteract?.(P);G.homesInteract?.(P);
 for(const n of G.npcs){if(n.w.mode==='flee'||n.dead)continue;const p=n.g.position;P(p.x,p.z,2.4,n.order?'Deliver order to '+n.c.name:(S.customers[n.c.id]?.met?'Sell to '+n.c.name:'Talk to '+n.c.name),()=>talkTo(n))}
 return list;
}
let focused=null;
function updatePrompt(){
 if(G.driving){focused=null;prompt.hidden=false;prompt.replaceChildren(h('kbd',{},'E'),'Get out · W/S gas & brake · A/D steer · Space handbrake');return}
 const p=player.pos,f=player.forward();let best=null,bd=1e9;
 for(const it of interactables()){const dx=it.x-p.x,dz=it.z-p.z,d=Math.hypot(dx,dz);if(d>it.r)continue;const dot=(dx*f.x+dz*f.z)/Math.max(.001,d*Math.hypot(f.x,f.z));if(d>1.1&&dot<.35)continue;if(d<bd){bd=d;best=it}}
 focused=best;prompt.hidden=!best;if(best)prompt.replaceChildren(h('kbd',{},'E'),best.label);
}
async function potAction(i){
 const S=G.S,list=potList();
  if(i>=list.length||!list[i]){G.toast(G.coop?'Empty spot. Buy a Grow Pot at Green Thumb to add one for everyone.':'Buy a Grow Pot at Green Thumb to use this spot.');return}
 const p=list[i];let plan,harvested=null;
 const deny=t=>{sfx.deny();G.toast(t,'bad')};
 if(!p.soil){if(!(S.inv.soil>0))return deny('You need soil. Green Thumb sells it.');plan={kind:'soil',fn:x=>x.soil?undefined:{...x,soil:true}}}
 else if(!p.strain){const cur=hotItems[hotIndex];const seed=cur?.type==='seed'?cur.id:Object.values(STRAINS).map(s=>s.seed).find(id=>S.inv[id]>0);if(!seed)return deny('No seeds. Buy some at Green Thumb.');plan={kind:'plant',seed,fn:x=>x.soil&&!x.strain?{...x,strain:seed.slice(5),progress:0,water:0,quality:1,fert:false}:undefined}}
 else if(p.progress>=1)plan={kind:'harvest',fn:x=>{if(!(x.strain&&x.progress>=1))return undefined;harvested={...x};return {}}};
 else if(p.water<.35)plan={kind:'water',fn:x=>x.strain?{...x,water:1}:undefined};
 else if(!p.fert&&S.inv.fertilizer>0)plan={kind:'fert',fn:x=>x.strain&&!x.fert?{...x,fert:true}:undefined};
 else{G.toast(STRAINS[p.strain].name+': '+Math.round(p.progress*100)+'% grown · water '+Math.round(p.water*100)+'%');return}
 if(G.coop){const res=await G.coop.mutatePot(i,plan.fn);if(res===null){G.toast('Someone else just used that pot.');return}}
 else{const next=plan.fn({...p});if(next===undefined)return;S.pots[i]=next}
 if(plan.kind==='soil'){S.inv.soil--;sfx.plant();G.toast('Added soil.')}
 if(plan.kind==='plant'){S.inv[plan.seed]--;sfx.plant();G.toast('Planted '+STRAINS[plan.seed.slice(5)].name+'. Now water it!')}
 if(plan.kind==='water'){sfx.water();G.toast('Watered.')}
 if(plan.kind==='fert'){S.inv.fertilizer--;sfx.plant();G.toast('Added fertilizer: faster growth, bigger harvest.')}
 if(plan.kind==='harvest'&&harvested){const n=harvestYield(harvested),key=baseProduct(harvested.strain);const prod=S.products[key]||(S.products[key]={bags:0,buds:0,quality:harvested.quality});prod.quality=(prod.quality*prod.buds+harvested.quality*n)/Math.max(1,prod.buds+n);prod.buds+=n;S.stats.grown++;G.addXP(25);sfx.harvest();G.toast('Harvested '+n+' buds of '+STRAINS[harvested.strain].name+'. Pack them at the table.','good')}
 refreshPot(i);G.onInventory();G.save();
}
function talkTo(n){
 const S=G.S;const first=n.c.name.split(' ')[0];
 n.w.goTo(n.g.position,'hold');const face=Math.atan2(player.pos.x-n.g.position.x,player.pos.z-n.g.position.z);n.g.rotation.y=face;
 player.yaw=Math.atan2(-(n.g.position.x-player.pos.x),-(n.g.position.z-player.pos.z));
 const memo=S.customers[n.c.id];
 const line=n.cooldown>0?'I’m good for now. Come back later.':n.order?'Finally! You got my order?':n.wants?'Yo, I was hoping I’d run into someone. You holding?':memo?.met?'Hey, it’s you again. What’s up?':'Uh... hi? Do I know you?';
 openTalk(G,{name:n.c.name,line,options:[n.order?{label:'Here’s your order',note:n.order.qty+'× '+EFFECTS[n.order.effect].name,fn:()=>deliverOrder(n)}:null,n.cooldown>0?null:{label:'Want to buy something?',fn:()=>openOffer(G,n)},{label:'Never mind',fn:()=>n.w.release()}]});
}
function policeNearby(){return G.police.find(o=>o.g.visible&&o.g.position.distanceTo(player.pos)<16)}
function busted(officer,key){
 const S=G.S;const fine=Math.max(20,Math.round(S.money*.25));const lost=S.products[key]?.bags||0;if(S.products[key])S.products[key].bags=0;S.money=Math.max(0,S.money-fine);S.stats.busted++;
 sfx.siren();G.toast('🚨 BUSTED! Fined '+money(fine)+(lost?' and lost '+lost+' bags':'')+'.','bad');officer.w.goTo(player.pos,'go');setTimeout(()=>officer.w.release(),6000);G.onInventory();G.save();
}
G.trySale=(n,key,qty,price,chance)=>{
 if(n.wants)chance=Math.min(.95,chance+.2);
 const S=G.S,memo=S.customers[n.c.id]||(S.customers[n.c.id]={met:false,loyalty:0});n.w.release();
 const cop=policeNearby();if(cop&&Math.random()<.75){busted(cop,key);n.w.goTo(new THREE.Vector3(n.g.position.x*1.4,0,n.g.position.z*1.4),'flee');setTimeout(()=>n.w.release(),5000);return}
 if(Math.random()<chance){const p=S.products[key];p.bags-=qty;const total=price*qty;S.money+=total;S.stats.sold+=qty;S.stats.earned+=total;n.wants=false;G.npcHit?.(n,key);memo.met=true;memo.loyalty=Math.min(5,memo.loyalty+1);G.addXP(12*qty+Math.round(total/10));sfx.cash();G.toast('💵 '+n.c.name+' bought '+qty+' for '+money(total),'good');n.cooldown=40;
  if(memo.loyalty===1)G.message(n.c.name,'That was good. Save my number. I’ll text you when I need more.')}
 else{memo.met=true;memo.loyalty=Math.max(0,memo.loyalty-(price>productValue(key)*1.3?1:0));sfx.deny();G.toast(n.c.name.split(' ')[0]+': "Nah, not at that price."','bad');n.cooldown=25}
 G.onInventory();G.save();
};
function deliverOrder(n){
 const S=G.S,o=n.order;const key=Object.keys(S.products).find(k=>S.products[k].bags>=o.qty&&parseKey(k).effects.includes(o.effect));
 if(!key){n.w.release();n.w.goTo(n.g.position,'hold');G.toast(n.c.name.split(' ')[0]+': "I need '+o.qty+' bags with '+EFFECTS[o.effect].name+'."','bad');return}
 const cop=policeNearby();if(cop&&Math.random()<.6){busted(cop,key);n.order=null;n.w.release();return}
 S.products[key].bags-=o.qty;G.npcHit?.(n,key);S.money+=o.pay;S.stats.sold+=o.qty;S.stats.earned+=o.pay;const memo=S.customers[n.c.id];memo.loyalty=Math.min(5,memo.loyalty+1);G.addXP(20*o.qty+30);sfx.cash();G.toast('📦 Order delivered to '+n.c.name+': +'+money(o.pay),'good');n.order=null;n.w.release();n.cooldown=30;G.onInventory();G.save();
}
function sleep(){
 const S=G.S;if(G.coop&&!G.coop.isHost){G.toast('Only the host can skip the night.');return}if(!isNight(S.minute)){G.toast('You’re not tired yet. Sleep after 8 PM.');return}
 const fade=h('div',{class:'nw-fade'});document.body.append(fade);G.paused=true;G.releaseLock();
 setTimeout(()=>{let mins=((24*60-S.minute)+7*60)%(24*60);if(S.minute<6*60)mins=7*60-S.minute;advance(mins);G.coop?.pushClock(S);fade.classList.add('out');G.toast('☀ Good morning. Day '+S.day+'.','good');setTimeout(()=>{fade.remove();G.paused=false;G.askLock()},1600)},900);
}

// ---------- time ----------
function advance(minutes){
 if(G.coop&&!G.coop.isHost)return;if(G.freezeTime)return;
 const S=G.S;let left=minutes;
 while(left>0){const chunk=Math.min(left,30);left-=chunk;S.minute+=chunk;if(G.coop)G.potTick=(G.potTick||0)+chunk;else for(const p of S.pots)if(p)tickPot(p,chunk*(p.boost||1));
  if(S.minute>=24*60){S.minute-=24*60;S.day++;G.onNewDay?.();if(S.day>S.rentDue){S.rent+=25;G.message('Dex','Rent is late, cuz. Landlord added $25. Pay it from your phone (Rent app).');S.rentDue=S.day}}}
 if(G.coop&&G.potTick>=10){const m=G.potTick;G.potTick=0;potList().forEach((p,i)=>{if(p?.strain&&p.progress<1)G.coop.mutatePot(i,x=>x.strain&&x.progress<1?tickPot({...x},m):undefined)})}
 G.refreshPots();
}
let orderTimer=60;
function updateOrders(dt){
 const S=G.S;orderTimer-=dt;
 for(const n of G.npcs){n.cooldown=Math.max(0,n.cooldown-dt);if(n.order){n.order.left-=dt;if(n.order.left<=0){G.toast(n.c.name.split(' ')[0]+' gave up waiting.','bad');n.order=null;n.w.release()}}}
 if(orderTimer>0)return;orderTimer=70+Math.random()*80;
 const regulars=G.npcs.filter(n=>S.customers[n.c.id]?.loyalty>0&&!n.order&&!n.dead);if(!regulars.length)return;
 const n=regulars[Math.floor(Math.random()*regulars.length)],memo=S.customers[n.c.id];
 const effect=n.c.likes[Math.floor(Math.random()*n.c.likes.length)],qty=1+Math.floor(Math.random()*Math.min(3,1+memo.loyalty));
 const pay=Math.round((34+memo.loyalty*6)*qty*(1+EFFECTS[effect].value));
 const spot=graph.nodes[graph.edges[n.w.at][0]];n.order={effect,qty,pay,left:240};n.w.goTo(new THREE.Vector3(spot[0],0,spot[1]),'go');
 G.message(n.c.name,'Need '+qty+' bag'+(qty>1?'s':'')+' with '+EFFECTS[effect].name+'. Paying '+money(pay)+'. Waiting near the '+(n.c.id.charCodeAt(1)%2?'corner':'crosswalk')+' (purple on your map).');
}

// ---------- quests ----------
const QUESTS=[
 {t:'Walk to Apartment 4B',hint:'Follow the street to the building with the 4B sign.',done:S=>Math.hypot(player.pos.x-PLACES.home.x,player.pos.z-PLACES.home.z)<6},
 {t:'Add soil to a pot and plant a seed',hint:'Look at a pot in your room and press E.',done:S=>potList().some(p=>p?.strain)||S.stats.grown>0},
 {t:'Water your plant',hint:'Press E on the planted pot.',done:S=>potList().some(p=>p?.strain&&p.water>0)||S.stats.grown>0},
 {t:'Wait for it to grow, then harvest',hint:'Explore the city or sleep after 8 PM. The ring turns off when it’s ready.',done:S=>S.stats.grown>0},
 {t:'Pack your buds at the packing table',hint:'One baggie per bud.',done:S=>Object.values(S.products).some(p=>p.bags>0)||S.stats.sold>0},
 {t:'Sell a bag to someone on the street',hint:'Walk up to anyone and press E. Avoid the police.',done:S=>S.stats.sold>0},
 {t:'Buy a mixer at Quick Stop and mix a new product',hint:'Mixers add effects that raise your price.',done:S=>S.stats.mixed>0},
 {t:'Pay your rent',hint:'Use the Rent app on your phone (Tab) or the note by your door.',done:S=>(S.rentPaid||0)>0},
 {t:'Reach Hustler rank',hint:'Sell, deliver orders and keep growing.',done:S=>rankOf(S.xp)>=2},
 {t:'Become the Nova Kingpin',hint:'Starlight OG, 8 pots and a city full of regulars.',done:S=>rankOf(S.xp)>=4}
];
function updateQuest(){const S=G.S;let i=S.quests.step||0;while(i<QUESTS.length&&QUESTS[i].done(S)){i++;if(i>(S.quests.step||0)){G.addXP(15);sfx.level();G.toast('✔ Objective complete','good')}}S.quests.step=i;const q=QUESTS[i];quest.hidden=!q;if(q)quest.replaceChildren(h('small',{},'OBJECTIVE'),h('b',{},q.t),h('div',{style:{color:'#9fb0a4',fontSize:'12.5px',marginTop:'3px'}},q.hint))}

// ---------- main loop ----------
let last=performance.now(),acc=0,fpsT=0,frames=0,stepT=0,menuOrbit=0;
function loop(now){
 requestAnimationFrame(loop);
 const dt=Math.min(.05,(now-last)/1000);last=now;const t=now/1000;
 if(!world){return}
 player.arms.visible=G.mode==='play'&&!G.driving;
 if(G.mode==='menu'||G.mode==='intro'){
  menuOrbit+=dt*.04;
  if(G.mode==='menu')menuSet.update(dt,t,camera,fx);else menuSet.hide();
  sky.update(G.mode==='intro'?23*60+40:22*60+40,{x:camera.position.x,z:camera.position.z},world);
  for(const n of G.npcs)if(!n.dead)n.w.update(dt,t);for(const o of G.police)if(!o.dead)o.w.update(dt,t);moveCars(dt);
  smokeFx(dt,t,G.mode==='intro'?23*60+40:22*60+40);
  post.render(scene,camera);return;
 }
 if(G.mode!=='play')return;
 const S=G.S;
 if(!G.paused){
  acc+=dt;while(acc>=1){acc-=1;advance(1)}
  G.night=isNight(clockNow().minute);
  const mv=G.driving?rides.update(dt):player.update(dt);rides.updateBoard(dt,t);
  if(mv.speed>.5&&player.onGround&&!G.driving&&!G.boarding){stepT-=dt*mv.speed;if(stepT<=0){sfx.step();stepT=1.9}}
  const night=isNight(clockNow().minute);
  if(G.coop&&!G.coop.isHost){applyTargets(G.npcs,G.coop.npcTargets,dt,t);applyTargets(G.police,G.coop.policeTargets,dt,t)}
  else{for(const n of G.npcs)if(!n.dead)n.w.update(dt,t);for(const o of G.police){o.g.visible=!o.night||night||G.wanted>0;if(!o.dead)o.w.update(dt,t)}}
  if(G.coop){const cur=hotItems[hotIndex];G.coop.update(dt,{pos:player.pos,yaw:G.driving?rides.drive.heading+Math.PI:player.yaw,moving:mv.speed>.5,held:rides.heldTag()||(G.smokeUntil>performance.now()/1000&&G.smokeKind)||(cur?.type==='gun'?'gun:'+cur.id:cur?.type)||'',speed:mv.speed,wanted:G.wanted||0,high:G.effects?.high?1:0,npcs:G.npcs,police:G.police,clock:S});updateAvatars(G.coop.players,dt,t);rides.syncRemote(G.coop.players)}
  moveCars(dt);updateOrders(dt);action?.update(dt,t);life?.update(dt,t);shops?.update(dt,t,camera);gps?.update(dt,t);buyerFx?.update(dt,t);updatePrompt();effectState(t);
  if(Math.floor(t)%2===0&&Math.floor(t)!==G._q){G._q=Math.floor(t);updateQuest()}
 }
 if(G.paused)engine.set(null);
 sky.update(clockNow().minute,player.pos,world);
 if(!G.paused)smokeFx(dt,t,clockNow().minute);
 // HUD
 moneyChip.textContent='💵 '+money(S.money)+'   💳 '+money(S.bank||0);const r=rankOf(S.xp);rankChip.replaceChildren(h('span',{class:'rank'},RANKS[r].name.toUpperCase()),h('span',{class:'nw-xp'},h('i',{style:{width:Math.min(100,RANKS[r+1]?(S.xp-RANKS[r].xp)/(RANKS[r+1].xp-RANKS[r].xp)*100:100)+'%'}})));
 const ck=clockNow();clock.replaceChildren(h('b',{},clockText(ck.minute)),h('small',{},'Day '+ck.day+(G.coop?' · '+(G.coop.isHost?'Hosting ':'Session ')+G.coop.code+' · '+(G.coop.players.size+1)+'/4':(S.day>=S.rentDue?' · rent due!':''))));
 stam.firstChild.style.width=player.stamina*100+'%';stam.style.opacity=player.stamina<.98?1:0;
 frames++;fpsT+=dt;if(fpsT>=.5){fpsEl.textContent=Math.round(frames/fpsT)+' FPS';frames=0;fpsT=0}
 post.render(scene,camera);
}
// ---------- smoke ----------
const _v=new THREE.Vector3(),_d=new THREE.Vector3(),_night=new THREE.Color('#4d5670'),_day=new THREE.Color('#ffffff'),_light=new THREE.Color();
let chimT=0,carT=0,tipT=0,hazeT=0,remoteT=0;
function smokeFx(dt,t,minute){
 if(!fx)return;const q=settings.effects?1:.5;fx.quality=q;const cam=camera.position;
 const h=(minute/60)%24,dayAmt=Math.max(0,Math.min(1,Math.sin((h-6)/12*Math.PI)*2.2+.15));
 _light.copy(_night).lerp(_day,dayAmt);
 // inside the apartment the purple grow lights tint the haze
 const inside=G.mode==='play'&&player&&player.pos.x<-10&&player.pos.x>-36&&player.pos.z<-8&&player.pos.z>-28;
 if(inside)_light.setRGB(.95,.85,1);
 chimT-=dt;if(chimT<=0){chimT=.4/q;for(const c of world.chimneys)if(Math.hypot(c.x-cam.x,c.z-cam.z)<150)chimney(fx,c)}
 carT-=dt;if(carT<=0){carT=.16/q;for(const c of world.cars){if(Math.hypot(c.g.position.x-cam.x,c.g.position.z-cam.z)>70)continue;_v.set(.55,.32,-2.2);c.g.localToWorld(_v);exhaust(fx,_v)}}
 for(const n of G.npcs){if(!n.smoker||!n.g.visible||n.dead)continue;n.smokeT-=dt;if(n.smokeT>0)continue;n.smokeT=4+Math.random()*6;
  if(n.w.mode==='flee'||Math.hypot(n.g.position.x-cam.x,n.g.position.z-cam.z)>45)continue;
  _v.set(0,1.95,.3);n.g.localToWorld(_v);_d.set(Math.sin(n.g.rotation.y),0,Math.cos(n.g.rotation.y));puff(fx,_v,_d,{n:Math.round(7*q),size:.55})}
 if(G.mode==='play'&&G.smokeUntil>performance.now()/1000&&player.tip){tipT-=dt;if(tipT<=0){tipT=.07/q;player.tip.getWorldPosition(_v);wisp(fx,_v)}}
 if(inside){hazeT-=dt;if(hazeT<=0){hazeT=.7/q;haze(fx,-31+Math.random()*9.5,1.4+Math.random()*1.2,-25.5+Math.random()*5)}}
 if(G.coop){remoteT-=dt;if(remoteT<=0){remoteT=.12;for(const rp of G.coop.players.values()){const g=rp.model;if(!g||(rp.held!=='smoking'&&rp.held!=='vaping'))continue;
  _v.set(.12,1.75,.35);g.localToWorld(_v);if(rp.held==='smoking')wisp(fx,_v);
  rp.puffT=(rp.puffT||0)-.12;if(rp.puffT<=0){rp.puffT=rp.held==='vaping'?2.2:3.5;_v.set(0,1.95,.35);g.localToWorld(_v);_d.set(Math.sin(g.rotation.y),0,Math.cos(g.rotation.y));puff(fx,_v,_d,{n:rp.held==='vaping'?16:9,size:rp.held==='vaping'?1.1:.6,color:'#f2f2ef'})}}}}
 fx.update(dt,{light:_light,fog:scene.fog});
 // a hazy veil over the screen while lifted
 veil.style.opacity=settings.effects&&G.effects?.high?'1':'0';
}
function moveCars(dt){for(const c of world.cars){c.pos+=c.speed*dt;if(c.pos>115)c.pos=-115;if(c.pos<-115)c.pos=115;const lane=c.lane*Math.sign(c.speed);if(c.axis==='z'){c.g.position.set(c.road+lane,0,c.pos);c.g.rotation.y=c.speed>0?0:Math.PI}else{c.g.position.set(c.pos,0,c.road+lane);c.g.rotation.y=c.speed>0?Math.PI/2:-Math.PI/2}}}

// ---------- input ----------
document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===canvas;if(player)player.enabled=locked&&G.mode==='play';clickToPlay.hidden=locked||G.mode!=='play'||modalOpen();if(!locked&&G.mode==='play'&&!modalOpen()&&!G.paused)openPause(G)});
addEventListener('keydown',e=>{
 if(G.mode!=='play')return;
 if(e.code==='Tab'){e.preventDefault();if(modalOpen())closeModal(G);else openPhone(G);return}
 if(modalOpen()||G.paused)return;
 if(G.driving){if(e.code==='KeyE')rides.exit();return}
 if(e.code==='KeyB'){rides.toggleBoard();return}
 if(e.code==='KeyE'&&focused){sfx.click();focused.act();return}
 if(/^Digit[1-9]$/.test(e.code)){const want=Math.min(Number(e.code.slice(5))-1,Math.max(0,hotItems.length-1));hotIndex=want===hotIndex?-1:want;paintHotbar()}
 if(e.code==='KeyF')useItem();
 if(e.code==='KeyQ')G.punch?.();
 if(e.code==='F8'){e.preventDefault();if(G.isOwner)openAdmin(G,{h,money,openModal,closeModal,sfx});return}
 if(e.code==='KeyR'&&G.heldGun)action?.reload(G.heldGun);
 if(e.code==='KeyT'&&G.coop){e.preventDefault();openChat(G)}
});
canvas.addEventListener('mousedown',e=>{if(G.mode==='play'&&document.pointerLockElement===canvas&&e.button===0){if(G.heldGun)action?.setMouse(true);useItem()}});
G.onAmmo=()=>hotItems.forEach((it,i)=>{if(it.type==='gun'){const q=hotbar.children[i]?.querySelector('.q');if(q)q.textContent=G.S.inv.ammo||0}});
addEventListener('wheel',e=>{if(G.mode!=='play'||!hotItems.length||modalOpen())return;hotIndex=(hotIndex+(e.deltaY>0?1:-1)+hotItems.length)%hotItems.length;paintHotbar()},{passive:true});

// ---------- menu ----------
let menuEl;
G.toMenu=()=>{if(G.coop){G.coop.leave();endCoop()}G.mode='menu';hud.hidden=true;clickToPlay.hidden=true;canvas.style.filter='';vignette.style.opacity=0;camera.fov=settings.fov;camera.rotation.z=0;showMenu()};
function netWorth(s){let v=s.money||0;for(const p of Object.values(s.products||{}))v+=(p.bags||0)*30;return Math.round(v)}
const ago=t=>{if(!t)return '—';const m=Math.round((Date.now()-t)/60000);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' days ago'};
function showMenu(){
 menuEl?.remove();const all=readSlots();const latest=loadSave();const embedded=parent!==window;
 menuSet?.setLook(latest?{...G.outfitLookFor(latest)}:{skin:'#e2b48c',hair:'#2b1d14',shirt:'#b8452f',stripe:'#2a1210',pants:'#26324a',hat:'beanie',hatColor:'#3a7d4f'});
 const item=(label,fn,dis)=>h('button',{class:'nw-mi',disabled:dis||undefined,onclick:()=>{resumeAudio();sfx.click();fn()}},label);
 const overlay=h('div',{class:'nw-mpanel-wrap',hidden:true,onclick:e=>{if(e.target===overlay)closePanel()}});
 const closePanel=()=>{overlay.hidden=true;overlay.replaceChildren()};
 const openPanel=(title,...kids)=>{overlay.replaceChildren(h('div',{class:'nw-mpanel'},h('h2',{},title),...kids));overlay.hidden=false};
 const slotRow=(i,s,onPick)=>h('button',{class:'nw-slotrow'+(s?'':' empty'),onclick:()=>{sfx.click();onPick(i,s)}},h('i',{},String(i)),
  s?h('div',{class:'meta'},h('b',{},s.name||'Island '+i),h('span',{},'Net worth ',h('em',{},money(netWorth(s)))),h('span',{},'Day '+s.day),h('span',{},'Last played ',h('em',{class:'dim'},ago(s.lastPlayed)))):h('div',{class:'meta'},h('span',{class:'dim'},'Empty slot')));
 const cont=()=>openPanel('Continue',h('div',{class:'nw-slotlist'},...all.map((s,k)=>slotRow(k+1,s,(i,s)=>{if(s)startGame(s)}))));
 const fresh=()=>openPanel('Choose a save slot',h('div',{class:'nw-slotlist'},...all.map((s,k)=>slotRow(k+1,s,(i,s)=>{
  if(s&&!confirm('Overwrite '+(s.name||'this save')+'?'))return;
  const name=h('input',{class:'nw-name',maxlength:'24',value:'Island '+i,'aria-label':'Save name'});
  openPanel('Name your save',name,h('div',{class:'nw-actions'},h('button',{class:'nw-b',onclick:fresh},'Back'),h('button',{class:'nw-b go',onclick:()=>{const n=newSave();n.slot=i;n.name=name.value.trim().slice(0,24)||'Island '+i;n.created=Date.now();startGame(n)}},'Start')));setTimeout(()=>name.select(),30)}))));
 menuEl=h('div',{class:'nw-menu2'},
  h('div',{class:'nw-lobby'},h('span',{class:'t'},'Lobby ('+(G.coop?G.coop.players.size+1:1)+'/4)'),
   h('div',{class:'row'},h('button',{class:'inv',onclick:()=>{sfx.click();openFriends(G)}},'Invite friends',h('b',{},'›')),
    h('span',{class:'seat me',title:'You',html:'<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><circle cx="12" cy="8" r="4.2"/><path d="M3.5 21c.8-4.6 4.2-7 8.5-7s7.7 2.4 8.5 7z"/></svg>'}),...[0,1,2].map(()=>h('button',{class:'seat',title:'Invite a friend',onclick:()=>{sfx.click();openFriends(G)}},'+')))),
  h('div',{class:'nw-side'},
   h('div',{class:'nw-title'},h('b',{},'NOVA WEED'),h('small',{},'Island update · v2.1')),
   h('nav',{class:'nw-mlist'},
    item('Continue',cont,!all.some(Boolean)),
    item('New Game',fresh),
    item('Play Online',()=>openCoopMenu(G)),
    item('Settings',()=>openSettings(G)),
    item('Credits',()=>openCredits(G)),
    embedded?item('Back to Nova',()=>parent.postMessage({novaAction:'closeApp'},location.origin)):null)),
  h('aside',{class:'nw-news'},h('b',{},'What’s on the island'),h('ul',{},...['6 strains and endless mixes to name','Houses with greenhouses to buy','Dealers who sell for you','Guns, a wanted level and a 9 PM curfew','Cars, a moped and skateboards','Businesses for laundering money','Public and private online sessions'].map(t=>h('li',{},t)))),
  h('div',{class:'nw-keys'},h('kbd',{},'Esc'),'Back'),
  overlay);
 addEventListener('keydown',function esc(e){if(!menuEl?.isConnected){removeEventListener('keydown',esc);return}if(e.key==='Escape')closePanel()});
 document.body.append(menuEl);
}

// ---------- intro (original opening) ----------
async function playIntro(){
 G.mode='intro';menuEl?.remove();
 const cine=h('div',{class:'nw-cine'}),text=h('div',{class:'nw-cine-text'}),title=h('div',{class:'nw-cine-title'},logo()),fade=h('div',{class:'nw-fade'});
 let skipped=false;const skip=h('button',{class:'nw-skip',onclick:()=>{skipped=true}},'Skip ›');
 cine.append(text,title);document.body.append(fade,cine,skip);
 const wait=ms=>new Promise(r=>{const end=performance.now()+ms;const tick=()=>skipped||performance.now()>=end?r():requestAnimationFrame(tick);tick()});
 const say=async(line,ms=2600)=>{if(skipped)return;text.textContent='';for(const ch of line){if(skipped)break;text.textContent+=ch;await wait(26)}await wait(ms)};
 // bus ride down the main avenue at night
 let ride=0;const path=t=>new THREE.Vector3(2.2,2.4,-110+t*100);
 const rideLoop=()=>{if(G.mode!=='intro')return;ride=Math.min(1,ride+.0016);const p=path(ride);camera.position.copy(p);camera.lookAt(p.x-6,2.2,p.z+12);requestAnimationFrame(rideLoop)};rideLoop();
 await wait(300);fade.classList.add('out');
 await say('Nova City. 11:40 PM.');
 await say('You came with $150, two seeds, and one bag over your shoulder.');
 await say('Your cousin Dex says this city has room for someone who works hard.',2200);
 if(!skipped){sfx.buzz();text.innerHTML='';text.append(h('span',{style:{color:'#5dff8a'}},'📱 Dex: '),'Apartment 4B, right by the bus stop. Door’s open. Rent is $100, due in 3 days. Don’t make me regret this.');await wait(4200)}
 text.textContent='';title.classList.add('show');await wait(2600);
 fade.classList.remove('out');await wait(900);
 cine.remove();skip.remove();setTimeout(()=>{fade.classList.add('out');setTimeout(()=>fade.remove(),1700)},200);
}

// ---------- start ----------
async function startGame(save,coop=null){
 G.S=save;G.effects={};menuSet.hide();homes?.setup();save.names=save.names||{};setProductNames(save.names);if(coop)beginCoop(coop);if(G.driving)rides.exit();if(G.boarding)rides.toggleBoard(false);rides.load();
 if(!save.introSeen&&!coop){await playIntro();save.introSeen=true;G.message('Dex','Seeds and soil are on the table. Pots are by the window. Water them or they’ll die on you.')}
 menuEl?.remove();
 G.mode='play';hud.hidden=false;G.paused=false;
 if(coop)player.teleport(-21.5+(Math.random()-.5)*3,-9,Math.PI);else if(G.homeSpawn?.())player.teleport(G.homeSpawn().x,G.homeSpawn().z,G.homeSpawn().yaw);else if(!save.pos)player.teleport(PLACES.spawn.x,PLACES.spawn.z,Math.PI);else player.teleport(save.pos.x,save.pos.z,save.pos.yaw||0);
 camera.fov=settings.fov;camera.updateProjectionMatrix();
 G.applyOutfit();G.refreshPots();G.onInventory();updateQuest();startAmbience();
 clickToPlay.hidden=false;
 clearInterval(G.autosave);G.autosave=setInterval(()=>{if(G.mode==='play'){G.S.pos={x:player.pos.x,z:player.pos.z,yaw:player.yaw};G.save()}},15000);
}

// ---------- co-op ----------
function beginCoop(coop){
 G.coop=coop;
 coop.on('event',(rp,ev)=>action?.remoteEvent(rp,ev))
  .on('join',rp=>{spawnAvatar(scene,rp);sfx.buzz();G.toast('👋 '+rp.name+' joined the session','good')})
  .on('look',rp=>spawnAvatar(scene,rp))
  .on('leave',rp=>{if(rp.model)scene.remove(rp.model);G.toast(rp.name+' left the session')})
  .on('pots',list=>{if(coop.isHost)G.S.pots=list.map(p=>({...p}));G.refreshPots()})
  .on('chat',m=>{if(m.uid!==coop.me)sfx.click();G.toast('💬 '+m.name+': '+m.text)})
  .on('gift',g=>{const S=G.S;if(g.money>0){S.money+=Math.min(100000,Math.floor(g.money));G.toast('🎁 '+g.name+' sent you '+money(g.money),'good')}if(g.key&&g.bags>0){const p=S.products[g.key]||(S.products[g.key]={bags:0,buds:0,quality:g.quality||1});p.bags+=Math.min(100,Math.floor(g.bags));G.toast('🎁 '+g.name+' gave you '+g.bags+'× '+productName(g.key),'good')}sfx.cash();G.onInventory();G.save()})
  .on('closed',()=>{G.toast('The host ended the session.','bad');endCoop();G.save();G.toMenu()})
  .on('kicked',()=>{G.toast('The host removed you from the session.','bad');endCoop();G.save();G.toMenu()});
 for(const rp of coop.players.values())spawnAvatar(scene,rp);
}
function endCoop(){const c=G.coop;if(!c)return;for(const rp of c.players.values())if(rp.model)scene.remove(rp.model);G.coop=null;G.refreshPots()}
G.endSession=async()=>{if(!G.coop)return;await G.coop.leave();endCoop();G.toast('You left the session.')};
let net=null;
G.net=async()=>{if(net?.signedIn)return net;const mod=await import('../novaflip/nova.mjs');net=await mod.connect();G.watchFriends=mod.watchFriends;return net};
G.hostSession=async(save,opts={})=>{const n=await G.net();if(!n.signedIn)throw Error('Sign in to Nova to play with friends.');const look=(G.S=save,G.outfitLook());const coop=await Coop.create(n,{me:n.user.uid,name:n.profile.name||'Player',look,pots:save.pots,clock:{minute:save.minute,day:save.day},visibility:opts.visibility||'private'});await startGame(save,coop);return coop};
G.joinSession=async(code,save)=>{const n=await G.net();if(!n.signedIn)throw Error('Sign in to Nova to play with friends.');G.S=save;const coop=await Coop.join(n,code,{me:n.user.uid,name:n.profile.name||'Player',look:G.outfitLook()});await new Promise(r=>setTimeout(r,600));await startGame(save,coop);return coop};
G.loadSave=loadSave;G.newSave=newSave;G.watchLobbies=(cb,err)=>{let stop=()=>{};G.net().then(n=>{stop=Coop.watchLobbies(n,cb,err)}).catch(()=>err?.());return ()=>stop()};

// ---------- boot ----------
(async()=>{
 setVolume(settings.volume);
 try{await build()}catch(e){console.error(e);loading.querySelector('.nw-load-text').textContent='Nova Weed could not start: '+(e.message||e)+'. Your browser needs WebGL.';return}
 G.applySettings();
 G.mode='menu';showMenu();requestAnimationFrame(loop);
 {let code=new URLSearchParams(location.search).get('room');try{code=code||sessionStorage.getItem('novaweed-join');sessionStorage.removeItem('novaweed-join')}catch{}if(code)joinFromInvite(code)}
 addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.novaAction==='novaWeedJoin'&&e.data.code&&G.mode==='menu')joinFromInvite(e.data.code)});
function joinFromInvite(code){G.toast('Joining session '+code+'…');G.joinSession(code,G.loadSave()||G.newSave()).catch(e=>{G.toast(e.message||'Could not join.','bad');openCoopMenu(G,code)})}
 setTimeout(()=>{loading.classList.add('done');setTimeout(()=>loading.remove(),900)},300);
})();
addEventListener('beforeunload',()=>{G.coop?.leave();if(G.mode==='play'&&G.S){G.S.pos={x:player.pos.x,z:player.pos.z,yaw:player.yaw};G.save()}});
