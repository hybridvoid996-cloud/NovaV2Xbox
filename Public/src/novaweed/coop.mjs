// Nova Weed online co-op (Firebase Realtime Database).
// novaWeed/rooms/{code}:
//   host, status, createdAt
//   players/{uid}: {name, look, joinedAt, p:{x,z,y,yaw,mv,sp,held,w}, e:[events]}   each player writes their own
//      e = the player's last few events (shots, hits, damage) with increasing ids, so no extra rules are needed
//   clock: {minute, day}                                          host only
//   npcs:  [[x,z,ry,mv,1,dead], ...]  police: [[x,z,ry,mv,vis,dead], ...]   host only
//   pots/{i}: pot object ({e:1} = empty spot)                      any member (transactions)
//   chat/{push}: {uid,name,text,at}                                any member
//   gifts/{toUid}/{push}: {from,name,money?,key?,bags?,quality?}   any member
// novaWeed/invites/{uid}/{fromUid}: {code,name,at}                 friends only
import * as THREE from '/vendor/three/three.module.min.js';
import {makePerson,animatePerson,setHighEyes} from './people.mjs?v=15';
import {gunModel} from './player.mjs?v=15';

const ROOT='novaWeed';
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MAX_PLAYERS=4;
export const cleanCode=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
const EMPTY={e:1};
const packPot=p=>p&&Object.keys(p).length?JSON.parse(JSON.stringify(p)):{...EMPTY};
const unpackPot=p=>!p||p.e?{}:{...p};
const round=n=>Math.round(n*100)/100;
// Firebase rejects undefined anywhere in a write.
const clean=v=>JSON.parse(JSON.stringify(v));

export class Coop{
 constructor(net,{code,isHost,me,name,look}){
  Object.assign(this,{net,code,isHost,me,name,look});
  this.players=new Map();this.stops=[];this.clock=null;this.pots=[];this.npcTargets=null;this.policeTargets=null;
  this.sendT=0;this.npcT=0;this.clockT=0;this.tickT=0;this.lastSent='';this.handlers={};this.closed=false;this.seenChat=new Set();this.startedAt=Date.now();this.evSeq=Date.now();this.evOut=[];this.evDirty=false;
 }
 on(evt,fn){this.handlers[evt]=fn;return this}
 emit(evt,...a){try{this.handlers[evt]?.(...a)}catch(e){console.error(e)}}
 r(path){return this.net.fb.ref(this.net.db,ROOT+'/rooms/'+this.code+(path?'/'+path:''))}

