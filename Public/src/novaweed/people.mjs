// Cartoon people for Nova City: one rig for customers, clerks, police and the player preview.
import * as THREE from '/vendor/three/three.module.min.js';

const SKINS=['#f1c9a5','#d9a47c','#b07a52','#8a5a3b','#5e3b26','#f5d6c0'];
const HAIRS=['#1b1310','#3b2416','#7a4a22','#c79a4e','#d8d2c8','#2b2b33','#7b2d26'];
const PANTS=['#26324a','#1d1d22','#4a4036','#33402c','#5b5f6b','#2f2a44'];
const SHIRTS=['#d64545','#3d7be0','#e0b33d','#3fae68','#8d5bd6','#e9e9ee','#2b2b33','#e57a2e','#2fb3b3'];
const pick=(arr,r)=>arr[Math.floor(r()*arr.length)];
export function rng(seed){let s=seed>>>0||1;return ()=>((s=Math.imul(s^s>>>15,s|1)^(s+Math.imul(s^s>>>7,s|61)),((s^s>>>14)>>>0)/4294967296))}

// ---------- cartoon rig ----------
// Rounded, chunky cartoon people: big round head, large eyes with heavy lids, capsule body and limbs.
// Geometries and materials are shared so a street full of people stays cheap to draw.
const GEO={};const geo=(key,make)=>GEO[key]||(GEO[key]=make());
const MATS=new Map();
const mat=(c,o={})=>{const k=c+JSON.stringify(o);if(!MATS.has(k))MATS.set(k,new THREE.MeshStandardMaterial({color:c,roughness:.72,metalness:0,...o}));return MATS.get(k)};
const part=(g,m,{x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0}={})=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(rx,ry,rz);o.castShadow=true;o.receiveShadow=true;return o};
const sphere=()=>geo('sphere',()=>new THREE.SphereGeometry(1,20,14));
const capsule=(r,l)=>geo('cap'+r+'/'+l,()=>new THREE.CapsuleGeometry(r,l,6,12));
const shade=(hex,k)=>{const c=new THREE.Color(hex);c.offsetHSL(0,0,k);return '#'+c.getHexString()};
function box(w,h,d,color,y=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.y=y;m.castShadow=true;m.receiveShadow=true;return m}


