// Low-poly people for Nova City: one rig for customers, clerks, police and the player preview.
import * as THREE from '/vendor/three/three.module.min.js';

const SKINS=['#f1c9a5','#d9a47c','#b07a52','#8a5a3b','#5e3b26','#f5d6c0'];
const HAIRS=['#1b1310','#3b2416','#7a4a22','#c79a4e','#d8d2c8','#2b2b33','#7b2d26'];
const PANTS=['#26324a','#1d1d22','#4a4036','#33402c','#5b5f6b','#2f2a44'];
const SHIRTS=['#d64545','#3d7be0','#e0b33d','#3fae68','#8d5bd6','#e9e9ee','#2b2b33','#e57a2e','#2fb3b3'];
const pick=(arr,r)=>arr[Math.floor(r()*arr.length)];
export function rng(seed){let s=seed>>>0||1;return ()=>((s=Math.imul(s^s>>>15,s|1)^(s+Math.imul(s^s>>>7,s|61)),((s^s>>>14)>>>0)/4294967296))}

const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.85});
function box(w,h,d,color,y=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.y=y;m.castShadow=true;m.receiveShadow=true;return m}

// look = {skin,hair,shirt,pants,hat,hatColor,hood,stripe,police}
export function makePerson(look={}){
 const g=new THREE.Group();g.userData.look=look;
 const legs=new THREE.Group(),body=new THREE.Group();g.add(legs,body);
 const mkLeg=x=>{const pivot=new THREE.Group();pivot.position.set(x,.92,0);const leg=box(.2,.86,.22,look.pants,-.43);const shoe=box(.22,.12,.32,'#18181c',-.86);shoe.position.z=.05;pivot.add(leg,shoe);legs.add(pivot);return pivot};
 const lLeg=mkLeg(-.12),rLeg=mkLeg(.12);
 const torso=box(.56,.66,.3,look.shirt,1.26);body.add(torso);
 if(look.stripe){const s=box(.57,.12,.31,look.stripe,1.3);body.add(s)}
 if(look.police){const badge=box(.08,.08,.02,'#ffd34d',1.42);badge.position.set(.14,1.42,.16);body.add(badge);const belt=box(.58,.08,.32,'#111',.96);body.add(belt)}
 const mkArm=x=>{const pivot=new THREE.Group();pivot.position.set(x,1.55,0);const arm=box(.16,.6,.18,look.shirt,-.3);const hand=box(.14,.14,.14,look.skin,-.66);pivot.add(arm,hand);body.add(pivot);return pivot};
 const lArm=mkArm(-.37),rArm=mkArm(.37);
 const head=new THREE.Group();head.position.y=1.82;body.add(head);
 head.add(box(.36,.38,.34,look.skin,0));
 const hair=box(.38,.12,.36,look.hair,.2);head.add(hair);
 const eyeL=box(.05,.05,.02,'#111',.03);eyeL.position.set(-.08,.03,.18);const eyeR=eyeL.clone();eyeR.position.x=.08;head.add(eyeL,eyeR);
 if(look.hood){const hood=box(.42,.42,.4,look.shirt,.02);hood.position.z=-.04;head.add(hood);hood.scale.z=.9;hair.visible=false}
 if(look.hat==='cap'||look.police){const cap=box(.4,.12,.38,look.police?'#1b2a4a':look.hatColor,.24);const brim=box(.36,.04,.18,look.police?'#1b2a4a':look.hatColor,.2);brim.position.z=.24;head.add(cap,brim)}
 if(look.hat==='beanie'){head.add(box(.4,.2,.38,look.hatColor,.24))}
 if(look.hat==='bucket'){head.add(box(.4,.14,.38,look.hatColor,.26));const rim=box(.56,.03,.54,look.hatColor,.19);head.add(rim)}
 g.userData.rig={lLeg,rLeg,lArm,rArm,head,body};
 return g;
}
export function animatePerson(g,t,speed){
 const r=g.userData.rig;if(!r)return;
 const swing=Math.sin(t*9*Math.max(.4,speed))*Math.min(1,speed)*.7;
 r.lLeg.rotation.x=swing;r.rLeg.rotation.x=-swing;r.lArm.rotation.x=-swing*.8;r.rArm.rotation.x=swing*.8;
 r.body.position.y=Math.abs(Math.sin(t*9))*.04*Math.min(1,speed);
 if(speed<.05){r.head.rotation.y=Math.sin(t*.7+g.id)*.25;r.lArm.rotation.x*=.2;r.rArm.rotation.x*=.2}
}
export function randomLook(seed,extra={}){const r=rng(seed);return {skin:pick(SKINS,r),hair:pick(HAIRS,r),shirt:pick(SHIRTS,r),pants:pick(PANTS,r),hat:r()<.25?'cap':r()<.15?'beanie':'none',hatColor:pick(SHIRTS,r),...extra}}

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
  const sp=this.speed*(this.mode==='flee'?2.4:1);d.normalize();pos.addScaledVector(d,Math.min(dist,sp*dt));
  const yaw=Math.atan2(d.x,d.z);let diff=yaw-this.g.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));this.g.rotation.y+=diff*Math.min(1,dt*8);
  this.v=sp;animatePerson(this.g,t,sp/1.3);
 }
}