 static async create(net,{me,name,look,pots,clock,visibility='private'}){
  const {runTransaction,onDisconnect}=net.fb;let code;
  for(let i=0;i<6&&!code;i++){
   const c=Array.from(crypto.getRandomValues(new Uint32Array(5)),n=>ALPHABET[n%ALPHABET.length]).join('');
   const res=await runTransaction(net.fb.ref(net.db,ROOT+'/rooms/'+c),cur=>cur?undefined:clean({host:me,status:'open',visibility,createdAt:Date.now(),clock,pots:pots.map(packPot),players:{[me]:{name,look,joinedAt:Date.now()}}}));
   if(res.committed)code=c;
  }
  if(!code)throw Error('Could not create a session. Try again.');
  const room=new Coop(net,{code,isHost:true,me,name,look});
  await onDisconnect(room.r('status')).set('closed');
  await onDisconnect(room.r('players/'+me)).remove();
  room.visibility=visibility;if(visibility==='public'){try{await onDisconnect(room.lobbyRef()).remove()}catch{}room.postLobby()}
  room.listen();return room;
 }
 // Public sessions other players can find and join
 lobbyRef(){return this.net.fb.ref(this.net.db,ROOT+'/lobbies/'+this.code)}
 postLobby(){if(!this.isHost||this.visibility!=='public'||this.closed)return;this.net.fb.set(this.lobbyRef(),clean({name:this.name+'’s island',host:this.name,hostUid:this.me,count:this.players.size+1,max:MAX_PLAYERS,day:this.lastDay||1,updatedAt:Date.now()})).catch(()=>{})}
 static watchLobbies(net,cb,onError){return net.fb.onValue(net.fb.ref(net.db,ROOT+'/lobbies'),s=>{const now=Date.now();cb(Object.entries(s.val()||{}).map(([code,l])=>({code,...l})).filter(l=>now-(l.updatedAt||0)<90000&&l.count<l.max).sort((a,b)=>b.updatedAt-a.updatedAt))},e=>onError?.(e))}
 static async join(net,code,{me,name,look}){
  code=cleanCode(code);if(code.length!==5)throw Error('Session codes are 5 characters.');
  const {get,set,onDisconnect}=net.fb;
  let snap;try{snap=await get(net.fb.ref(net.db,ROOT+'/rooms/'+code))}catch{throw Error('That session does not exist.')}
  const data=snap.val();
  if(!data||data.status!=='open')throw Error('That session is closed or does not exist.');
  if(data.kicked?.[me])throw Error('The host removed you from this session.');
  if(data.host===me)throw Error('You are the host of that session. Start it from Host instead.');
  if(!data.players?.[me]&&Object.keys(data.players||{}).length>=MAX_PLAYERS)throw Error('That session is full (4 players).');
  const room=new Coop(net,{code,isHost:false,me,name,look});
  await set(room.r('players/'+me),clean({name,look,joinedAt:Date.now()}));
  await onDisconnect(room.r('players/'+me)).remove();
  room.listen();return room;
 }

 listen(){
  const {onValue,onChildAdded}=this.net.fb;
  this.stops.push(onValue(this.r('status'),s=>{if(this.closed)return;if(s.val()==='closed'&&!this.isHost){this.emit('closed');this.leave()}}));
  this.stops.push(onValue(this.r('players'),s=>{
   const data=s.val()||{};
   if(!this.isHost&&this.joinedOnce&&!data[this.me]){this.emit('kicked');this.leave();return}
   if(data[this.me])this.joinedOnce=true;
   for(const [uid,p]of Object.entries(data)){if(uid===this.me)continue;let rp=this.players.get(uid);
    if(!rp){rp={uid,name:p.name||'Player',look:p.look||{},target:new THREE.Vector3(),yaw:0,mv:0,model:null,samples:[],lastP:'',evSeen:null,vs:0};this.players.set(uid,rp);this.emit('join',rp)}
    if(JSON.stringify(p.look||{})!==JSON.stringify(rp.look)){rp.look=p.look||{};this.emit('look',rp)}
    if(p.p){const key=JSON.stringify(p.p);if(key!==rp.lastP){rp.lastP=key;const now=performance.now(),last=rp.samples.at(-1);
      // after a pause, restart interpolation from where they stood instead of sliding slowly
      if(last&&now-last.t>250)rp.samples.push({...last,t:now-90});
      rp.samples.push({t:now,x:p.p.x,y:p.p.y||0,z:p.p.z,yaw:p.p.yaw||0});if(rp.samples.length>30)rp.samples.splice(0,rp.samples.length-30)}
     rp.target.set(p.p.x,0,p.p.z);rp.yaw=p.p.yaw;rp.mv=p.p.mv;rp.held=p.p.held;rp.w=p.p.w||0;rp.high=!!p.p.h}
    const ev=Array.isArray(p.e)?p.e:Object.values(p.e||{});
    if(rp.evSeen==null)rp.evSeen=ev.reduce((m,e)=>Math.max(m,e?.id||0),0);
    else for(const e of ev.filter(e=>e&&e.id>rp.evSeen).sort((a,b)=>a.id-b.id)){rp.evSeen=e.id;this.emit('event',rp,e)}}
   for(const [uid,rp]of this.players)if(!data[uid]){this.players.delete(uid);this.emit('leave',rp)}
   this.count=Object.keys(data).length;
  }));
  this.stops.push(onValue(this.r('pots'),s=>{const v=s.val();if(!v)return;this.pots=Object.values(v).map(unpackPot);this.emit('pots',this.pots)}));
  if(!this.isHost){
   this.stops.push(onValue(this.r('clock'),s=>{if(s.val())this.clock=s.val()}));
   this.stops.push(onValue(this.r('npcs'),s=>{this.npcTargets=s.val()}));
   this.stops.push(onValue(this.r('police'),s=>{this.policeTargets=s.val()}));
  }
  this.stops.push(onChildAdded(this.r('chat'),s=>{const m=s.val();if(!m||this.seenChat.has(s.key))return;this.seenChat.add(s.key);if(m.at<this.startedAt-5000)return;this.emit('chat',m)}));
  this.stops.push(onChildAdded(this.r('gifts/'+this.me),s=>{const g=s.val();this.net.fb.remove(s.ref).catch(()=>{});if(g)this.emit('gift',g)}));
 }