// Merge a group's direct mesh children into one mesh per material (keeps nested groups like eyelids separate).
const _m=new THREE.Matrix4();
function mergeDirect(group){
 const byMat=new Map();for(const c of [...group.children])if(c.isMesh){if(!byMat.has(c.material))byMat.set(c.material,[]);byMat.get(c.material).push(c)}
 for(const [m,list]of byMat){if(list.length<2)continue;const pos=[],nor=[],uv=[];
  for(const c of list){c.updateMatrix();const g=(c.geometry.index?c.geometry.toNonIndexed():c.geometry.clone()).applyMatrix4(c.matrix);pos.push(...g.attributes.position.array);nor.push(...g.attributes.normal.array);uv.push(...(g.attributes.uv?g.attributes.uv.array:new Float32Array(g.attributes.position.count*2)));g.dispose();group.remove(c)}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const o=new THREE.Mesh(geo,m);o.castShadow=true;o.receiveShadow=true;group.add(o)}
}
// look = {skin,hair,shirt,pants,hat,hatColor,hood,stripe,police}
export function makePerson(look={}){
 const skin=look.skin||'#e8b58e',shirtC=look.shirt||'#3d7be0',pantsC=look.pants||'#26324a';
 const g=new THREE.Group();g.userData.look=look;
 const legs=new THREE.Group(),body=new THREE.Group();g.add(legs,body);
 const skinM=mat(skin),shirtM=mat(shirtC),pantsM=mat(pantsC),shoeM=mat('#202024'),soleM=mat('#e9e6df');
 // ---- body: one smooth lathed torso, jointed legs (hip + knee) and arms (shoulder + elbow) ----
 const lathe=(key,pts)=>geo('lathe'+key,()=>new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),20));
 const taper=(rt,rb,l)=>geo('taper'+rt+'/'+rb+'/'+l,()=>{const c=new THREE.CylinderGeometry(rt,rb,l,14,1);return c});
 const mkLeg=x=>{const pivot=new THREE.Group();pivot.position.set(x,.95,0);
  pivot.add(part(sphere(),pantsM,{sx:.11,sy:.1,sz:.11}));                                   // hip ball
  pivot.add(part(taper(.105,.078,.46),pantsM,{y:-.23}));                                     // thigh
  const shin=new THREE.Group();shin.position.y=-.46;pivot.add(shin);
  shin.add(part(sphere(),pantsM,{sx:.08,sy:.08,sz:.08}));                                    // knee
  shin.add(part(taper(.076,.06,.4),pantsM,{y:-.2}));                                         // shin
  shin.add(part(geo('cuffring',()=>new THREE.TorusGeometry(.064,.018,8,18).rotateX(Math.PI/2)),mat(shade(pantsC,-.06)),{y:-.38}));
  shin.add(part(sphere(),shoeM,{y:-.44,z:.05,sx:.075,sy:.055,sz:.145}),part(sphere(),soleM,{y:-.475,z:.05,sx:.08,sy:.022,sz:.15}));
  shin.add(part(capsule(.01,.06),soleM,{y:-.405,z:.1,rx:1.25,sx:1.5}));
  legs.add(pivot);pivot.userData.shin=shin;return pivot};
 const lLeg=mkLeg(-.11),rLeg=mkLeg(.11);
 // torso: hips -> waist -> chest -> shoulders, slightly flattened front to back
 body.add(part(lathe('torso',[[0,.9],[.17,.92],[.2,.98],[.185,1.1],[.205,1.24],[.235,1.38],[.24,1.48],[.215,1.57],[.13,1.63],[.07,1.66],[0,1.67]]),shirtM,{sz:.72}));
 body.add(part(lathe('hips',[[0,.86],[.18,.87],[.205,.93],[.2,1.02],[.188,1.06],[0,1.06]]),pantsM,{sz:.74}));
 body.add(part(geo('belt',()=>new THREE.TorusGeometry(.19,.018,8,24).rotateX(Math.PI/2)),mat(look.police?'#141418':shade(pantsC,-.1)),{y:1.04,sz:.74}));
 if(look.stripe)body.add(part(lathe('stripe',[[.212,1.26],[.236,1.36],[.236,1.38],[.212,1.28]]),mat(look.stripe),{sz:.74}));
 if(look.police){body.add(part(sphere(),mat('#ffd34d',{metalness:.6,roughness:.3}),{x:.12,y:1.44,z:.17,sx:.04,sy:.045,sz:.015}))}
 // neck + collar
 body.add(part(taper(.05,.058,.16),skinM,{y:1.71}));
 body.add(part(geo('collar',()=>new THREE.TorusGeometry(.075,.022,8,20).rotateX(Math.PI/2)),mat(shade(shirtC,-.07)),{y:1.645,sz:.9}));
 // arms: shoulder ball, sleeve over the upper arm, elbow, forearm, hand with a thumb
 const mkArm=x=>{const pivot=new THREE.Group();pivot.position.set(x,1.53,0);pivot.rotation.z=x<0?-.07:.07;
  pivot.add(part(sphere(),shirtM,{sx:.072,sy:.07,sz:.072}));
  pivot.add(part(taper(.07,.06,.24),shirtM,{y:-.12}));
  pivot.add(part(taper(.054,.05,.08),skinM,{y:-.27}));
  pivot.add(part(geo('sleevering',()=>new THREE.TorusGeometry(.064,.014,8,16).rotateX(Math.PI/2)),mat(shade(shirtC,-.07)),{y:-.235}));
  const fore=new THREE.Group();fore.position.y=-.31;pivot.add(fore);
  fore.add(part(sphere(),skinM,{sx:.05,sy:.05,sz:.05}),part(taper(.05,.038,.25),skinM,{y:-.125}));
  fore.add(part(sphere(),skinM,{y:-.29,sx:.048,sy:.062,sz:.032}),part(capsule(.016,.035),skinM,{x:x<0?.04:-.04,y:-.265,z:.02,rz:x<0?-.5:.5}));
  body.add(pivot);pivot.userData.fore=fore;return pivot};
 const lArm=mkArm(-.265),rArm=mkArm(.265);
 // head: big round face, ears, nose, eyes with heavy lids, brows, mouth
 const head=new THREE.Group();head.position.y=1.98;head.scale.setScalar(.72);body.add(head);
 head.add(part(sphere(),skinM,{sx:.31,sy:.39,sz:.31}));head.add(part(sphere(),skinM,{y:-.17,z:.04,sx:.25,sy:.2,sz:.25}));
 head.add(part(sphere(),skinM,{x:-.32,y:-.02,sx:.055,sy:.08,sz:.05}),part(sphere(),skinM,{x:.32,y:-.02,sx:.055,sy:.08,sz:.05}));
 head.add(part(sphere(),skinM,{y:-.06,z:.305,sx:.055,sy:.05,sz:.055}));
 const white=mat('#f7f4ee',{roughness:.35}),pupil=mat('#16161a',{roughness:.2}),lidM=mat(shade(skin,-.02));
 const eyes=[];
 for(const s of [-1,1]){
  const eye=new THREE.Group();eye.position.set(s*.12,.04,.25);head.add(eye);
  eye.add(part(sphere(),white,{sx:.1,sy:.11,sz:.07}));
  eye.add(part(sphere(),mat(look.eye||'#5b3a24',{roughness:.3}),{z:.05,sx:.058,sy:.064,sz:.026}));
  eye.add(part(sphere(),pupil,{z:.062,sx:.032,sy:.036,sz:.02}));
  eye.add(part(sphere(),white,{x:-.014*s,y:.02,z:.076,sx:.013,sy:.013,sz:.006}));
  // upper lid: a skin-coloured cap that covers the top of the eye (half-closed, relaxed look)
  const lid=new THREE.Group();lid.position.set(0,0,0);eye.add(lid);
  lid.add(part(geo('lid',()=>new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI*.5)),lidM,{sx:.106,sy:.115,sz:.077,rx:-.55}));
  lid.rotation.x=look.sleepy===false?-.4:-.15;
  const brow=part(capsule(.012,.08),mat(look.hair||'#2b1d14'),{x:s*.12,y:.19,z:.27,rz:Math.PI/2+s*.14});head.add(brow);
  eyes.push({eye,lid,brow});
 }
 head.add(part(capsule(.01,.07),mat(shade(skin,-.18)),{y:-.17,z:look.beard==='beard'?.335:.29,rz:Math.PI/2+.08}));
 // hair: cap over the back and top of the head, with a little fringe
 const hairM=mat(look.hair||'#2b1d14',{roughness:.9});
 const hair=new THREE.Group();head.add(hair);
 const style=look.hairStyle||'short';
 hair.add(part(geo('hair',()=>new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI*.55)),hairM,style==='buzz'?{y:.05,z:-.02,sx:.336,sy:.355,sz:.322,rx:.42}:{y:.06,z:-.03,sx:.345,sy:.36,sz:.33,rx:.42}));
 if(style==='short'||style==='long')hair.add(part(sphere(),hairM,{y:.27,z:.16,sx:.24,sy:.08,sz:.13,rx:.35}));
 if(style==='curly')for(let i=0;i<11;i++){const a=i/11*Math.PI*2;hair.add(part(sphere(),hairM,{x:Math.cos(a)*.24,y:.2+Math.sin(i*1.7)*.05,z:Math.sin(a)*.22-.03,sx:.11,sy:.1,sz:.11}))}
 if(style==='long')hair.add(part(capsule(.15,.28),hairM,{y:-.22,z:-.19,sx:1.95,sz:.75}));
 if(style==='bun')hair.add(part(sphere(),hairM,{y:.3,z:-.17,sx:.13,sy:.12,sz:.13}));
 if(style==='afro')hair.add(part(sphere(),hairM,{y:.14,z:-.13,sx:.44,sy:.4,sz:.35}));
 if(look.beard==='beard'){head.add(part(geo('beard',()=>new THREE.SphereGeometry(1,20,10,0,Math.PI*2,Math.PI*.62,Math.PI*.38)),hairM,{y:-.03,sx:.325,sy:.43,sz:.335}))}
 if(look.beard==='stache')head.add(part(capsule(.022,.1),hairM,{y:-.12,z:.3,rz:Math.PI/2}));
 if(look.glasses){const gm=mat('#1b1c20',{roughness:.3});for(const s of [-1,1])head.add(part(geo('lens',()=>new THREE.TorusGeometry(.085,.012,6,18)),gm,{x:s*.12,y:.04,z:.33}));head.add(part(capsule(.01,.06),gm,{y:.05,z:.34,rz:Math.PI/2}))}
 if(look.hood){hair.visible=false;head.add(part(geo('hood',()=>new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI*.62)),shirtM,{y:.02,z:-.05,sx:.36,sy:.38,sz:.36,rx:-.45}))}
 const hatC=look.police?'#1b2a4a':look.hatColor||'#333';
 if(look.hat==='cap'||look.police){head.add(part(geo('capdome',()=>new THREE.SphereGeometry(1,18,10,0,Math.PI*2,0,Math.PI*.5)),mat(hatC),{y:.12,sx:.35,sy:.26,sz:.33}));head.add(part(sphere(),mat(hatC),{y:.14,z:.28,sx:.22,sy:.022,sz:.15}));if(look.police)head.add(part(sphere(),mat('#ffd34d',{metalness:.6,roughness:.3}),{y:.22,z:.28,sx:.04,sy:.045,sz:.015}));}
 if(look.hat==='beanie'){head.add(part(geo('beanie',()=>new THREE.SphereGeometry(1,18,10,0,Math.PI*2,0,Math.PI*.55)),mat(hatC,{roughness:.95}),{y:.08,sx:.355,sy:.35,sz:.34}));head.add(part(capsule(.035,.5),mat(shade(hatC,-.08)),{y:.1,rz:Math.PI/2,sz:5.2,sx:1,sy:1}))}
 if(look.hat==='bucket'){head.add(part(geo('bucket',()=>new THREE.CylinderGeometry(.27,.34,.2,18)),mat(hatC),{y:.27}));head.add(part(geo('brim',()=>new THREE.CylinderGeometry(.46,.46,.02,22)),mat(hatC),{y:.18}))}
 // under a hat, keep only a band of hair at the back and sides so nothing pokes through
 if(look.police||['cap','beanie','bucket'].includes(look.hat)||look.hood){hair.children.forEach((c,i)=>{if(i)c.visible=false});hair.children[0].scale.set(.33,.3,.32);hair.children[0].position.y=-.02}
 for(const grp of [lLeg,rLeg,lLeg.userData.shin,rLeg.userData.shin,body,lArm,rArm,lArm.userData.fore,rArm.userData.fore,head,hair,...eyes.map(e=>e.eye)])mergeDirect(grp);
 g.userData.rig={lLeg,rLeg,lArm,rArm,head,body,eyes,blinkAt:Math.random()*4,white};
 return g;
}
export function animatePerson(g,t,speed){
 const r=g.userData.rig;if(!r)return;
 const s=Math.min(1,speed),run=Math.max(0,Math.min(1,speed-1));
 const f=t*(5.6+Math.min(2,speed)*2.4)+(g.id%7);
 const amp=(.48+run*.22)*s,ph=Math.sin(f);
 // legs: thigh swings, knee bends while the foot travels forward (lifting it), straight on contact
 const kneeL=Math.max(0,Math.sin(f+1.5))*(1.05+run*.4)*s+.04,kneeR=Math.max(0,Math.sin(f+1.5+Math.PI))*(1.05+run*.4)*s+.04;
 r.lLeg.rotation.x=ph*amp;r.rLeg.rotation.x=-ph*amp;
 if(r.lLeg.userData.shin){r.lLeg.userData.shin.rotation.x=kneeL;r.rLeg.userData.shin.rotation.x=kneeR}
 // arms swing opposite the legs, elbows bend more on the forward swing
 const arm=amp*.85;r.lArm.rotation.x=-ph*arm;r.rArm.rotation.x=ph*arm;
 r.lArm.userData.fore.rotation.x=-.18-Math.max(0,ph)*.55*s-run*.6;r.rArm.userData.fore.rotation.x=-.18-Math.max(0,-ph)*.55*s-run*.6;
 // body: bob twice per stride, small twist, lean into a run; head stays steady
 r.body.position.y=Math.abs(Math.cos(f))*.035*s;r.body.rotation.y=ph*.07*s;r.body.rotation.x=run*.14;
 if(speed<.05){
  const br=Math.sin(t*2.1+g.id)*.01;r.body.position.y=br;r.body.scale.set(1+br*.6,1,1+br*.6);r.body.rotation.x=0;
  r.head.rotation.y=Math.sin(t*.6+g.id)*.3;r.head.rotation.x=Math.sin(t*.43+g.id*2)*.05;
  r.lArm.rotation.x=Math.sin(t*.9+g.id)*.03;r.rArm.rotation.x=-Math.sin(t*.9+g.id)*.03;
 }else{r.body.scale.set(1,1,1);r.head.rotation.y=-ph*.05;r.head.rotation.x=-run*.1}
 const cycle=(t+r.blinkAt)%4.2,blink=cycle<.12?1:0;
 for(const e of r.eyes)e.lid.scale.y=blink?2.2:1;
}
export function randomLook(seed,extra={}){const r=rng(seed);return {skin:pick(SKINS,r),hair:pick(HAIRS,r),shirt:pick(SHIRTS,r),pants:pick(PANTS,r),hat:r()<.25?'cap':r()<.15?'beanie':'none',hatColor:pick(SHIRTS,r),
 hairStyle:pick(['short','short','buzz','curly','long','bun','afro'],r),beard:r()<.18?'beard':r()<.12?'stache':null,glasses:r()<.1,pocket:r()<.4,eye:pick(['#5b3a24','#3a2416','#3d6b8f','#4c7a3c','#6b5a3a'],r),...extra}}
