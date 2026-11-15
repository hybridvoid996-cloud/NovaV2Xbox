// Nova Weed rides: a skateboard, a moped and three cars you buy from the Rides app.
// Arcade driving with a chase camera; cars stay parked where you leave them.
import * as THREE from '/vendor/three/three.module.min.js';
import {makePerson} from './people.mjs?v=15';
import {exhaust} from './fx.mjs?v=15';
import {BOARDS} from './economy.mjs?v=15';
import {clampToIsland,heightAt} from './env.mjs?v=15';

export const RIDES={
 skate:{name:'Nova Deck',kind:'skate',price:60,rank:0,desc:'Skateboard. Press B to hop on or off, Space to ollie.',color:'#ff7ad9'},
 moped:{name:'Zip 50 Moped',kind:'moped',price:480,rank:0,top:15,accel:7,turn:2.6,color:'#5ec8e5',desc:'Small, quick, fits anywhere.'},
 hatch:{name:'Nova Hatch',kind:'car',price:1500,rank:1,top:23,accel:8.5,turn:1.9,color:'#e86a4a',body:'hatch',desc:'A cheap little hatchback that gets you around town.'},
 pickup:{name:'Ridgeback Pickup',kind:'car',price:2600,rank:2,top:21,accel:7.5,turn:1.65,color:'#3b7d5a',body:'pickup',desc:'Tough truck with an open bed.'},
 muscle:{name:'Comet GT',kind:'car',price:4800,rank:3,top:32,accel:13,turn:1.85,color:'#ffd23f',body:'muscle',desc:'Loud, low and very fast.'}
};
const MATS={};const mat=(k,o)=>MATS[k]||(MATS[k]=new THREE.MeshStandardMaterial(o));
// side profile (z forward, y up) extruded across the car's width
function profile(points,width,bevel=.06){
 const s=new THREE.Shape();s.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))s.lineTo(p[0],p[1]);s.closePath();
 const g=new THREE.ExtrudeGeometry(s,{depth:width-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:4});
 g.translate(0,0,-(width-bevel*2)/2);g.rotateY(-Math.PI/2);return g;
}
function wheel(r,w){
 const g=new THREE.Group();const tire=new THREE.Mesh(new THREE.CylinderGeometry(r,r,w,18).rotateZ(Math.PI/2),mat('tire',{color:'#17181b',roughness:.9}));
 const rim=new THREE.Mesh(new THREE.CylinderGeometry(r*.58,r*.58,w+.02,12).rotateZ(Math.PI/2),mat('rim',{color:'#c9ced6',metalness:.8,roughness:.25}));
 const hub=new THREE.Mesh(new THREE.BoxGeometry(w+.04,r*.9,.08),mat('hub',{color:'#8d939c',metalness:.7,roughness:.3}));
 g.add(tire,rim,hub);g.traverse(o=>{if(o.isMesh)o.castShadow=true});return g;
}
export function carModel(id){
 const R=RIDES[id],g=new THREE.Group(),paint=mat('paint'+id,{color:R.color,metalness:.45,roughness:.32}),glass=mat('glass',{color:'#6f8fae',metalness:.35,roughness:.08,emissive:'#14202c',emissiveIntensity:.4}),dark=mat('trimdark',{color:'#1b1d21',roughness:.6}),chrome=mat('chrome',{color:'#d9dde3',metalness:.9,roughness:.2});
 const add=(geo,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o};
 const head=mat('headlight',{color:'#fffbe8',emissive:'#fff2c0',emissiveIntensity:.4}),tail=mat('taillight',{color:'#7a0d10',emissive:'#ff2a2a',emissiveIntensity:.6});
 let W=1.9,front=2.1,rear=-2.05,wz=1.32,wr=.37;
 if(R.body==='hatch'){
  add(profile([[rear,.3],[front,.3],[front+.1,.58],[front-.05,.86],[.9,.98],[rear+.1,1.02],[rear-.02,.7]],W),paint);
  add(profile([[.86,.97],[.1,1.56],[-1.45,1.6],[rear+.12,1.0]],W-.14,.04),glass);
  add(new THREE.BoxGeometry(W-.24,.07,1.5),paint,0,1.62,-.68);
 }else if(R.body==='pickup'){
  front=2.35;rear=-2.45;wz=1.55;wr=.42;W=2.0;
  add(profile([[rear,.38],[front,.38],[front+.08,.7],[front-.05,1.02],[.95,1.08],[.95,1.0],[rear,1.0]],W),paint);
  add(profile([[.92,1.06],[.35,1.7],[-.75,1.72],[-.8,1.06]],W-.12,.04),glass);
  add(new THREE.BoxGeometry(W-.2,.07,1.15),paint,0,1.74,-.2);
  for(const sx of [-1,1])add(new THREE.BoxGeometry(.1,.42,1.6),paint,sx*(W/2-.05),1.2,-1.65);add(new THREE.BoxGeometry(W,.42,.1),paint,0,1.2,rear+.05);
  add(new THREE.BoxGeometry(W-.2,.05,1.55),dark,0,1.02,-1.65);
 }else{ // muscle
  front=2.3;rear=-2.25;W=2.0;wr=.38;wz=1.45;
  add(profile([[rear,.28],[front,.28],[front+.08,.52],[front-.1,.74],[.6,.84],[rear+.05,.86],[rear-.04,.6]],W),paint);
  add(profile([[.55,.83],[-.15,1.3],[-1.2,1.32],[-1.75,.86]],W-.24,.04),glass);
  add(new THREE.BoxGeometry(W-.36,.06,1.0),paint,0,1.34,-.68);
  for(const sx of [-.22,.22])add(new THREE.BoxGeometry(.18,.012,4.3),mat('stripe',{color:'#1b1d21',roughness:.4}),sx,.885,0);
  add(new THREE.BoxGeometry(1.6,.08,.3),dark,0,.95,rear+.15); // spoiler
  add(new THREE.BoxGeometry(.6,.18,.9),dark,0,.92,1.2); // hood scoop
 }
 // lights, bumpers, grille, mirrors
 for(const sx of [-1,1]){add(new THREE.BoxGeometry(.42,.16,.06),head,sx*(W/2-.36),.68,front+.06);add(new THREE.BoxGeometry(.36,.14,.06),tail,sx*(W/2-.3),.74,rear-.03);
  add(new THREE.BoxGeometry(.08,.1,.22),dark,sx*(W/2+.06),1.05,.75)}
 add(new THREE.BoxGeometry(W+.04,.16,.18),chrome,0,.38,front+.06);add(new THREE.BoxGeometry(W+.04,.16,.18),chrome,0,.38,rear-.05);
 add(new THREE.BoxGeometry(W*.42,.18,.05),dark,0,.62,front+.09);
 const plate=add(new THREE.BoxGeometry(.5,.14,.03),mat('plate',{color:'#f3efe6'}),0,.55,rear-.06);
 // wheels: front ones steer
 const wheels=[],steer=[];
 for(const [sx,sz]of [[-1,1],[1,1],[-1,-1],[1,-1]]){const piv=new THREE.Group();piv.position.set(sx*(W/2-.12),wr,sz*wz);const w=wheel(wr,.28);piv.add(w);g.add(piv);wheels.push(w);if(sz>0)steer.push(piv);
  add(new THREE.BoxGeometry(.3,.12,wr*2.3),dark,sx*(W/2-.1),wr*2+.02,sz*wz)} // arches
 g.userData={wheels,steer,wr,radius:Math.max(front,-rear)*.55,len:front-rear,head,tail,exhaust:new THREE.Vector3(.5,.32,rear-.1)};
 return g;
}
export function mopedModel(id){
 const R=RIDES[id],g=new THREE.Group(),paint=mat('paint'+id,{color:R.color,metalness:.4,roughness:.35}),dark=mat('trimdark',{color:'#1b1d21',roughness:.6}),chrome=mat('chrome',{color:'#d9dde3',metalness:.9,roughness:.2});
 const add=(geo,m,x=0,y=0,z=0,rx=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.rotation.x=rx;o.castShadow=true;g.add(o);return o};
 add(new THREE.BoxGeometry(.5,.3,1.1),paint,0,.55,-.15);add(new THREE.BoxGeometry(.42,.12,.7),dark,0,.76,-.3);           // body + seat
 add(new THREE.BoxGeometry(.36,.06,.6),dark,0,.32,.35);                                                                     // floorboard
 add(new THREE.BoxGeometry(.4,.75,.16),paint,0,.72,.68,-.25);                                                               // front shield
 add(new THREE.CylinderGeometry(.025,.025,.7,8).rotateZ(Math.PI/2),chrome,0,1.15,.78);                                     // handlebar
 add(new THREE.BoxGeometry(.16,.12,.06),mat('headlight',{color:'#fffbe8',emissive:'#fff2c0',emissiveIntensity:.4}),0,1.02,.84);
 add(new THREE.BoxGeometry(.18,.08,.05),mat('taillight',{color:'#7a0d10',emissive:'#ff2a2a',emissiveIntensity:.6}),0,.66,-.72);
 const wheels=[],steer=[];
 for(const z of [.72,-.62]){const piv=new THREE.Group();piv.position.set(0,.27,z);const w=wheel(.27,.12);piv.add(w);g.add(piv);wheels.push(w);if(z>0)steer.push(piv)}
 g.userData={wheels,steer,wr:.27,radius:.7,len:1.6,exhaust:new THREE.Vector3(.18,.3,-.75)};return g;
}
function boardModel(color){
 const g=new THREE.Group();const deck=new THREE.Mesh(new THREE.BoxGeometry(.24,.035,.86),mat('deck'+color,{color,roughness:.6}));deck.position.y=.11;
 const grip=new THREE.Mesh(new THREE.BoxGeometry(.22,.006,.8),mat('grip',{color:'#202226',roughness:.95}));grip.position.y=.13;
 for(const z of [-.42,.42]){const k=new THREE.Mesh(new THREE.BoxGeometry(.24,.035,.12),deck.material);k.position.set(0,.13,z);k.rotation.x=z>0?-.35:.35;g.add(k)}
 for(const z of [-.28,.28]){const truck=new THREE.Mesh(new THREE.BoxGeometry(.18,.04,.05),mat('chrome',{color:'#d9dde3',metalness:.9,roughness:.2}));truck.position.set(0,.075,z);g.add(truck);
  for(const x of [-.1,.1]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.04,10).rotateZ(Math.PI/2),mat('skwheel',{color:'#f3efe6',roughness:.5}));w.position.set(x,.04,z);g.add(w)}}
 g.add(deck,grip);g.traverse(o=>{if(o.isMesh)o.castShadow=true});return g;
}

