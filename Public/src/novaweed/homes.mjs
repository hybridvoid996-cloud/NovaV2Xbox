// Nova Weed homes: buy a better house, move in (you wake up there) and grow in its backyard greenhouse.
// Also: buyers take a hit after a sale and you can see the effect on them.
import * as THREE from '/vendor/three/three.module.min.js';
import {EFFECTS,parseKey} from './economy.mjs?v=15';
import {puff} from './fx.mjs?v=15';

export const HOMES={
 cottage:{name:'Maple Cottage',price:6000,slots:4,pick:0.15,desc:'Small house with a 4-pot greenhouse out back.'},
 family:{name:'Cedar Family Home',price:15000,slots:8,pick:.5,desc:'Roomy two-bedroom with an 8-pot greenhouse.'},
 bay:{name:'Bayview House',price:32000,slots:8,pick:.85,desc:'The best street on the island. 8 pots, fast-growing light.',bonus:1.25}
};

function greenhouse(scene,w=8.6,d=4.2){
 const g=new THREE.Group();
 const frame=new THREE.MeshStandardMaterial({color:'#f2f0ea',metalness:.3,roughness:.4});
 const glass=new THREE.MeshStandardMaterial({color:'#d8f0e4',transparent:true,opacity:.22,roughness:.05,metalness:.1,depthWrite:false,side:THREE.DoubleSide});
 const floor=new THREE.Mesh(new THREE.BoxGeometry(w,.12,d),new THREE.MeshStandardMaterial({color:'#9a958c',roughness:.9}));floor.position.y=.06;floor.receiveShadow=true;g.add(floor);
 const H=2.4;
 for(const [x,z]of [[-w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2],[0,-d/2],[0,d/2]]){const p=new THREE.Mesh(new THREE.BoxGeometry(.08,H,.08),frame);p.position.set(x,H/2,z);g.add(p)}
 for(const z of [-d/2,d/2]){const wl=new THREE.Mesh(new THREE.PlaneGeometry(w,H),glass);wl.position.set(0,H/2,z);g.add(wl)}
 for(const x of [-w/2,w/2]){const wl=new THREE.Mesh(new THREE.PlaneGeometry(d,H),glass);wl.rotation.y=Math.PI/2;wl.position.set(x,H/2,0);g.add(wl)}
 for(const s of [-1,1]){const r=new THREE.Mesh(new THREE.PlaneGeometry(w,d/2/Math.cos(.55)),glass);r.rotation.x=-Math.PI/2+s*.55;r.position.set(0,H+.6,s*d/4);r.rotation.order='XYZ';if(s<0)r.rotation.x=Math.PI/2-.55+Math.PI;g.add(r)}
 const ridge=new THREE.Mesh(new THREE.BoxGeometry(w,.08,.08),frame);ridge.position.y=H+1.2;g.add(ridge);
 for(const z of [-d/2,d/2]){const e=new THREE.Mesh(new THREE.BoxGeometry(w,.08,.08),frame);e.position.set(0,H,z);g.add(e)}
 const lamp=new THREE.Mesh(new THREE.BoxGeometry(w*.8,.06,.3),new THREE.MeshStandardMaterial({color:'#222',emissive:'#e4c8ff',emissiveIntensity:1.4}));lamp.position.y=H+.3;g.add(lamp);
 g.traverse(o=>{if(o.isMesh&&o.material!==glass)o.castShadow=true});scene.add(g);return g;
}
function forSale(scene,x,z,ry,price){
 const g=new THREE.Group();const c=document.createElement('canvas');c.width=256;c.height=160;const k=c.getContext('2d');k.fillStyle='#fff';k.fillRect(0,0,256,160);k.fillStyle='#e8443a';k.fillRect(0,0,256,48);k.fillStyle='#fff';k.font='900 34px Segoe UI, sans-serif';k.textAlign='center';k.fillText('FOR SALE',128,36);k.fillStyle='#1d232b';k.font='800 30px Segoe UI, sans-serif';k.fillText('$'+price.toLocaleString(),128,98);k.font='600 18px Segoe UI, sans-serif';k.fillText('Nova Homes app',128,136);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const post=new THREE.Mesh(new THREE.BoxGeometry(.1,1.6,.1),new THREE.MeshStandardMaterial({color:'#6b4a33'}));post.position.y=.8;
 const board=new THREE.Mesh(new THREE.BoxGeometry(1,.62,.04),new THREE.MeshStandardMaterial({map:t}));board.position.set(0,1.25,.06);
 g.add(post,board);g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);return g;
}

