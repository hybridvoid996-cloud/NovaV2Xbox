// Nova Weed street life: bank card + ATMs, money laundering fronts, the 9 PM curfew,
// fists and NPCs that fight back, pickpocketing, and legit part-time careers.
import * as THREE from '/vendor/three/three.module.min.js';
import {animatePerson} from './people.mjs?v=15';
import {productValue,productName} from './economy.mjs?v=15';
export const CREW={rico:{name:'Rico',price:1500,rate:2,rank:1,desc:'Sells 2 bags an hour around the motel.'},tasha:{name:'Tasha',price:4000,rate:4,rank:2,desc:'Sells 4 bags an hour downtown.'},omar:{name:'Big Omar',price:9000,rate:7,rank:3,desc:'Moves 7 bags an hour across the island.'}};

export const BUSINESSES={
 laundromat:{name:'Suds Laundromat',price:2500,cap:800,fee:.1,rank:1},
 carwash:{name:'Shine Car Wash',price:6000,cap:2000,fee:.12,rank:2},
 tacos:{name:'Tide Taco Stand',price:12000,cap:5000,fee:.15,rank:3}
};
export const CAREERS={
 cashier:{name:'Cashier at Quick Stop',place:'quick',pay:70,rank:0,from:9,to:17},
 stocker:{name:'Stock hand at Green Thumb',place:'garden',pay:85,rank:1,from:8,to:16},
 tailor:{name:'Shop floor at Thread Co.',place:'thread',pay:100,rank:2,from:10,to:18}
};
const ATM_DAILY=1000;
const CURFEW_FROM=21*60,CURFEW_TO=6*60;
export const isCurfew=m=>{m=((m%1440)+1440)%1440;return m>=CURFEW_FROM||m<CURFEW_TO};