export function createRides(G,{scene,camera,player,world,fx,sfx,engine,h,hud,money}){
 const S=()=>G.S;const parked=new Map();// id -> {g,x,z,heading}
 let drive=null;G.driving=false;G.boarding=false;
 const speedo=h('div',{class:'nw-speedo',hidden:true});hud.append(speedo);
 const board=boardModel(RIDES.skate.color);board.visible=false;scene.add(board);
 const v=new THREE.Vector3(),fwd=new THREE.Vector3();
 const SPOTS=[[-15,-4.3],[-21,-4.3],[-27,-4.3],[-33,-4.3]];
 function model(id){return RIDES[id].kind==='car'?carModel(id):mopedModel(id)}
 function free(x,z,r){return !world.colliders.some(c=>c.h>.6&&x>c.minX-r&&x<c.maxX+r&&z>c.minZ-r&&z<c.maxZ+r)}
 function spawnParked(id){
  if(parked.has(id)||RIDES[id].kind==='skate')return;const s=S();s.rides=s.rides||{};
  let at=s.rides[id];if(!at||at.x==null){const i=Object.keys(RIDES).indexOf(id)-1;const sp=SPOTS[Math.max(0,i)%SPOTS.length];at=s.rides[id]={...s.rides[id],x:sp[0],z:sp[1],heading:Math.PI/2}}
  const g=model(id);g.position.set(at.x,0,at.z);g.rotation.y=at.heading;scene.add(g);parked.set(id,{g,id});
 }
 function load(){for(const p of parked.values())scene.remove(p.g);parked.clear();const s=S();for(const id of Object.keys(s.rides||{}))if(s.rides[id]?.owned)spawnParked(id)}
 // ---------- driving ----------
 function enter(id){
  const p=parked.get(id);if(!p)return;const R=RIDES[id];
  if(G.boarding)toggleBoard(false);
  drive={id,R,g:p.g,pos:p.g.position.clone(),heading:p.g.rotation.y,speed:0,steer:0,camPos:camera.position.clone(),off:0,lastYaw:player.yaw,smokeT:0,hitT:0};
  G.driving=true;player.setHeld(null);player.arms.visible=false;sfx.door();engine.set(R.kind==='moped'?'moped':'car',0);
  if(R.kind==='moped'){const rider=makePerson(G.outfitLook());rider.position.set(0,.3,-.2);rider.userData.rig.lLeg.rotation.x=rider.userData.rig.rLeg.rotation.x=-1.25;rider.userData.rig.lArm.rotation.x=rider.userData.rig.rArm.rotation.x=-1.1;p.g.add(rider);drive.rider=rider}
  speedo.hidden=false;
 }
 function exit(){
  if(!drive)return;const d=drive;d.rider&&d.g.remove(d.rider);
  const right=new THREE.Vector3(Math.cos(d.heading),0,-Math.sin(d.heading));
  let out=d.pos.clone().addScaledVector(right,d.R.kind==='car'?-1.9:-.9);
  if(!free(out.x,out.z,.4))out=d.pos.clone().addScaledVector(right,d.R.kind==='car'?1.9:.9);
  player.teleport(out.x,out.z,d.heading+Math.PI);
  const s=S();s.rides[d.id]={...s.rides[d.id],x:d.pos.x,z:d.pos.z,heading:d.heading};
  drive=null;G.driving=false;engine.set(null);sfx.door();speedo.hidden=true;G.onInventory();G.save();
 }
 function update(dt){
  const d=drive,k=player.keys,R=d.R;
  const thr=(k.has('KeyW')||k.has('ArrowUp')?1:0)-(k.has('KeyS')||k.has('ArrowDown')?1:0);
  const st=(k.has('KeyA')||k.has('ArrowLeft')?1:0)-(k.has('KeyD')||k.has('ArrowRight')?1:0);
  if(thr>0)d.speed+=(d.speed<0?R.accel*2.4:R.accel*(1-Math.max(0,d.speed)/R.top*.6))*dt;
  else if(thr<0)d.speed-=(d.speed>.5?R.accel*2.4:R.accel*.7)*dt;
  else d.speed-=Math.sign(d.speed)*Math.min(Math.abs(d.speed),(1.6+Math.abs(d.speed)*.25)*dt);
  if(k.has('Space'))d.speed-=Math.sign(d.speed)*Math.min(Math.abs(d.speed),R.accel*2*dt);
  d.speed=Math.max(-R.top*.35,Math.min(R.top,d.speed));
  d.steer+=(st-d.steer)*Math.min(1,dt*6);
  const grip=Math.min(1,Math.abs(d.speed)/5)*(1-.4*Math.min(1,Math.abs(d.speed)/R.top));
  const turn=d.steer*R.turn*grip*Math.sign(d.speed)*(k.has('Space')&&Math.abs(d.speed)>6?1.6:1);
  d.heading+=turn*dt;
  fwd.set(Math.sin(d.heading),0,Math.cos(d.heading));d.pos.addScaledVector(fwd,d.speed*dt);
  // collisions with buildings, walls and traffic
  const rad=d.g.userData.radius,half=d.g.userData.len/2;let bump=0;
  for(let i=-1;i<=1;i++){const cx=d.pos.x+fwd.x*half*.6*i,cz=d.pos.z+fwd.z*half*.6*i,r=d.R.kind==='car'?1.0:.45;
   for(const c of world.colliders){if(c.h<.6)continue;const px=Math.max(c.minX,Math.min(cx,c.maxX)),pz=Math.max(c.minZ,Math.min(cz,c.maxZ)),dx=cx-px,dz=cz-pz,d2=dx*dx+dz*dz;
    if(d2<r*r){const dd=Math.sqrt(d2)||.001;const push=r-dd;d.pos.x+=dx/dd*push;d.pos.z+=dz/dd*push;bump=Math.max(bump,Math.abs(d.speed))}}}
  for(const c of world.cars){const dx=d.pos.x-c.g.position.x,dz=d.pos.z-c.g.position.z,dd=Math.hypot(dx,dz);if(dd<2.4&&dd>.01){d.pos.x+=dx/dd*(2.4-dd);d.pos.z+=dz/dd*(2.4-dd);bump=Math.max(bump,Math.abs(d.speed)*.8)}}
  if(bump>0){if(bump>7&&d.hitT<=0){sfx.crash(Math.min(1,bump/20));d.hitT=.4}d.speed*=-.2}
  d.hitT-=dt;
  clampToIsland(d.pos,6);
  // running people over
  if(Math.abs(d.speed)>5&&G.action){for(const tg of G.action.targets()){const p=tg.g.position;if(Math.hypot(p.x-d.pos.x,p.z-d.pos.z)<(d.R.kind==='car'?1.6:1)){G.action.damage(tg,Math.abs(d.speed)*9);d.speed*=.8}}}
  // model
  d.pos.y=heightAt(d.pos.x,d.pos.z);const g=d.g,u=g.userData;g.position.copy(d.pos);g.rotation.y=d.heading;
  for(const w of u.wheels)w.rotation.x+=d.speed*dt/u.wr;for(const s of u.steer)s.rotation.y=d.steer*.45;
  g.rotation.z=R.kind==='moped'?-d.steer*Math.min(1,Math.abs(d.speed)/8)*.35:-turn*d.speed*.004;
  if(u.tail)u.tail.emissiveIntensity=thr<0&&d.speed>0||k.has('Space')?2.5:.6;
  if(u.head)u.head.emissiveIntensity=G.night?2.2:.4;
  // exhaust
  d.smokeT-=dt;if(d.smokeT<=0){d.smokeT=thr>0?.06:.18;v.copy(u.exhaust);g.localToWorld(v);exhaust(fx,v)}
  // chase camera, mouse orbits around the car
  d.off+=player.yaw-d.lastYaw;d.lastYaw=player.yaw;if(Math.abs(d.speed)>3)d.off*=1-Math.min(1,dt*1.2);
  const camYaw=d.heading+d.off,dist=R.kind==='car'?7.2:4.6,ht=(R.kind==='car'?2.6:2)+Math.max(-1,Math.min(2.5,-player.pitch*4));
  v.set(d.pos.x-Math.sin(camYaw)*dist,ht,d.pos.z-Math.cos(camYaw)*dist);
  d.camPos.lerp(v,Math.min(1,dt*7));camera.position.copy(d.camPos);camera.position.y+=d.pos.y;camera.lookAt(d.pos.x,d.pos.y+1.2,d.pos.z);
  // keep the player (for police, prompts, co-op) with the vehicle
  player.pos.set(d.pos.x,0,d.pos.z);
  engine.set(R.kind==='moped'?'moped':'car',Math.min(1,Math.abs(d.speed)/R.top),thr>0);
  speedo.replaceChildren(h('b',{},String(Math.round(Math.abs(d.speed)*2.237))),h('small',{},'MPH'),h('span',{},R.name));
  return {speed:Math.abs(d.speed),sprint:false};
 }
 // ---------- skateboard ----------
 function toggleBoard(on=!G.boarding){
  const s=S();if(on&&!s.rides?.skate?.owned)return G.toast('Buy a skateboard in the Rides app first.');
  if(G.driving)return;G.boarding=on;player.board=on;board.visible=on;sfx.bag();
  if(on){setBoard(s.board||'cheap');G.toast('On the board. W to push, Space to ollie, B to hop off.')}engine.set(on?'skate':null,0);
 }
 function setBoard(id){const b=BOARDS[id]||BOARDS.cheap;player.boardStats=b;board.traverse(o=>{if(o.isMesh&&o.material.name!=='keep'&&o.geometry.parameters?.width===.24&&o.geometry.parameters?.height===.035)o.material=new THREE.MeshStandardMaterial({color:b.color,roughness:.6})})}
 function updateBoard(dt,t){
  if(!G.boarding)return;const hs=Math.hypot(player.vel.x,player.vel.z);
  const fy=player.yaw;board.position.set(player.pos.x-Math.sin(fy)*.42,player.pos.y,player.pos.z-Math.cos(fy)*.42);
  board.rotation.y=hs>.4?Math.atan2(player.vel.x,player.vel.z):fy;
  board.rotation.x=player.onGround?0:-Math.min(.5,player.vel.y*.08);
  engine.set('skate',player.onGround?Math.min(1,hs/9):0);
  if(player.landed){player.landed=false;sfx.step();sfx.step()}
 }
 // ---------- co-op: show what other players ride ----------
 const remote=new Map();
 function syncRemote(players){
  for(const [uid,rp]of players){const want=typeof rp.held==='string'&&rp.held.startsWith('v:')?rp.held.slice(2):null;let r=remote.get(uid);
   if(r&&r.id!==want){scene.remove(r.g);remote.delete(uid);r=null;if(rp.model){rp.model.visible=true}}
   if(!want||!rp.model)continue;
   if(!r){const g=want==='skate'?boardModel(RIDES.skate.color):model(want);scene.add(g);r={id:want,g};remote.set(uid,r)}
   const m=rp.model;r.g.position.set(m.position.x,0,m.position.z);r.g.rotation.y=m.rotation.y;
   const kind=RIDES[want]?.kind;m.visible=kind!=='car';m.position.y=kind==='moped'?.3:kind==='skate'?.15:0;
   if(r.g.userData.wheels)for(const w of r.g.userData.wheels)w.rotation.x+=rp.mv?.3:0;
  }
  for(const [uid,r]of remote)if(!players.has(uid)){scene.remove(r.g);remote.delete(uid)}
 }
 // ---------- phone app + prompts ----------
 G.ridesView=(body,repaint)=>{const s=S();s.rides=s.rides||{};const rank=G.rank();
  body.append(h('p',{class:'sub'},'Your rides. Buy cars at Island Motors (south end of Main St) and boards at The Board Room in the park.'));
  body.append(h('div',{class:'nw-list'},...Object.entries(RIDES).map(([id,R])=>{const own=s.rides[id]?.owned,locked=R.rank>rank;
   const btn=own?(R.kind==='skate'?h('button',{class:'nw-b go',onclick:()=>{toggleBoard();G.closePhone()}},G.boarding?'Hop off':'Ride'):h('button',{class:'nw-b',onclick:()=>{summon(id);G.closePhone()}},'Bring here'))
    :h('span',{class:'nw-hint'},R.kind==='skate'?'At The Board Room':'At Island Motors');
   return h('div',{class:'nw-row'},h('span',{class:'nw-swatch',style:{background:R.color}}),h('div',{class:'grow'},h('b',{},R.name),h('small',{},locked?'Unlocks at a higher rank':R.desc)),btn)})));
 };
 function summon(id){
  const p=parked.get(id);if(!p)return;if(drive?.id===id)return;
  const f=player.forward();const right=new THREE.Vector3(-f.z,0,f.x).normalize();
  for(const [a,b]of [[3,1],[-3,1],[0,4],[4,3],[-4,3]]){const x=player.pos.x+right.x*a+f.x*b,z=player.pos.z+right.z*a+f.z*b;if(free(x,z,1.3)){p.g.position.set(x,0,z);p.g.rotation.y=Math.atan2(f.x,f.z);const s=S();s.rides[id]={...s.rides[id],x,z,heading:p.g.rotation.y};sfx.door();G.toast(RIDES[id].name+' is here.','good');G.save();return}}
  G.toast('No room to park here. Try the street.','bad');
 }
 function interact(P){if(drive)return;for(const [id,p]of parked){const q=p.g.position;P(q.x,q.z,RIDES[id].kind==='car'?3.2:2,(RIDES[id].kind==='car'?'Drive ':'Ride ')+RIDES[id].name,()=>enter(id))}}
 return {setBoard,load,enter,exit,update,updateBoard,toggleBoard,syncRemote,interact,summon,get drive(){return drive},heldTag:()=>drive?'v:'+drive.id:G.boarding?'v:skate':null};
}