export function createHomes(G,{scene,world,addPotSlots,sfx,h,money}){
 const S=()=>G.S;
 // pick three real houses from the town for sale
 const list=world.houses||[];const spots={};
 for(const [id,hm]of Object.entries(HOMES)){const i=Math.min(list.length-1,Math.floor(list.length*hm.pick));const hs=list[i];if(hs)spots[id]=hs}
 const built={},signs={};
 function setup(){
  const s=S();s.homes=s.homes||{};
  for(const [id,hs]of Object.entries(spots)){
   const owned=s.homes[id];const k=hs.k||1;
   if(!owned&&!signs[id])signs[id]=forSale(scene,hs.x+1.8,hs.z+k*2,k>0?0:Math.PI,HOMES[id].price);
   if(owned&&signs[id]){scene.remove(signs[id]);delete signs[id]}
   if(owned&&!built[id]){
    const gz=hs.cz-k*(hs.D/2+2.8);const gh=greenhouse(scene);gh.position.set(hs.cx,0,gz);built[id]={g:gh,center:{x:hs.cx,z:gz}};
    const slots=[];const n=HOMES[id].slots;for(let i=0;i<n;i++){const row=n>4?(i<n/2?-1:1):0,col=n>4?i%(n/2):i;const per=n>4?n/2:n;slots.push(new THREE.Vector3(hs.cx-3.1+col*(6.2/(per-1||1)),0,gz+row*.95))}
    const first=G.maxPots();addPotSlots(slots);
    // the greenhouse comes with its pots, filled with soil; the Bayview lights grow faster
    const s2=S();for(let i=0;i<slots.length;i++){const j=first+i;if(!s2.pots[j])s2.pots[j]={soil:true};if(HOMES[id].bonus)s2.pots[j].boost=HOMES[id].bonus}G.refreshPots();
   }
  }
 }
 G.homesSetup=setup;
 G.maxPots=()=>world.potSlots.length;
 G.homesView=(body,repaint)=>{const s=S();s.homes=s.homes||{};
  body.append(h('p',{class:'sub'},'Buy a house and move in. Each comes with a backyard greenhouse for extra pots, and you wake up there.'));
  body.append(h('div',{class:'nw-list'},...Object.entries(HOMES).map(([id,hm])=>{const own=s.homes[id],home=s.home===id;
   const btn=own?h('button',{class:'nw-b'+(home?' go':''),onclick:()=>{s.home=id;sfx.click();G.toast('Moved into '+hm.name+'.','good');G.save();repaint()}},home?'Home':'Move in')
    :h('button',{class:'nw-b go',disabled:(s.money+(s.bank||0)<hm.price)||undefined,onclick:()=>{if(!G.payAny(hm.price))return;s.homes[id]=true;s.home=id;setup();sfx.level();G.toast('You bought '+hm.name+'! The greenhouse is out back.','good');G.save();repaint()}},money(hm.price));
   return h('div',{class:'nw-row'},h('div',{class:'grow'},h('b',{},hm.name),h('small',{},hm.desc)),h('button',{class:'nw-b',onclick:()=>{const hs=spots[id];G.setWaypoint?.({x:hs.x,z:hs.z,label:hm.name});G.closePhone();}},'Map'),btn)})));
 };
 G.homeSpawn=()=>{const s=S();const hs=s.home&&spots[s.home];return hs?{x:hs.x,z:hs.z+(hs.k||1)*1.5,yaw:(hs.k||1)>0?0:Math.PI}:null};
 G.homesInteract=P=>{const s=S();for(const [id,b]of Object.entries(built)){P(b.center.x,b.center.z+(spots[id].k||1)*2.6,2,'Sleep at '+HOMES[id].name,()=>G.sleep?.())}
  for(const [id,sg]of Object.entries(signs))P(sg.position.x,sg.position.z,1.8,'For sale: '+HOMES[id].name+' · '+money(HOMES[id].price),()=>G.openPhoneApp?.('homes'))};
 return {setup};
}