// Red, droopy eyes while someone is high.
const RED=new THREE.MeshStandardMaterial({color:'#f2b4ae',roughness:.35});
export function setHighEyes(g,on){const r=g?.userData?.rig;if(!r||r.high===on)return;r.high=on;
 for(const e of r.eyes){for(const c of e.eye.children)if(c.isMesh&&(c.material===r.white||c.material===RED))c.material=on?RED:r.white;e.lid.rotation.x=on?.18:-.15}}

// ---------- customers ----------
const FIRST=['Jay','Rosa','Theo','Kiki','Marcus','Lena','Omar','Priya','Dante','Mae','Gus','Ivy','Nico','Tasha','Reggie','Bea','Felix','Zoe','Hank','Luz'];
const LAST=['Park','Vega','Okafor','Lindqvist','Russo','Chen','Baker','Moreau','Diaz','Kowalski','Nguyen','Ford'];
const ALL_EFFECTS=['calm','energy','glow','spicy','fruity','focus','fresh','fizzy','giggly','sleepy'];
export function makeCustomers(count=16){
 const r=rng(4242);const out=[];
 for(let i=0;i<count;i++){
  const likes=[];while(likes.length<2){const e=pick(ALL_EFFECTS,r);if(!likes.includes(e))likes.push(e)}
  out.push({id:'c'+i,name:pick(FIRST,r)+' '+pick(LAST,r),likes,budget:40+Math.floor(r()*90),seed:1000+i*77,loyalty:0});
 }
 return out;
}

