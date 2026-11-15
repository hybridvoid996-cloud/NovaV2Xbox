// Nova Weed action: guns (NPCs, rival crews and police only — never other players),
// wanted level + police that chase and shoot back, health, and side jobs.
import * as THREE from '/vendor/three/three.module.min.js';
import {makePerson,randomLook,Walker,animatePerson} from './people.mjs?v=15';
import {puff} from './fx.mjs?v=15';
import {GUNS} from './economy.mjs?v=15';

const STREETS=['Maple St','Elm St','Cedar Ave','Birch Rd','Harbor Ln','Juniper Way','Oak Ct','Willow Dr'];

export function createAction(G,{scene,camera,player,world,graph,fx,sfx,h,hud,money}){
 const S=()=>G.S;
 G.wanted=0;G.mag={};let wantedClock=0,lastHurt=-99,nextFire=0,reloadUntil=0,aiT=0,mouseDown=false;
 const tmp=new THREE.Vector3(),tmp2=new THREE.Vector3(),ray=new THREE.Ray();

 // ---------- HUD ----------
 const hpBar=h('i'),hpBox=h('div',{class:'nw-hp'},h('span',{},'❤'),h('div',{class:'bar'},hpBar));
 const ammoBox=h('div',{class:'nw-ammo',hidden:true});
 const stars=h('div',{class:'nw-wanted'});
 const hitMark=h('div',{class:'nw-hitmark'});
 const hurtFlash=h('div',{class:'nw-hurt'});
 const jobBox=h('div',{class:'nw-job',hidden:true});
 const arrow=h('i',{class:'nw-job-arrow'});
 hud.append(hpBox,ammoBox,stars,hitMark,jobBox);document.body.append(hurtFlash);

 // ---------- effects: tracers, muzzle flash ----------
 const tracerMat=new THREE.MeshBasicMaterial({color:'#ffe9a8',transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});
 const tracers=Array.from({length:10},()=>{const m=new THREE.Mesh(new THREE.BoxGeometry(.02,.02,1).translate(0,0,.5),tracerMat.clone());m.visible=false;m.life=0;scene.add(m);return m});
 let tracerI=0;
 const tracer=(from,to)=>{const m=tracers[tracerI++%tracers.length];m.position.copy(from);m.lookAt(to);m.scale.set(1,1,from.distanceTo(to));m.visible=true;m.life=.07;m.material.opacity=.9};
 const flashLight=new THREE.PointLight('#ffcf7a',0,9,2);scene.add(flashLight);let flashT=0;
 const flashMat=new THREE.MeshBasicMaterial({color:'#ffd27a',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
 const npcFlash=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),flashMat);npcFlash.visible=false;scene.add(npcFlash);let npcFlashT=0;

 // ---------- targets ----------
 const crew=[];G.crew=crew;
 const alive=()=>[...G.npcs.filter(n=>!n.dead&&n.g.visible),...G.police.filter(o=>!o.dead&&o.g.visible),...crew.filter(c=>!c.dead)];
 // ray vs upright cylinder (people), returns distance or -1
 function hitPerson(o,d,p,r=.38,h=2.3){
  const ox=o.x-p.x,oz=o.z-p.z,a=d.x*d.x+d.z*d.z;if(a<1e-6)return -1;
  const b=2*(ox*d.x+oz*d.z),c=ox*ox+oz*oz-r*r,disc=b*b-4*a*c;if(disc<0)return -1;
  const t=(-b-Math.sqrt(disc))/(2*a);if(t<0)return -1;const y=o.y+d.y*t-p.y;return y>=0&&y<=h?t:-1;
 }
 function hitBox(o,d,c){
  let tmin=-Infinity,tmax=Infinity;
  for(const [oo,dd,lo,hi]of [[o.x,d.x,c.minX,c.maxX],[o.y,d.y,0,c.h],[o.z,d.z,c.minZ,c.maxZ]]){
   if(Math.abs(dd)<1e-8){if(oo<lo||oo>hi)return -1;continue}
   let t1=(lo-oo)/dd,t2=(hi-oo)/dd;if(t1>t2)[t1,t2]=[t2,t1];tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);if(tmin>tmax)return -1;
  }
  return tmin>0?tmin:-1; // camera inside a box (rooms): ignore that box
 }
 function castFrom(o,d,range,ignore){
  let best=range,who=null;
  for(const c of world.colliders){const t=hitBox(o,d,c);if(t>0&&t<best){best=t;who=null}}
  if(d.y<-1e-4){const t=-o.y/d.y;if(t<best){best=t;who=null}}
  for(const tg of alive()){if(tg===ignore)continue;const t=hitPerson(o,d,tg.g.position);if(t>0&&t<best){best=t;who=tg}}
  return {t:best,who,point:o.clone().addScaledVector(d,best)};
 }

 // ---------- damage ----------
 const kindOf=tg=>G.police.includes(tg)?'police':crew.includes(tg)?'crew':'civ';
 function raiseWanted(n,why){if(n>G.wanted){G.wanted=n;sfx.siren();G.toast('🚨 Wanted: '+'★'.repeat(n)+(why?' · '+why:''),'bad')}wantedClock=0}
 const client=()=>G.coop&&!G.coop.isHost;
 function hurt(tg,dmg,head,remote=false,melee=false){
  const k=kindOf(tg);
  const copNear=()=>G.police.some(c=>!c.dead&&c.g.visible&&c.g.position.distanceTo(player.pos)<25);
  if(!remote&&k==='police')raiseWanted(melee?2:3,melee?'you hit an officer':'you shot an officer');
  else if(!remote&&k==='civ'){if(!melee)raiseWanted(2,'you shot a civilian');else if(copNear())raiseWanted(1,'assault')}
  if(client()&&k!=='crew'){G.coop.emitEvent({k:'hit',n:k,i:(k==='police'?G.police:G.npcs).indexOf(tg),d:Math.round(dmg)});return}
  tg.hp=(tg.hp??(k==='crew'?80:100))-dmg;
  if(k==='civ'){tg.w.goTo(tmp.set(tg.g.position.x*1.3,0,tg.g.position.z*1.3),'flee')}
  else if(k==='crew')tg.hostile=true;
  if(tg.hp<=0)kill(tg,head);
 }
 function kill(tg,head){
  tg.dead=true;tg.deadT=0;tg.order=null;tg.w.mode='hold';tg.fallFrom=tg.g.rotation.x;
  const k=kindOf(tg);G.S.stats.kos=(G.S.stats.kos||0)+1;
  if(k!=='police'){tg.loot=k==='crew'?30+Math.floor(Math.random()*40):5+Math.floor(Math.random()*25)}
  if(k==='crew'){G.addXP(25);const left=crew.filter(c=>!c.dead).length;if(G.S.jobs?.active?.kind==='crew'){if(left)G.toast('Rival down. '+left+' left.');else finishJob()}}
  // everyone nearby runs
  for(const n of G.npcs)if(!n.dead&&n.g.position.distanceTo(tg.g.position)<30)n.w.goTo(tmp.set(n.g.position.x*1.4,0,n.g.position.z*1.4),'flee');
 }
 function respawn(tg){
  const k=kindOf(tg);tg.dead=false;tg.hp=undefined;tg.loot=0;tg.g.rotation.x=0;tg.g.position.y=0;tg.g.visible=true;
  if(k==='crew'){scene.remove(tg.g);crew.splice(crew.indexOf(tg),1);return}
  // come back far from the player
  let best=0,bi=0;for(let i=0;i<graph.nodes.length;i++){const n=graph.nodes[i],d=Math.hypot(n[0]-player.pos.x,n[1]-player.pos.z);if(d>best&&d<120&&Math.random()<.3){best=d;bi=i}}
  tg.w.at=k==='police'&&tg.w.route?tg.w.route[0]:bi;
  const n=graph.nodes[tg.w.at];tg.g.position.set(n[0],0,n[1]);tg.w.release();
 }

 // ---------- player health ----------
 function hurtPlayer(dmg){
  if(G.god)return;
  const s=S();s.hp=Math.max(0,(s.hp??100)-dmg);lastHurt=performance.now()/1000;sfx.hurt();
  hurtFlash.classList.remove('on');void hurtFlash.offsetWidth;hurtFlash.classList.add('on');player.pitch+=(Math.random()-.5)*.03;player.yaw+=(Math.random()-.5)*.03;
  if(s.hp<=0)wasted();
 }
 function wasted(){
  const s=S();const bill=Math.min(s.money,Math.max(40,Math.round(s.money*.2)));s.money-=bill;s.hp=100;G.wanted=0;
  for(const o of G.police)if(!o.dead)o.w.release();
  if(s.jobs?.active)failJob('You got knocked out.');
  const fade=h('div',{class:'nw-fade nw-wasted'},h('b',{},'KNOCKED OUT'),h('small',{},'Hospital bill: '+money(bill)));document.body.append(fade);G.paused=true;
  setTimeout(()=>{player.teleport(G.PLACES.home.door.x,G.PLACES.home.door.z+1.5,Math.PI);fade.classList.add('out');G.paused=false;G.save();setTimeout(()=>fade.remove(),1600)},1800);
 }

 // ---------- AI gunfire ----------
 function aiShoot(shooter,acc,dmg,target=null){
  const g=shooter.g;tmp.set(.3,1.35,.45);g.localToWorld(tmp);const tp=target?target.pos:player.pos;
  const aim=tmp2.set(tp.x,1.3,tp.z);const miss=Math.random()>acc;
  if(miss)aim.add(new THREE.Vector3((Math.random()-.5)*2.5,(Math.random()-.3)*1.5,(Math.random()-.5)*2.5));
  const d=aim.clone().sub(tmp).normalize();
  // walls block police/crew shots too
  let blocked=false;const dist=tmp.distanceTo(aim);for(const c of world.colliders){const t=hitBox(tmp,d,c);if(t>0&&t<dist){blocked=true;break}}
  tracer(tmp,blocked?tmp.clone().addScaledVector(d,4):aim);npcFlash.position.copy(tmp);npcFlash.visible=true;npcFlashT=.05;sfx.shot(.5);
  const end=blocked?tmp.clone().addScaledVector(d,4):aim.clone();
  if(G.coop&&kindOf(shooter)==='police')G.coop.emitEvent({k:'ai',f:[tmp.x,tmp.y,tmp.z].map(v=>Math.round(v*100)/100),to:[end.x,end.y,end.z].map(v=>Math.round(v*100)/100)});
  if(!miss&&!blocked){if(target?.uid)G.coop?.emitEvent({k:'dmg',to:target.uid,d:dmg});else hurtPlayer(dmg)}
 }

 // ---------- player gun ----------
 const gunOf=id=>GUNS[id];
 function fire(id){
  const gun=gunOf(id);const nowS=performance.now()/1000;if(!gun||G.paused||nowS<reloadUntil||nowS<nextFire)return;
  const s=S();if(G.mag[id]==null)G.mag[id]=0;
  if(G.mag[id]<=0){if(s.inv.ammo>0)reload(id);else{sfx.click();G.toast('Out of ammo. Buy more from Vic at the motel.')}return}
  G.mag[id]--;nextFire=nowS+gun.rate;
  const o=camera.position.clone();const d=player.forward();
  d.x+=(Math.random()-.5)*gun.spread;d.y+=(Math.random()-.5)*gun.spread;d.z+=(Math.random()-.5)*gun.spread;d.normalize();
  const job0=s.jobs?.active;const crewFight=job0?.kind==='crew'&&Math.hypot(job0.x-player.pos.x,job0.z-player.pos.z)<40;
  const hit=castFrom(o,d,gun.range);
  const muzzle=player.muzzle?player.muzzle.getWorldPosition(new THREE.Vector3()):o.clone().addScaledVector(d,.6);
  tracer(muzzle,hit.point);player.kick(gun.kick);if(G.coop)G.coop.emitEvent({k:'shot',g:id,to:[hit.point.x,hit.point.y,hit.point.z].map(v=>Math.round(v*100)/100),h:hit.who?1:0});flashLight.position.copy(muzzle);flashLight.intensity=6;flashT=.05;sfx.shot(1,gun.auto);
  player.pitch=Math.min(1.5,player.pitch+gun.kick*.06);player.yaw+=(Math.random()-.5)*gun.kick*.02;
  if(hit.who){const head=hit.point.y-hit.who.g.position.y>1.72;hurt(hit.who,gun.dmg*(head?2:1),head);puff(fx,hit.point,d,{n:5,color:'#d65a4a',size:.35});
   hitMark.classList.remove('on','head');void hitMark.offsetWidth;hitMark.classList.add('on');if(head)hitMark.classList.add('head');sfx.hit()}
  else{puff(fx,hit.point,d.clone().negate(),{n:4,color:'#c9c2b6',size:.3})}
  // gunfire is loud: civilians scatter, nearby cops get involved
  for(const n of G.npcs)if(!n.dead&&n.g.position.distanceTo(player.pos)<22&&n.w.mode!=='flee')n.w.goTo(tmp.set(n.g.position.x+(n.g.position.x-player.pos.x)*2,0,n.g.position.z+(n.g.position.z-player.pos.z)*2),'flee');
  if(!crewFight&&G.police.some(c=>!c.dead&&c.g.visible&&c.g.position.distanceTo(player.pos)<35))raiseWanted(Math.max(1,G.wanted),'shots fired');
  if(G.mag[id]===0&&s.inv.ammo>0)setTimeout(()=>reload(id),250);
  G.onAmmo?.();
 }
 function reload(id){
  const gun=gunOf(id),s=S();if(!gun||performance.now()/1000<reloadUntil)return;const need=gun.mag-(G.mag[id]||0);if(need<=0||!(s.inv.ammo>0))return;
  reloadUntil=performance.now()/1000+gun.reload;sfx.reload();player.reloadAnim(gun.reload);
  setTimeout(()=>{const n=Math.min(need,s.inv.ammo);s.inv.ammo-=n;G.mag[id]=(G.mag[id]||0)+n;G.onAmmo?.();G.save()},gun.reload*1000);
 }

 // ---------- jobs ----------
 const beaconMat=new THREE.MeshBasicMaterial({color:'#5dff8a',transparent:true,opacity:.11,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
 function beacon(x,z,height=26,color){const g=new THREE.Group();const m=beaconMat.clone();if(color)m.color.set(color);
  const col=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,height,16,1,true),m);col.position.y=height/2;
  const ring=new THREE.Mesh(new THREE.RingGeometry(.7,1,32).rotateX(-Math.PI/2),m.clone());ring.material.opacity=.6;ring.position.y=.05;
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.32),new THREE.MeshBasicMaterial({color:m.color}));gem.position.y=2.6;g.add(col,ring,gem);g.userData.gem=gem;g.position.set(x,0,z);scene.add(g);return g}
 const marks=[];const clearMarks=()=>{for(const m of marks.splice(0))scene.remove(m.g)};
 const nearestNode=(x,z)=>{let bi=0,bd=1e9;graph.nodes.forEach((n,i)=>{const d=Math.hypot(n[0]-x,n[1]-z);if(d<bd){bd=d;bi=i}});return bi};
 function addressOf(i){return (8+((i*37)%80))+' '+STREETS[i%STREETS.length]}
 function makeOffers(){
  const s=S();const r=(a,b)=>a+Math.floor(Math.random()*(b-a+1));const houses=world.houses||[];const offers=[];
  for(let k=0;k<2&&houses.length;k++){const hi=r(0,houses.length-1),hs=houses[hi];const pick=[{x:G.PLACES.quick.clerk.x,z:G.PLACES.quick.clerk.z-2.4,label:'Quick Stop'},{x:world.motel?.x??-79,z:(world.motel?.z??-41)-5,label:'Sunset Motel'},{x:G.PLACES.garden.clerk.x,z:G.PLACES.garden.clerk.z+2.4,label:'Green Thumb'}][r(0,2)];
   const dist=Math.hypot(hs.x-pick.x,hs.z-pick.z);offers.push({id:'c'+k+s.day,kind:'courier',title:'Courier: package to '+addressOf(hi),desc:'Pick up at '+pick.label+', deliver to '+addressOf(hi)+' before time runs out.',pay:40+Math.round(dist*.6),from:pick,to:{x:hs.x,z:hs.z,label:addressOf(hi)},time:Math.round(70+dist*1.1)})}
  offers.push({id:'t'+s.day,kind:'cleanup',title:'Street cleanup',desc:'The city pays per trash bag. Pick up 6 bags around the neighbourhood.',pay:60});
  const spots=[{x:-30,z:90,label:'Riverside Park'},{x:-60,z:-66.5,label:'the motel lot'},{x:66.5,z:66.5,label:'the east side'}];const sp=spots[r(0,spots.length-1)];
  offers.push({id:'r'+s.day,kind:'crew',title:'Run off a rival crew',desc:'A rival crew is selling at '+sp.label+'. Take them out. You need a gun.',pay:180,x:sp.x,z:sp.z,label:sp.label,needsGun:true});
  s.jobs={...(s.jobs||{}),day:s.day,offers,active:null};
 }
 function startJob(o){
  const s=S();if(s.jobs.active)return G.toast('Finish or cancel your current job first.','bad');
  if(o.needsGun&&!Object.keys(GUNS).some(id=>s.inv[id]>0))return G.toast('You need a gun for this one. Vic sells them at the motel.','bad');
  const a={...o,stage:0,started:performance.now()/1000};s.jobs.active=a;s.jobs.offers=s.jobs.offers.filter(x=>x.id!==o.id);
  if(o.kind==='courier'){marks.push({g:beacon(o.from.x,o.from.z),key:'from'});G.toast('Job: pick up the package at '+o.from.label,'good')}
  if(o.kind==='cleanup'){const b=nearestNode(player.pos.x,player.pos.z);const pool=graph.nodes.map((n,i)=>({n,i,d:Math.hypot(n[0]-graph.nodes[b][0],n[1]-graph.nodes[b][1])})).filter(x=>x.d>6&&x.d<60).sort(()=>Math.random()-.5).slice(0,6);
   a.bags=pool.map(({n})=>({x:n[0]+(Math.random()-.5)*2,z:n[1]+(Math.random()-.5)*2,got:false}));
   for(const bag of a.bags){const m=trashBag();m.position.set(bag.x,0,bag.z);scene.add(m);const bc=beacon(bag.x,bag.z,7,'#ffd166');bc.add(m);m.position.set(0,0,0);marks.push({g:bc,bag})}
   G.toast('Job: pick up 6 trash bags (yellow markers).','good')}
  if(o.kind==='crew'){spawnCrew(o);marks.push({g:beacon(o.x,o.z,26,'#ff5a5a'),key:'crew'});G.toast('Job: take out the crew at '+o.label+'. They shoot back.','good')}
  G.save();
 }
 function trashBag(){const g=new THREE.Group();const m=new THREE.Mesh(new THREE.SphereGeometry(.35,10,8),new THREE.MeshStandardMaterial({color:'#1f2226',roughness:.35,metalness:.1}));m.scale.set(1,1.15,.9);m.position.y=.35;const tie=new THREE.Mesh(new THREE.ConeGeometry(.1,.2,6),m.material);tie.position.y=.78;g.add(m,tie);return g}
 function spawnCrew(o){
  const start=nearestNode(o.x,o.z);
  for(let i=0;i<3+(G.S.jobs.done>3?1:0);i++){
   const g=makePerson(randomLook(900+i*13+G.S.day,{shirt:'#a3231c',hood:true,pants:'#1b1b20',hat:i%2?'beanie':null,hatColor:'#1b1b20'}));scene.add(g);
   const w=new Walker(g,graph,{seed:50+i,start,speed:1.2});g.position.x+=(i-1)*1.6;g.position.z+=(i%2)*1.4;w.goTo(g.position,'hold');
   crew.push({g,w,hp:80,hostile:false,shootT:1+Math.random()})}
 }
 function finishJob(){
  const s=S(),a=s.jobs.active;if(!a)return;s.money+=a.pay;s.stats.earned+=a.pay;s.jobs.done=(s.jobs.done||0)+1;s.jobs.active=null;G.addXP(Math.round(a.pay/3));sfx.cash();sfx.level();
  G.toast('✔ Job done: +'+money(a.pay),'good');clearMarks();G.save();
 }
 function failJob(why){const s=S();if(!s.jobs?.active)return;const a=s.jobs.active;s.jobs.active=null;clearMarks();if(a.kind==='crew')for(const c of crew.splice(0))scene.remove(c.g);sfx.deny();G.toast('✖ Job failed: '+why,'bad');G.save()}
 G.cancelJob=()=>failJob('cancelled');
 G.jobMarks=()=>{const a=S().jobs?.active;if(!a)return [];if(a.kind==='courier')return [a.stage===0?{...a.from,label:'Pickup'}:{...a.to,label:'Drop-off'}];if(a.kind==='crew')return [{x:a.x,z:a.z,label:'Rival crew'}];return (a.bags||[]).filter(b=>!b.got).map(b=>({x:b.x,z:b.z,label:''}))};
 // phone app
 G.jobsView=(body,repaint)=>{
  const s=S();if(!s.jobs||s.jobs.day!==s.day)makeOffers();
  const a=s.jobs.active;
  if(a)body.append(h('div',{class:'nw-row sel'},h('span',{class:'ic'},'📌'),h('div',{class:'grow'},h('b',{},a.title),h('small',{},a.desc)),h('button',{class:'nw-b',onclick:()=>{G.cancelJob();repaint()}},'Cancel')));
  body.append(h('p',{class:'sub'},a?'Other jobs today':'Jobs today · new ones every morning'));
  if(!s.jobs.offers.length)body.append(h('p',{class:'sub'},'No more jobs today. Check back tomorrow.'));
  body.append(h('div',{class:'nw-list'},...s.jobs.offers.map(o=>h('div',{class:'nw-row'},h('span',{class:'ic'},o.kind==='courier'?'📦':o.kind==='cleanup'?'🗑️':'🎯'),h('div',{class:'grow'},h('b',{},o.title),h('small',{},o.desc+(o.time?' · '+Math.floor(o.time/60)+':'+String(o.time%60).padStart(2,'0')+' limit':''))),
   h('button',{class:'nw-b go',disabled:a?true:undefined,onclick:()=>{startJob(o);G.closePhone?.()}},money(o.pay))))));
  body.append(h('p',{class:'sub',style:{marginTop:'10px'}},'Jobs done: '+(s.jobs.done||0)));
 };
 // things you can press E on
 G.actionInteract=(P)=>{
  const s=S(),a=s.jobs?.active;
  if(a?.kind==='courier'){const t=a.stage===0?a.from:a.to;P(t.x,t.z,2.2,a.stage===0?'Pick up the package':'Deliver the package to '+a.to.label,()=>{
   if(a.stage===0){a.stage=1;a.deadline=performance.now()/1000+a.time;clearMarks();marks.push({g:beacon(a.to.x,a.to.z),key:'to'});sfx.bag();G.toast('Got the package. Deliver it to '+a.to.label+'!','good')}else finishJob()})}
  if(a?.kind==='cleanup')for(const m of marks){const b=m.bag;if(!b||b.got)continue;P(b.x,b.z,1.9,'Pick up trash bag',()=>{b.got=true;scene.remove(m.g);sfx.bag();const left=a.bags.filter(x=>!x.got).length;if(left)G.toast('Trash bag '+(6-left)+'/6');else finishJob()})}
  for(const tg of [...G.npcs,...crew])if(tg.dead&&tg.loot>0){const p=tg.g.position;P(p.x,p.z,2,'Pick up '+money(tg.loot),()=>{s.money+=tg.loot;sfx.cash();G.toast('+'+money(tg.loot));tg.loot=0})}
  if(G.dealer){const p=G.dealer.position;P(p.x,p.z,2.6,'Talk to Vic (guns & ammo)',()=>G.openShop('arms'))}
 };

 // ---------- per-frame ----------
 function update(dt,t){
  const s=S(),now=performance.now()/1000;
  if(mouseDown&&G.heldGun&&GUNS[G.heldGun]?.auto)fire(G.heldGun);
  // effects decay
  for(const m of tracers)if(m.visible){m.life-=dt;m.material.opacity=Math.max(0,m.life/.07)*.9;if(m.life<=0)m.visible=false}
  if(flashT>0){flashT-=dt;if(flashT<=0)flashLight.intensity=0}
  if(npcFlashT>0){npcFlashT-=dt;if(npcFlashT<=0)npcFlash.visible=false}
  // bodies fall, then respawn
  for(const tg of [...G.npcs,...G.police,...crew]){if(!tg.dead)continue;tg.deadT+=dt;const k=Math.min(1,tg.deadT*3);tg.g.rotation.x=-Math.PI/2*k*k;tg.g.position.y=.15*k;
   if(tg.deadT>30&&tg.g.position.distanceTo(player.pos)>25&&(!client()||kindOf(tg)==='crew'))respawn(tg)}
  // health regen
  if(s.hp==null)s.hp=100;if(now-lastHurt>6&&s.hp<100)s.hp=Math.min(100,s.hp+dt*5);
  // police: chase and shoot while you're wanted
  aiT-=dt;const tick=aiT<=0;if(tick)aiT=.35;
  const hunted=[];if(G.wanted>0)hunted.push({pos:player.pos,w:G.wanted});
  if(G.coop?.isHost)for(const rp of G.coop.players.values())if(rp.w>0&&rp.model?.visible)hunted.push({pos:rp.model.position,w:rp.w,uid:rp.uid});
  if(!client()&&hunted.length)for(const o of G.police){if(o.dead||!o.g.visible)continue;let tg=null,best=90;for(const h of hunted){const d=o.g.position.distanceTo(h.pos);if(d<best){best=d;tg=h}}if(!tg)continue;
   if(!tg.uid&&G.wanted<=1){if(best<1.8)G.arrest?.(G.curfewChase?'curfew':'');else if(tick)o.w.goTo(tg.pos,'chase');continue}
   if(best<14){o.w.goTo(o.g.position,'hold');o.g.rotation.y=Math.atan2(tg.pos.x-o.g.position.x,tg.pos.z-o.g.position.z);o.shootT=(o.shootT??1)-dt;if(o.shootT<=0){o.shootT=1+Math.random()*.7;aiShoot(o,.22+tg.w*.06,7+tg.w*2,tg.uid?tg:null)}}
   else if(tick)o.w.goTo(tg.pos,'chase')}
  if(G.wanted>0){
   let seen=false;for(const o of G.police){if(!o.dead&&o.g.visible&&o.g.position.distanceTo(player.pos)<45)seen=true}
   wantedClock+=dt;if(seen)wantedClock=Math.min(wantedClock,0);
   if(wantedClock>8+G.wanted*5){G.wanted--;wantedClock=0;if(!G.wanted){G.toast('You lost the police.','good');for(const o of G.police)if(!o.dead)o.w.release()}}
  }
  // rival crew
  for(const c of crew){if(c.dead)continue;const d=c.g.position.distanceTo(player.pos);if(d<26)c.hostile=true;if(!c.hostile){animatePerson(c.g,t,0);continue}
   if(d>11){if(tick)c.w.goTo(player.pos,'chase');c.w.update(dt,t)}
   else{c.g.rotation.y=Math.atan2(player.pos.x-c.g.position.x,player.pos.z-c.g.position.z);animatePerson(c.g,t,0);c.shootT-=dt;if(c.shootT<=0){c.shootT=1.1+Math.random()*.8;aiShoot(c,.3,8)}}}
  // jobs
  const a=s.jobs?.active;
  for(const m of marks){const gem=m.g.userData.gem;if(gem){gem.rotation.y=t*2;gem.position.y=2.4+Math.sin(t*2.4)*.25}}
  if(a?.kind==='courier'&&a.stage===1&&now>a.deadline)failJob('the package was late');
  // HUD
  hpBar.style.width=(s.hp||0)+'%';hpBox.classList.toggle('low',s.hp<35);hpBox.style.opacity=s.hp<100||G.wanted?1:.55;
  stars.replaceChildren(...[1,2,3].map(i=>h('span',{class:i<=G.wanted?'on':''},'★')));stars.hidden=!G.wanted;
  if(G.heldGun&&!G.driving){const gun=GUNS[G.heldGun];ammoBox.hidden=false;ammoBox.replaceChildren(h('b',{},now<reloadUntil?'…':String(G.mag[G.heldGun]??0)),h('small',{},' / '+(s.inv.ammo||0)),h('span',{},gun.short))}else ammoBox.hidden=true;
  const targets=G.jobMarks();
  if(a&&targets.length){let best=targets[0],bd=1e9;for(const tg of targets){const d=Math.hypot(tg.x-player.pos.x,tg.z-player.pos.z);if(d<bd){bd=d;best=tg}}
   const ang=Math.atan2(best.x-player.pos.x,best.z-player.pos.z),face=Math.atan2(-Math.sin(player.yaw),-Math.cos(player.yaw));let rel=ang-face;rel=Math.atan2(Math.sin(rel),Math.cos(rel));
   arrow.style.transform='rotate('+(-rel)+'rad)';
   const timer=a.kind==='courier'&&a.stage===1?' · '+Math.max(0,Math.ceil(a.deadline-now))+'s':'';
   const sub=a.kind==='cleanup'?(a.bags.filter(b=>b.got).length+'/6 bags'):a.kind==='crew'?(crew.filter(c=>!c.dead).length+' left'):a.stage===0?'Pick up':'Deliver to '+a.to.label;
   jobBox.hidden=false;jobBox.replaceChildren(h('small',{},'JOB · '+money(a.pay)),h('b',{},a.title),h('div',{class:'row'},arrow,h('span',{},sub+' · '+Math.round(bd)+'m'+timer)))}
  else jobBox.hidden=true;
 }
 addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false});
 function remoteEvent(rp,ev){
  const v=a=>new THREE.Vector3(a[0],a[1],a[2]);
  if(ev.k==='shot'&&Array.isArray(ev.to)){const from=rp.muzzle?rp.muzzle.getWorldPosition(new THREE.Vector3()):rp.model?rp.model.position.clone().add(new THREE.Vector3(0,1.4,0)):null;if(!from)return;const to=v(ev.to);
   tracer(from,to);npcFlash.position.copy(from);npcFlash.visible=true;npcFlashT=.05;const dist=from.distanceTo(player.pos);sfx.shot(Math.max(.08,1-dist/70),GUNS[ev.g]?.auto);puff(fx,to,new THREE.Vector3(0,1,0),{n:3,color:ev.h?'#d65a4a':'#c9c2b6',size:.3});
   if(!G.coop.isHost)return;for(const n of G.npcs)if(!n.dead&&n.g.position.distanceTo(from)<22)n.w.goTo(tmp.set(n.g.position.x*1.3,0,n.g.position.z*1.3),'flee')}
  if(ev.k==='ai'&&Array.isArray(ev.f)){const f=v(ev.f);tracer(f,v(ev.to));npcFlash.position.copy(f);npcFlash.visible=true;npcFlashT=.05;sfx.shot(Math.max(.08,.5-f.distanceTo(player.pos)/90))}
  if(ev.k==='hit'&&G.coop.isHost){const tg=(ev.n==='police'?G.police:G.npcs)[ev.i];if(tg&&!tg.dead)hurt(tg,Math.min(250,+ev.d||0),false,true)}
  if(ev.k==='dmg'&&ev.to===G.coop.me)hurtPlayer(Math.min(40,+ev.d||0));
 }
 const api={remoteEvent,targets:alive,damage:(tg,d,o={})=>hurt(tg,d,false,false,!!o.melee),update,fire,reload,setMouse:v=>{mouseDown=v},hurtPlayer,startJob,makeOffers};
 return api;
}

// Gun dealer by the motel.
export function spawnDealer(scene,world){
 const g=makePerson(randomLook(4711,{shirt:'#2b2b33',pants:'#3a2f25',hat:'cap',hatColor:'#7a1f1f'}));
 const m=world.motel||{x:-79,z:-41};g.position.set(m.x+10.2,0,m.z-3.6);g.rotation.y=-Math.PI/2;scene.add(g);return g;
}