// ---------- buyers take a hit, and you see the effect ----------
export function createBuyerFx(G,{fx,player}){
 const v=new THREE.Vector3(),dir=new THREE.Vector3();
 G.npcHit=(n,key)=>{
  const {effects}=parseKey(key);const col=EFFECTS[effects.at(-1)]?.color||'#5dff8a';
  n.hit={t:0,key,effects,col:new THREE.Color(col),until:performance.now()/1000+28};n.w.goTo(n.g.position,'hold');
 };
 const glow=new THREE.SpriteMaterial({color:'#ffffff',transparent:true,opacity:.0,depthWrite:false,blending:THREE.AdditiveBlending,map:(()=>{const c=document.createElement('canvas');c.width=c.height=64;const k=c.getContext('2d');const gr=k.createRadialGradient(32,32,2,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');k.fillStyle=gr;k.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})()});
 return {update(dt,t){
  const now=performance.now()/1000;
  for(const n of G.npcs){const hi=n.hit;if(!hi)continue;if(n.dead||now>hi.until){if(n.aura){n.g.remove(n.aura);n.aura=null}n.hit=null;if(!n.dead){n.w.speed=n.w.baseSpeed||n.w.speed;n.w.release()}continue}
   hi.t+=dt;const r=n.g.userData.rig;
   // 0-3s: hand to mouth, puff, exhale
   if(hi.t<3.2){if(r){const up=hi.t>.4&&hi.t<1.6;r.rArm.rotation.x=up?-.6:-.3;r.rArm.userData.fore.rotation.x=up?-2.2:-1}
    if(hi.t>1.6&&!hi.ex){hi.ex=1;v.set(0,1.95,.3);n.g.localToWorld(v);dir.set(Math.sin(n.g.rotation.y),0,Math.cos(n.g.rotation.y));puff(fx,v,dir,{n:14,size:.9,color:'#eeeeea'})}
    if(hi.t>3.1&&!hi.go){hi.go=1;n.w.release();n.w.baseSpeed=n.w.baseSpeed||n.w.speed;
     const e=hi.effects;n.w.speed=n.w.baseSpeed*(e.includes('energy')?2:e.includes('sleepy')||e.includes('calm')?.6:1)}
    continue}
   // effect: a coloured glow around them, sparkles in the effect colour, and body language
   if(!n.aura){n.aura=new THREE.Sprite(glow.clone());n.aura.material.color.copy(hi.col);n.aura.scale.set(2.2,2.8,1);n.aura.position.y=1.25;n.g.add(n.aura)}
   n.aura.material.opacity=.22+Math.sin(t*3)*.08;
   if(Math.random()<dt*6){v.set((Math.random()-.5)*.8,1+Math.random()*1.2,(Math.random()-.5)*.8);n.g.localToWorld(v);fx.emit({x:v.x,y:v.y,z:v.z,vy:.35,size:.06,grow:.12,life:1.1,alpha:.8,color:'#'+hi.col.getHexString(),rise:.1,drag:.5})}
   const e=hi.effects;
   if(e.includes('giggly')||e.includes('fizzy'))n.g.position.y=Math.abs(Math.sin(t*7))*.18;
   if(e.includes('sleepy')&&r){r.head.rotation.x=.35+Math.sin(t)*.1}
   if(e.includes('spicy')&&r){r.head.rotation.z=Math.sin(t*20)*.08}
   if(e.includes('glow')||e.includes('fruity'))n.aura.material.opacity=.35+Math.sin(t*4)*.12;
  }
 }};
}