// ---------- NPC brain ----------
// Walks between sidewalk nodes, idles, can be told to come to a point (orders) and can flee.
export class Walker{
 // graph = {nodes:[[x,z]],edges:[[i]]}; walkers step to neighbouring sidewalk nodes only.
 constructor(person,graph,{speed=1.3,seed=1,start=0,route=null}={}){this.g=person;this.graph=graph;this.speed=speed;this.r=rng(seed);this.at=start;this.route=route;this.ri=0;this.target=null;this.wait=this.r()*3;this.mode='wander';this.v=0;this.forced=null;const n=graph.nodes[start];person.position.set(n[0],0,n[1])}
 pickTarget(){let next;if(this.route){this.ri=(this.ri+1)%this.route.length;next=this.route[this.ri]}else{const nb=this.graph.edges[this.at];next=nb[Math.floor(this.r()*nb.length)]}this.at=next;const n=this.graph.nodes[next];this.target=new THREE.Vector3(n[0]+(this.r()-.5)*1.2,0,n[1]+(this.r()-.5)*1.2)}
 goTo(v,mode='go'){this.forced=v.clone();this.mode=mode;this.wait=0}
 release(){this.forced=null;this.mode='wander';this.wait=1+this.r()*3}
 update(dt,t){
  const pos=this.g.position;let target=this.forced||this.target;
  if(this.mode==='hold'){this.v=0;animatePerson(this.g,t,0);return}
  if(!target||this.wait>0){this.wait-=dt;this.v=0;if(!target&&this.wait<=0)this.pickTarget();animatePerson(this.g,t,0);return}
  const d=new THREE.Vector3(target.x-pos.x,0,target.z-pos.z),dist=d.length();
  if(dist<.6){if(this.forced){this.mode=this.mode==='go'?'arrived':this.mode;this.v=0;animatePerson(this.g,t,0);return}this.target=null;this.wait=this.route?0:this.r()<.35?2+this.r()*5:0;return}
  const sp=this.speed*(this.mode==='flee'?2.4:this.mode==='chase'?2.3:1);d.normalize();pos.addScaledVector(d,Math.min(dist,sp*dt));
  const yaw=Math.atan2(d.x,d.z);let diff=yaw-this.g.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));this.g.rotation.y+=diff*Math.min(1,dt*8);
  this.v=sp;animatePerson(this.g,t,sp/1.3);
 }
}