 // Called every frame by the game.
 // Queue an event (shot, hit, damage). It goes out with the next position update.
 emitEvent(ev){this.evOut.push(clean({...ev,id:++this.evSeq}));if(this.evOut.length>12)this.evOut.shift();this.evDirty=true}
 update(dt,{pos,yaw,moving,held,npcs,police,clock,speed=0,wanted=0,high=0}){
  if(this.closed)return;
  const {update,set}=this.net.fb;
  this.sendT-=dt;
  if(this.sendT<=0||this.evDirty){this.sendT=.08;const p={x:round(pos.x),z:round(pos.z),y:round(pos.y||0),yaw:round(yaw),mv:moving?1:0,sp:round(speed),held:held||'',w:wanted,h:high};const key=JSON.stringify(p);
   if(key!==this.lastSent||this.evDirty){this.lastSent=key;const out={p};if(this.evDirty){out.e=this.evOut;this.evDirty=false}update(this.r('players/'+this.me),out).catch(()=>{})}}
  if(!this.isHost)return;
  this.npcT-=dt;
  if(this.npcT<=0){this.npcT=.25;update(this.r(),{npcs:npcs.map(n=>[round(n.g.position.x),round(n.g.position.z),round(n.g.rotation.y),n.w.v>.1&&!n.dead?1:0,1,n.dead?1:0]),police:police.map(o=>[round(o.g.position.x),round(o.g.position.z),round(o.g.rotation.y),o.w.v>.1&&!o.dead?1:0,o.g.visible?1:0,o.dead?1:0])}).catch(()=>{})}
  this.lobbyT=(this.lobbyT||0)-dt;if(this.lobbyT<=0){this.lobbyT=20;this.lastDay=clock.day;this.postLobby()}
  this.clockT-=dt;
  if(this.clockT<=0){this.clockT=3;set(this.r('clock'),{minute:clock.minute,day:clock.day}).catch(()=>{})}
 }
 pushClock(clock){if(this.isHost)this.net.fb.set(this.r('clock'),{minute:clock.minute,day:clock.day}).catch(()=>{})}

