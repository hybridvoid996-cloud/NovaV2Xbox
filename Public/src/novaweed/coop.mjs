// Nova Weed online co-op (Firebase Realtime Database).
// novaWeed/rooms/{code}:
//   host, status, createdAt
//   players/{uid}: {name, look, joinedAt, p:{x,z,yaw,mv,held}}   each player writes their own
//   clock: {minute, day}                                          host only
//   npcs:  [[x,z,ry,mv], ...]  police: [[x,z,ry,mv,vis], ...]       host only
//   pots/{i}: pot object ({e:1} = empty spot)                      any member (transactions)
//   chat/{push}: {uid,name,text,at}                                any member
//   gifts/{toUid}/{push}: {from,name,money?,key?,bags?,quality?}   any member
// novaWeed/invites/{uid}/{fromUid}: {code,name,at}                 friends only
import * as THREE from '/vendor/three/three.module.min.js';
import {makePerson,animatePerson} from './people.mjs';

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
  this.sendT=0;this.npcT=0;this.clockT=0;this.tickT=0;this.lastSent='';this.handlers={};this.closed=false;this.seenChat=new Set();this.startedAt=Date.now();
 }
 on(evt,fn){this.handlers[evt]=fn;return this}
 emit(evt,...a){try{this.handlers[evt]?.(...a)}catch(e){console.error(e)}}
 r(path){return this.net.fb.ref(this.net.db,ROOT+'/rooms/'+this.code+(path?'/'+path:''))}

 static async create(net,{me,name,look,pots,clock}){
  const {runTransaction,onDisconnect}=net.fb;let code;
  for(let i=0;i<6&&!code;i++){
   const c=Array.from(crypto.getRandomValues(new Uint32Array(5)),n=>ALPHABET[n%ALPHABET.length]).join('');
   const res=await runTransaction(net.fb.ref(net.db,ROOT+'/rooms/'+c),cur=>cur?undefined:clean({host:me,status:'open',createdAt:Date.now(),clock,pots:pots.map(packPot),players:{[me]:{name,look,joinedAt:Date.now()}}}));
   if(res.committed)code=c;
  }
  if(!code)throw Error('Could not create a session. Try again.');
  const room=new Coop(net,{code,isHost:true,me,name,look});
  await onDisconnect(room.r('status')).set('closed');
  await onDisconnect(room.r('players/'+me)).remove();
  room.listen();return room;
 }
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
    if(!rp){rp={uid,name:p.name||'Player',look:p.look||{},target:new THREE.Vector3(),yaw:0,mv:0,model:null};this.players.set(uid,rp);this.emit('join',rp)}
    if(JSON.stringify(p.look||{})!==JSON.stringify(rp.look)){rp.look=p.look||{};this.emit('look',rp)}
    if(p.p){rp.target.set(p.p.x,0,p.p.z);rp.yaw=p.p.yaw;rp.mv=p.p.mv;rp.held=p.p.held}}
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
 update(dt,{pos,yaw,moving,held,npcs,police,clock}){
  if(this.closed)return;
  const {update,set}=this.net.fb;
  this.sendT-=dt;
  if(this.sendT<=0){this.sendT=.1;const p={x:round(pos.x),z:round(pos.z),yaw:round(yaw),mv:moving?1:0,held:held||''};const key=JSON.stringify(p);if(key!==this.lastSent){this.lastSent=key;set(this.r('players/'+this.me+'/p'),p).catch(()=>{})}}
  if(!this.isHost)return;
  this.npcT-=dt;
  if(this.npcT<=0){this.npcT=.25;update(this.r(),{npcs:npcs.map(n=>[round(n.g.position.x),round(n.g.position.z),round(n.g.rotation.y),n.w.v>.1?1:0]),police:police.map(o=>[round(o.g.position.x),round(o.g.position.z),round(o.g.rotation.y),o.w.v>.1?1:0,o.g.visible?1:0])}).catch(()=>{})}
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
 g.position.copy(rp.target);g.rotation.y=rp.yaw+Math.PI;scene.add(g);rp.model=g;return g;
}
export function updateAvatars(players,dt,t){
 for(const rp of players.values()){const g=rp.model;if(!g)continue;
  const d=rp.target.clone().sub(g.position);const dist=d.length();
  if(dist>15)g.position.copy(rp.target);else g.position.addScaledVector(d,Math.min(1,dt*10));
  let diff=(rp.yaw+Math.PI)-g.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));g.rotation.y+=diff*Math.min(1,dt*10);
  animatePerson(g,t,rp.mv?Math.min(1.6,dist*4+.6):0);
 }
}
// Clients draw host-simulated NPCs, smoothing between 4Hz updates.
export function applyTargets(list,targets,dt,t){
 if(!targets)return;
 list.forEach((n,i)=>{const tg=targets[i];if(!tg)return;const g=n.g;const tx=tg[0],tz=tg[1];
  const dx=tx-g.position.x,dz=tz-g.position.z,dist=Math.hypot(dx,dz);
  if(dist>10)g.position.set(tx,0,tz);else{g.position.x+=dx*Math.min(1,dt*6);g.position.z+=dz*Math.min(1,dt*6)}
  let diff=tg[2]-g.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));g.rotation.y+=diff*Math.min(1,dt*8);
  if(tg.length>4)g.visible=!!tg[4];
  n.w.v=tg[3]?1.3:0;animatePerson(g,t,tg[3]?1:0);
 });
}