function atmModel(){
 const g=new THREE.Group();const blue=new THREE.MeshStandardMaterial({color:'#2463b8',roughness:.45,metalness:.2}),dark=new THREE.MeshStandardMaterial({color:'#1b1e24',roughness:.5}),steel=new THREE.MeshStandardMaterial({color:'#c9ced6',metalness:.7,roughness:.3});
 const body=new THREE.Mesh(new THREE.BoxGeometry(.85,1.75,.6),blue);body.position.y=.875;
 const face=new THREE.Mesh(new THREE.BoxGeometry(.7,.95,.08),dark);face.position.set(0,1.05,.3);
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.46,.3),new THREE.MeshStandardMaterial({color:'#9fe8ff',emissive:'#3fb7e8',emissiveIntensity:.9}));screen.position.set(0,1.3,.345);
 const pad=new THREE.Mesh(new THREE.BoxGeometry(.3,.2,.06),steel);pad.position.set(-.08,.98,.36);pad.rotation.x=-.4;
 const slot=new THREE.Mesh(new THREE.BoxGeometry(.22,.03,.04),new THREE.MeshStandardMaterial({color:'#ffd166',emissive:'#ffb300',emissiveIntensity:.6}));slot.position.set(.2,1.0,.35);
 const head=new THREE.Mesh(new THREE.BoxGeometry(.9,.24,.66),blue);head.position.y=1.87;
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(.6,.14),new THREE.MeshStandardMaterial({map:signTex('ATM'),emissive:'#ffffff',emissiveMap:signTex('ATM'),emissiveIntensity:.8}));sign.position.set(0,1.87,.335);
 g.add(body,face,screen,pad,slot,head,sign);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g;
}
const TEX={};function signTex(text){if(TEX[text])return TEX[text];const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.fillStyle='#16407a';x.fillRect(0,0,256,64);x.fillStyle='#fff';x.font='bold 44px Segoe UI, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,128,34);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return TEX[text]=t}

export function createLife(G,{scene,camera,player,sfx,h,hud,money,openModal,closeModal,colliders}){
 const S=()=>G.S;
 const ensure=()=>{const s=S();s.bank??=0;s.atm??={day:s.day,used:0};if(s.atm.day!==s.day)s.atm={day:s.day,used:0};s.biz??={};s.launder??=[];s.career??=null;return s};
 // ---------- ATMs ----------
 const ATMS=[{x:38.5,z:8.5,ry:Math.PI},{x:-38.5,z:8.5,ry:Math.PI},{x:9,z:-8.5,ry:0},{x:-72,z:-51.4,ry:Math.PI}];
 for(const a of ATMS){const m=atmModel();m.position.set(a.x,0,a.z);m.rotation.y=a.ry;scene.add(m);colliders?.push({minX:a.x-.45,maxX:a.x+.45,minZ:a.z-.35,maxZ:a.z+.35,h:2})}
 function openATM(){
  const s=ensure();const body=h('div');
  const paint=()=>{const left=Math.max(0,ATM_DAILY-s.atm.used);body.replaceChildren(
   h('div',{class:'nw-atm-bal'},h('div',{},h('small',{},'CASH'),h('b',{},money(s.money))),h('div',{},h('small',{},'BANK'),h('b',{class:'card'},money(s.bank)))),
   h('p',{class:'sub'},'Deposit limit today: '+money(left)+' of '+money(ATM_DAILY)+'. Bigger amounts need a business to launder through (phone › Bank).'),
   h('div',{class:'nw-atm-grid'},...[20,100,500].map(n=>h('button',{class:'nw-b',disabled:(s.money<n||left<n)||undefined,onclick:()=>{dep(n);paint()}},'Deposit '+money(n))),
    h('button',{class:'nw-b go',disabled:(!s.money||!left)||undefined,onclick:()=>{dep(Math.min(s.money,left));paint()}},'Deposit max'),
    ...[20,100,500].map(n=>h('button',{class:'nw-b',disabled:s.bank<n||undefined,onclick:()=>{wd(n);paint()}},'Withdraw '+money(n))),
    h('button',{class:'nw-b go',disabled:!s.bank||undefined,onclick:()=>{wd(s.bank);paint()}},'Withdraw all')),
   h('div',{class:'nw-actions'},h('button',{class:'nw-b',onclick:()=>closeModal(G)},'Done')))};
  const dep=n=>{n=Math.floor(n);if(n<=0)return;s.money-=n;s.bank+=n;s.atm.used+=n;sfx.cash();G.save()};
  const wd=n=>{n=Math.floor(n);if(n<=0)return;s.bank-=n;s.money+=n;sfx.cash();G.save()};
  paint();openModal(G,h('div',{class:'nw-panel nw-atm'},h('h2',{},'Nova Bank ATM'),body));
 }
 // ---------- laundering ----------
 G.bankView=(body,repaint)=>{const s=ensure();const rank=G.rank();
  body.append(h('div',{class:'nw-atm-bal'},h('div',{},h('small',{},'CASH'),h('b',{},money(s.money))),h('div',{},h('small',{},'BANK'),h('b',{class:'card'},money(s.bank)))));
  const pend=s.launder.reduce((a,x)=>a+x.amount,0);
  if(pend)body.append(h('p',{class:'sub'},money(pend)+' is being laundered. It lands in your bank tomorrow morning.'));
  body.append(h('p',{class:'sub',style:{marginTop:'10px'}},'Businesses turn dirty cash into bank money, minus a cut.'));
  body.append(h('div',{class:'nw-list'},...Object.entries(BUSINESSES).map(([id,b])=>{const own=s.biz[id];const used=s.launder.filter(x=>x.biz===id).reduce((a,x)=>a+x.amount,0);const room=Math.max(0,b.cap-used);
   const btn=own?h('button',{class:'nw-b go',disabled:(!s.money||!room)||undefined,onclick:()=>{const n=Math.min(s.money,room);s.money-=n;s.launder.push({biz:id,amount:n,fee:b.fee});sfx.cash();G.toast('Laundering '+money(n)+' through '+b.name+'.','good');G.save();repaint()}},'Launder '+money(Math.min(s.money,room)))
    :h('button',{class:'nw-b go',disabled:(b.rank>rank||s.money+s.bank<b.price)||undefined,onclick:()=>{pay(b.price);s.biz[id]=true;sfx.level();G.toast('You own '+b.name+' now.','good');G.save();repaint()}},b.rank>rank?'🔒':money(b.price));
   return h('div',{class:'nw-row'},h('span',{class:'ic'},id==='laundromat'?'🧺':id==='carwash'?'🚿':'🌮'),h('div',{class:'grow'},h('b',{},b.name),h('small',{},own?'Launders up to '+money(b.cap)+'/day · '+Math.round(b.fee*100)+'% cut · '+money(room)+' left today':'Launders '+money(b.cap)+'/day · '+Math.round(b.fee*100)+'% cut')),btn)})));
 };
 // pay from cash first, then the bank card
 const pay=n=>{const s=ensure();const c=Math.min(s.money,n);s.money-=c;s.bank-=n-c};
 G.payAny=(n)=>{const s=ensure();if(s.money+s.bank<n)return false;pay(n);return true};

 // ---------- new day ----------
 G.onNewDay=()=>{const s=ensure();
  if(s.launder.length){let total=0;for(const l of s.launder)total+=Math.round(l.amount*(1-l.fee));s.bank+=total;s.launder=[];G.message('Nova Bank','Deposit received: '+money(total)+' from your businesses.')}
  if(s.career?.status==='applied'&&s.day>s.career.day){s.career.status='hired';const c=CAREERS[s.career.id];G.message(c.name.split(' at ')[1]||'Manager','You got the job! Shifts are '+fmtH(c.from)+'–'+fmtH(c.to)+'. Come by and clock in. Pay goes to your bank.')}
  if(s.career)s.career.shiftDay=s.career.shiftDay===s.day?s.day:s.career.shiftDay;
 };
 const fmtH=h=>((h+11)%12+1)+(h<12?' AM':' PM');

 // ---------- curfew ----------
 const atHome=()=>{const p=player.pos;return p.x<-10&&p.x>-36&&p.z<-8&&p.z>-28};
 let warned=-1,seenT=0;
 const curfewChip=h('div',{class:'nw-curfew',hidden:true},'CURFEW · get home');hud.append(curfewChip);
 G.arrest=(why)=>{
  const s=ensure();if(G.arresting)return;G.arresting=true;G.curfewChase=false;G.wanted=0;
  let lost=0;for(const p of Object.values(s.products))if(p.bags){lost+=p.bags;p.bags=0}
  const fine=Math.min(s.money+s.bank,Math.max(50,Math.round((s.money+s.bank)*.2)));pay(fine);s.stats.busted++;
  if(G.driving)G.rides?.exit();
  const fade=h('div',{class:'nw-fade nw-wasted'},h('b',{style:{color:'#5aa0ff'}},'ARRESTED'),h('small',{},(why==='curfew'?'Out past curfew. ':'')+'You spent a day in Nova County lockup.'),h('small',{},'Fine '+money(fine)+(lost?' · '+lost+' bags taken':'')));
  document.body.append(fade);G.paused=true;sfx.siren();
  setTimeout(()=>{s.day+=1;s.minute=7*60;if(!G.coop||G.coop.isHost){G.onNewDay();G.coop?.pushClock(s)}for(const o of G.police)if(!o.dead)o.w.release();
   player.teleport(G.PLACES.home.door.x,G.PLACES.home.door.z+1.5,Math.PI);fade.classList.add('out');G.paused=false;G.arresting=false;G.onInventory();G.save();setTimeout(()=>fade.remove(),1700)},2600);
 };
 function curfew(dt){
  const m=G.clockNow().minute,on=isCurfew(m),home=atHome();
  const soon=!on&&m>=CURFEW_FROM-30&&m<CURFEW_FROM;
  if(soon&&warned!==G.S.day){warned=G.S.day;G.toast('⏰ Curfew starts at 9 PM. Be home or the police will pick you up.','bad')}
  curfewChip.hidden=!(on&&!home);
  if(!on||home){if(G.curfewChase&&G.wanted<=1&&home){G.curfewChase=false;G.wanted=0;G.toast('You made it home.','good');for(const o of G.police)if(!o.dead)o.w.release()}return}
  // a cop who can see you starts a curfew chase
  const cop=G.police.find(o=>!o.dead&&o.g.visible&&o.g.position.distanceTo(player.pos)<20);
  if(cop){seenT+=dt;if(seenT>.8&&!G.curfewChase){G.curfewChase=true;if(G.wanted<1)G.wanted=1;sfx.siren();G.toast('🚨 Curfew violation! Run home or get arrested.','bad')}}else seenT=0;
 }

 // ---------- fists + brawls ----------
 let punchCd=0;
 const fwd=new THREE.Vector3();
 function nearestInFront(range=2.1){let best=null,bd=range;fwd.copy(player.forward()).setY(0).normalize();
  for(const tg of G.action.targets()){const p=tg.g.position,dx=p.x-player.pos.x,dz=p.z-player.pos.z,d=Math.hypot(dx,dz);if(d>bd)continue;if((dx*fwd.x+dz*fwd.z)/Math.max(.01,d)<.55)continue;bd=d;best=tg}return best}
 G.punch=()=>{
  const now=performance.now()/1000;if(now<punchCd||G.paused||G.driving)return;punchCd=now+.36;player.punch();sfx.punch?.();
  const tg=nearestInFront();if(!tg)return;
  sfx.hit?.();G.action.damage(tg,20,{melee:true});
  // knock them back a little
  const p=tg.g.position;p.x+=fwd.x*.35;p.z+=fwd.z*.35;
  if(!tg.dead&&G.npcs.includes(tg)&&!(G.coop&&!G.coop.isHost)){if(tg.brawl==null&&Math.random()<.6){tg.brawl={t:22,cd:.6};G.toast(tg.c.name.split(' ')[0]+' wants to fight!','bad')}else if(!tg.brawl)tg.w.goTo(new THREE.Vector3(p.x+fwd.x*30,0,p.z+fwd.z*30),'flee')}
 };
 function brawlers(dt,t){
  for(const n of G.npcs){const b=n.brawl;if(!b)continue;
   if(n.dead||b.t<=0){n.brawl=null;if(!n.dead)n.w.release();continue}
   b.t-=dt;const p=n.g.position,d=p.distanceTo(player.pos);
   if(d>25||(n.hp??100)<30){n.brawl=null;n.w.goTo(new THREE.Vector3(p.x*1.3,0,p.z*1.3),'flee');continue}
   n.g.rotation.y=Math.atan2(player.pos.x-p.x,player.pos.z-p.z);
   if(d>1.3){n.w.goTo(player.pos,'chase')}
   else{n.w.goTo(p,'hold');b.cd-=dt;
    // wind up and swing: right arm punches forward
    const r=n.g.userData.rig;const k=Math.max(0,Math.min(1,1-b.cd/.6));if(r){r.rArm.rotation.x=-1.5*Math.sin(k*Math.PI);r.lArm.rotation.x=-.9}
    if(b.cd<=0){b.cd=.9+Math.random()*.5;if(Math.random()<.65){G.action.hurtPlayer(7+Math.round(Math.random()*5));sfx.hit?.()}}}
  }
 }

 // ---------- pickpocketing ----------
 let picking=null;
 const LOOT=[['cash'],['cash'],['cash'],['drink_cola'],['drink_energy'],['ammo'],['seed_kush'],['baggie']];
 function startPick(n){
  if(picking||n.pickedAt>performance.now()/1000-120)return G.toast('Nothing left in their pockets.');
  n.w.goTo(n.g.position,'hold');let round=0,hits=0,pos=0,dir=1;const zone={a:.35+Math.random()*.3,w:.16};
  const bar=h('div',{class:'nw-pick'},h('small',{},'PICKPOCKET · press Space in the green'),h('div',{class:'track'},h('i',{class:'zone'}),h('i',{class:'mark'})),h('div',{class:'dots'}));
  document.body.append(bar);const z=bar.querySelector('.zone'),mk=bar.querySelector('.mark'),dots=bar.querySelector('.dots');
  const setZone=()=>{zone.a=.1+Math.random()*.7;zone.w=.18-round*.03;z.style.left=zone.a*100+'%';z.style.width=zone.w*100+'%';dots.replaceChildren(...[0,1,2].map(i=>h('span',{class:i<round?(i<hits?'ok':'bad'):''})))};setZone();
  const end=ok=>{removeEventListener('keydown',key,true);bar.remove();picking=null;n.pickedAt=performance.now()/1000;
   if(ok){const [what]=LOOT[Math.floor(Math.random()*LOOT.length)];const s=S();if(what==='cash'){const c=5+Math.floor(Math.random()*45);s.money+=c;G.toast('🤏 Lifted '+money(c),'good');sfx.cash()}else{const q=what==='ammo'?6:what==='baggie'?3:1;s.inv[what]=(s.inv[what]||0)+q;G.toast('🤏 Lifted '+(q>1?q+'× ':'')+what.replace(/_/g,' '),'good');sfx.bag();G.onInventory()}G.addXP(4);n.w.release();G.save()}
   else{sfx.deny();G.toast(n.c.name.split(' ')[0]+': "Hey! Get your hands off me!"','bad');if(G.police.some(o=>!o.dead&&o.g.visible&&o.g.position.distanceTo(player.pos)<25)&&G.wanted<1){G.wanted=1;G.toast('🚨 Wanted: ★ · theft','bad')}
    if(Math.random()<.5)n.brawl={t:18,cd:.4};else n.w.goTo(new THREE.Vector3(n.g.position.x*1.4,0,n.g.position.z*1.4),'flee')}};
  const key=e=>{if(e.code!=='Space'&&e.code!=='KeyE')return;e.preventDefault();e.stopPropagation();const inZone=pos>=zone.a&&pos<=zone.a+zone.w;hits+=inZone?1:0;round++;
   if(!inZone)return end(false);if(round>=3)return end(true);setZone()};
  addEventListener('keydown',key,true);
  picking={tick(dt){pos+=dir*dt*(.9+round*.35);if(pos>1){pos=1;dir=-1}if(pos<0){pos=0;dir=1}mk.style.left=pos*100+'%';if(n.g.position.distanceTo(player.pos)>2.4)end(false)}};
 }

 // ---------- careers ----------
 G.careersView=(body,repaint)=>{const s=ensure();const rank=G.rank();
  body.append(h('p',{class:'sub',style:{marginTop:'10px'}},'Careers · steady pay into your bank'));
  body.append(h('div',{class:'nw-list'},...Object.entries(CAREERS).map(([id,c])=>{const mine=s.career?.id===id;const st=mine?s.career.status:null;
   const btn=mine?h('button',{class:'nw-b',onclick:()=>{s.career=null;G.toast('You quit.');G.save();repaint()}},st==='hired'?'Quit':'Withdraw')
    :h('button',{class:'nw-b go',disabled:(c.rank>rank||s.career)||undefined,onclick:()=>{s.career={id,status:'applied',day:s.day};G.toast('Application sent. You’ll hear back tomorrow.','good');G.save();repaint()}},c.rank>rank?'🔒':'Apply');
   return h('div',{class:'nw-row'+(mine?' sel':'')},h('span',{class:'ic'},'🧾'),h('div',{class:'grow'},h('b',{},c.name),h('small',{},money(c.pay)+' per shift · '+fmtH(c.from)+'–'+fmtH(c.to)+(st==='applied'?' · applied':st==='hired'?' · hired':''))),btn)})));
 };
 let shift=null;
 function startShift(c){
  const s=ensure();const place=G.PLACES[c.place].clerk;const base=new THREE.Vector3(place.x,0,place.z+(place.z<0?3.5:-3.5));
  shift={c,left:5,boxes:[]};const m=new THREE.MeshStandardMaterial({color:'#b98a52',roughness:.8});
  for(let i=0;i<5;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.5,.4,.4),m);b.position.set(base.x+(i-2)*1.6,.2,base.z+(i%2?1.2:-.2));b.castShadow=true;scene.add(b);shift.boxes.push(b)}
  G.toast('Clocked in. Stock the 5 boxes.','good');
 }
 G.lifeInteract=P=>{const s=ensure();
  for(const a of ATMS)P(a.x+Math.sin(a.ry)*.9,a.z+Math.cos(a.ry)*.9,1.6,'Use ATM',openATM);
  // pickpocket: from behind, close
  for(const n of G.npcs){if(n.dead||n.brawl||n.w.mode==='flee')continue;const p=n.g.position,dx=player.pos.x-p.x,dz=player.pos.z-p.z,d=Math.hypot(dx,dz);if(d>1.6)continue;
   const behind=(dx*Math.sin(n.g.rotation.y)+dz*Math.cos(n.g.rotation.y))/Math.max(.01,d)<-.3;if(behind)P(p.x,p.z,1.7,'Pickpocket '+n.c.name.split(' ')[0],()=>startPick(n))}
  // clock in
  const c=s.career?.status==='hired'?CAREERS[s.career.id]:null;
  if(c&&!shift){const hr=G.clockNow().minute/60;const pl=G.PLACES[c.place].clerk;const ok=hr>=c.from&&hr<c.to&&s.career.shiftDay!==s.day;P(pl.x+3.2,pl.z+(pl.z<0?2.4:-2.4),1.6,ok?'Clock in ('+c.name.split(' at ')[0]+')':s.career.shiftDay===s.day?'Shift done for today':'Shift is '+fmtH(c.from)+'–'+fmtH(c.to),()=>{if(ok)startShift(c)})}
  if(shift)for(const b of shift.boxes)if(b.parent)P(b.position.x,b.position.z,1.4,'Stock box',()=>{scene.remove(b);sfx.bag();shift.left--;if(shift.left<=0){const s2=ensure();s2.bank+=shift.c.pay;s2.career.shiftDay=s2.day;G.addXP(15);sfx.cash();G.toast('Shift done: +'+money(shift.c.pay)+' to your bank','good');shift=null;G.save()}else G.toast(shift.left+' boxes left')});
 };

 // dealers sell from the stock you hand them, at market value, and keep a 20% cut
 let lastHour=null;
 function dealers(){const s=ensure();s.crew??={};const ck=G.clockNow(),hr=ck.day*24+Math.floor(ck.minute/60);if(hr===lastHour)return;const first=lastHour==null;lastHour=hr;if(first||(G.coop&&!G.coop.isHost))return;
  for(const [id,d]of Object.entries(s.crew)){let left=CREW[id].rate;for(const key of Object.keys(d.stock||{})){while(left>0&&d.stock[key]>0){d.stock[key]--;left--;d.cash=(d.cash||0)+Math.round(productValue(key,1)*.8);d.sold=(d.sold||0)+1}if(!d.stock[key])delete d.stock[key]}}}
 G.dealersView=(body,repaint)=>{const s=ensure();s.crew??={};const rank=G.rank();
  body.append(h('p',{class:'sub'},'Dealers sell the bags you give them at market value, day and night, and keep 20%. Collect your cash here.'));
  for(const [id,c]of Object.entries(CREW)){const d=s.crew[id];const stock=d?Object.values(d.stock||{}).reduce((a,b)=>a+b,0):0;
   if(!d){body.append(h('div',{class:'nw-row'},h('div',{class:'grow'},h('b',{},c.name),h('small',{},c.desc)),h('button',{class:'nw-b go',disabled:(c.rank>rank||s.money+s.bank<c.price)||undefined,onclick:()=>{if(!G.payAny(c.price))return;s.crew[id]={stock:{},cash:0,sold:0};sfx.level();G.toast(c.name+' works for you now.','good');G.save();repaint()}},c.rank>rank?'Locked':money(c.price))));continue}
   body.append(h('div',{class:'nw-row sel'},h('div',{class:'grow'},h('b',{},c.name),h('small',{},stock+' bags to sell · '+(d.sold||0)+' sold · holding '+money(d.cash||0))),h('button',{class:'nw-b go',disabled:!d.cash||undefined,onclick:()=>{s.money+=d.cash;G.toast('Collected '+money(d.cash)+' from '+c.name,'good');d.cash=0;sfx.cash();G.save();repaint()}},'Collect')));
   const mine=Object.keys(s.products).filter(k=>s.products[k].bags>0);
   body.append(h('div',{class:'nw-actions',style:{justifyContent:'flex-start',flexWrap:'wrap',margin:'0 0 10px'}},...(mine.length?mine.map(k=>h('button',{class:'nw-b',onclick:()=>{const n=Math.min(5,s.products[k].bags);s.products[k].bags-=n;d.stock[k]=(d.stock[k]||0)+n;sfx.bag();G.onInventory();G.save();repaint()}},'Give '+Math.min(5,s.products[k].bags)+'× '+productName(k))):[h('small',{class:'sub'},'You have no bags to hand over.')])))}
 };
 return {update(dt,t){ensure();curfew(dt);brawlers(dt,t);picking?.tick(dt);dealers()},openATM,isCurfew};
}