 // Atomic pot change. fn(pot) returns the new pot or undefined to abort.
 async mutatePot(i,fn){
  const res=await this.net.fb.runTransaction(this.r('pots/'+i),cur=>{const pot=unpackPot(cur);const next=fn(pot);return next===undefined?undefined:packPot(next)});
  return res.committed?unpackPot(res.snapshot.val()):null;
 }
 async setPots(pots){if(this.isHost)await this.net.fb.set(this.r('pots'),pots.map(packPot))}
 async addPot(){return this.net.fb.runTransaction(this.r('pots'),cur=>{const arr=Array.isArray(cur)?cur:Object.values(cur||{});if(arr.length>=8)return undefined;return [...arr,{...EMPTY}]})}
 chat(text){text=String(text||'').trim().slice(0,160);if(!text)return;return this.net.fb.push(this.r('chat'),{uid:this.me,name:this.name,text,at:Date.now()})}
 gift(to,payload){return this.net.fb.push(this.r('gifts/'+to),clean({from:this.me,name:this.name,...payload,at:Date.now()}))}
 setLook(look){this.look=look;return this.net.fb.set(this.r('players/'+this.me+'/look'),clean(look)).catch(()=>{})}
 async kick(uid){if(!this.isHost)return;await this.net.fb.update(this.r(),{['players/'+uid]:null,['kicked/'+uid]:true})}
 async invite(friendUid){return this.net.fb.set(this.net.fb.ref(this.net.db,ROOT+'/invites/'+friendUid+'/'+this.me),{code:this.code,name:this.name,at:Date.now()})}
 async leave(){
  if(this.closed)return;this.closed=true;for(const s of this.stops)s();this.stops=[];
  const {remove,set,onDisconnect}=this.net.fb;
  try{if(this.isHost&&this.visibility==='public')await remove(this.lobbyRef())}catch{}
  try{if(this.isHost)await set(this.r('status'),'closed');else{await remove(this.r('players/'+this.me));onDisconnect(this.r('players/'+this.me)).cancel()}}catch{}
  this.emit('left');
 }
}

// ---------- remote player avatars ----------
function nameTag(text){
 const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');
 x.fillStyle='rgba(0,0,0,.55)';x.beginPath();x.roundRect(8,10,240,44,22);x.fill();
 x.font='bold 26px Segoe UI, sans-serif';x.fillStyle='#5dff8a';x.textAlign='center';x.textBaseline='middle';x.fillText(text.slice(0,18),128,33);
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true}));s.scale.set(1.6,.4,1);s.position.y=2.45;s.renderOrder=20;return s;
}
export function spawnAvatar(scene,rp){
 if(rp.model)scene.remove(rp.model);
 const g=makePerson({skin:'#e2b48c',hair:'#2b1d14',pants:'#26324a',...rp.look});g.add(nameTag(rp.name));
 const last=rp.samples?.at(-1);if(last){g.position.set(last.x,last.y,last.z);g.rotation.y=last.yaw+Math.PI}else g.visible=false;
 const hand=new THREE.Group();g.add(hand);g.userData.hand=hand;rp.heldTag=null;
 scene.add(g);rp.model=g;return g;
}

// Small props other players hold, built once per kind.
const PROP_MATS={};const pm=(k,o)=>PROP_MATS[k]||(PROP_MATS[k]=new THREE.MeshStandardMaterial(o));
function prop(tag){
 const kind=tag.split(':')[0];
 if(kind==='gun'){const m=gunModel(tag.split(':')[1]);m.rotation.y=Math.PI;m.scale.setScalar(1.25);return m}
 const g=new THREE.Group();let m;
 if(kind==='bag'){m=new THREE.Mesh(new THREE.BoxGeometry(.12,.16,.03),pm('bag',{color:'#e8f5e9',transparent:true,opacity:.8}))}
 else if(kind==='drink'){m=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.14,12),pm('can',{color:'#3fa9d6',metalness:.6,roughness:.3}))}
 else if(kind==='vape'||kind==='vaping'){m=new THREE.Mesh(new THREE.CapsuleGeometry(.02,.11,4,10),pm('vape',{color:'#7fe3ff',metalness:.5,roughness:.3}))}
 else if(kind==='smoking'){m=new THREE.Mesh(new THREE.CylinderGeometry(.008,.012,.13,8).rotateX(Math.PI/2),pm('joint',{color:'#f2efe6'}));const tip=new THREE.Mesh(new THREE.SphereGeometry(.013,8,8),pm('tip',{color:'#ff7a2a',emissive:'#ff5a00',emissiveIntensity:2}));tip.position.z=.065;m.add(tip)}
 else if(kind==='seed'||kind==='med'){m=new THREE.Mesh(new THREE.BoxGeometry(.1,.13,.03),pm('pack',{color:kind==='med'?'#f2f2f2':'#c9a86b'}))}
 else return null;
 g.add(m);return g;
}
// Arm poses on top of the walk cycle: aim a gun, hold something, bring a joint/vape up to the mouth.
function pose(g,tag,t){
 const r=g.userData.rig,hand=g.userData.hand,kind=(tag||'').split(':')[0];
 if(kind==='gun'){r.rArm.rotation.x=-1.45;r.rArm.rotation.z=.12;r.rArm.userData.fore.rotation.x=0;r.lArm.rotation.x=-1.25;r.lArm.rotation.z=-.42;r.lArm.userData.fore.rotation.x=-.25;hand.position.set(-.1,1.42,.62);hand.rotation.set(0,0,0)}
 else if(kind==='smoking'||kind==='vaping'){const up=(Math.sin(t*1.3)+1)/2>.55;r.rArm.rotation.x=up?-.55:-.35;r.rArm.userData.fore.rotation.x=up?-2.1:-1.1;hand.position.set(-.27,up?1.82:1.25,up?.3:.36)}
 else if(kind){r.rArm.rotation.x=-.45;r.rArm.userData.fore.rotation.x=-1;hand.position.set(-.29,1.13,.38)}
}
export function updateAvatars(players,dt,t){
 const now=performance.now()-130; // render slightly in the past so there are always two samples to blend
 for(const rp of players.values()){const g=rp.model;if(!g)continue;const s=rp.samples||[];
  if(!s.length){g.visible=false;continue}g.visible=true;
  while(s.length>2&&s[1].t<=now)s.shift();
  const a=s[0],b=s[1];let x=a.x,y=a.y,z=a.z,yaw=a.yaw;
  if(b&&now>a.t){const k=Math.min(1,(now-a.t)/Math.max(1,b.t-a.t));x=a.x+(b.x-a.x)*k;y=a.y+(b.y-a.y)*k;z=a.z+(b.z-a.z)*k;let dy=b.yaw-a.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));yaw=a.yaw+dy*k}
  const moved=Math.hypot(x-g.position.x,z-g.position.z);
  const nowR=performance.now(),rdt=Math.max(.001,(nowR-(rp.lastT||nowR))/1000);rp.lastT=nowR;
  g.position.set(x,y,z);if(moved<15)rp.vs+=(moved/rdt-rp.vs)*Math.min(1,rdt*8);
  let diff=(yaw+Math.PI)-g.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));g.rotation.y+=diff*Math.min(1,dt*14);
  animatePerson(g,t,Math.min(2.4,rp.vs/1.5));setHighEyes(g,!!rp.high);
  // what they're holding
  const tag=typeof rp.held==='string'&&!rp.held.startsWith('v:')?rp.held:'';
  if(tag!==rp.heldTag){rp.heldTag=tag;g.userData.hand.clear();const p=tag&&prop(tag);if(p)g.userData.hand.add(p);rp.muzzle=p?.userData?.muzzle||null}
  pose(g,tag,t);
 }
}
// Clients draw host-simulated NPCs, smoothing between 4Hz updates, and copy knockdowns from the host.
export function applyTargets(list,targets,dt,t){
 if(!targets)return;
 list.forEach((n,i)=>{const tg=targets[i];if(!tg)return;const g=n.g;
  const dead=!!tg[5];
  if(dead&&!n.dead){n.dead=true;n.deadT=0;n.order=null}
  if(!dead&&n.dead){n.dead=false;n.hp=undefined;g.rotation.x=0;g.position.y=0;g.position.set(tg[0],0,tg[1])}
  if(n.dead)return;
  const tx=tg[0],tz=tg[1];
  const dx=tx-g.position.x,dz=tz-g.position.z,dist=Math.hypot(dx,dz);
  if(dist>10)g.position.set(tx,0,tz);else{g.position.x+=dx*Math.min(1,dt*6);g.position.z+=dz*Math.min(1,dt*6)}
  let diff=tg[2]-g.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));g.rotation.y+=diff*Math.min(1,dt*8);
  if(tg.length>4)g.visible=!!tg[4];
  n.w.v=tg[3]?1.3:0;animatePerson(g,t,tg[3]?1:0);
 });
}
