// First-person player: pointer-lock look, WASD movement, sprint/jump, AABB collision, arms.
import * as THREE from '/vendor/three/three.module.min.js';
import {clampToIsland,heightAt} from './env.mjs?v=15';
import {baggieModel,jointModel} from './plants.mjs?v=15';

const EYE=1.65,RADIUS=.35;
// Guns built from bevelled side profiles (slide, frame, grip) plus small parts: sights, trigger
// guard, barrel, serrations, magazine. muzzle marks where shots and the flash come from.
export function gunModel(id){
 const g=new THREE.Group();
 const steel=new THREE.MeshStandardMaterial({color:'#5a606b',metalness:.85,roughness:.28}),dark=new THREE.MeshStandardMaterial({color:'#1d1f24',roughness:.55,metalness:.3}),
  grip=new THREE.MeshStandardMaterial({color:'#2a2622',roughness:.9}),accent=new THREE.MeshStandardMaterial({color:id==='gun_smg'?'#5dff8a':'#c9a24a',metalness:.6,roughness:.3,emissive:id==='gun_smg'?'#1f7a3a':'#000',emissiveIntensity:.6});
 // side profile [forward, up] extruded across the gun's width; forward points at -z
 const prof=(pts,w,m,bev=.003)=>{const s=new THREE.Shape();s.moveTo(-pts[0][0],pts[0][1]);for(const p of pts.slice(1))s.lineTo(-p[0],p[1]);s.closePath();
  const geo=new THREE.ExtrudeGeometry(s,{depth:w-bev*2,bevelEnabled:true,bevelThickness:bev,bevelSize:bev,bevelSegments:2});geo.translate(0,0,-(w-bev*2)/2);geo.rotateY(-Math.PI/2);const o=new THREE.Mesh(geo,m);g.add(o);return o};
 const box=(m,w,h,d,x,y,f,rx=0)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,-f);b.rotation.x=rx;g.add(b);return b};
 const cyl=(m,r,l,y,f,r2=r)=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(r2,r,l,12).rotateX(Math.PI/2),m);c.position.set(0,y,-f);g.add(c);return c};
 const guard=(y,f,r=.021)=>{const t=new THREE.Mesh(new THREE.TorusGeometry(r,.0035,6,14,Math.PI).rotateZ(Math.PI).rotateY(Math.PI/2),dark);t.position.set(0,y,-f);g.add(t)};
 let muzzleF;
 if(id==='gun_smg'){
  prof([[-.15,-.022],[.1,-.022],[.1,.028],[.085,.044],[-.15,.044]],.044,steel);                      // receiver
  cyl(dark,.019,.13,.012,.165);for(let i=0;i<4;i++)cyl(steel,.021,.008,.012,.115+i*.03);           // barrel shroud + rings
  cyl(dark,.009,.03,.012,.24);                                                                     // muzzle
  prof([[.0,-.022],[.045,-.022],[.06,-.17],[.02,-.175]],.03,dark);                                   // curved magazine
  prof([[-.13,-.022],[-.075,-.022],[-.095,-.12],[-.15,-.115]],.034,grip);                            // pistol grip
  guard(-.024,-.045,.024);box(dark,.006,.02,.006,0,-.035,-.045,.3);
  box(accent,.03,.008,.2,0,.049,-.02);box(dark,.008,.016,.01,0,.058,.07);box(dark,.02,.016,.01,0,.058,-.12);   // top rail + sights
  for(const s of [-1,1])box(steel,.006,.006,.09,s*.014,.02,-.195);box(dark,.036,.055,.012,0,.008,-.245);           // wire stock + butt plate
  box(dark,.02,.05,.022,0,-.05,.075,.25);                                                                      // foregrip
  box(dark,.005,.016,.05,.024,.02,-.02);                                                                       // charging handle
  muzzleF=.26;
 }else{
  prof([[-.095,0],[.095,0],[.095,.032],[.086,.041],[-.086,.041],[-.095,.033]],.033,steel);           // slide
  prof([[-.092,-.026],[.088,-.026],[.095,-.012],[.095,0],[-.095,0]],.03,dark);                       // frame + dust cover
  prof([[-.095,-.026],[-.04,-.026],[-.058,-.13],[-.118,-.124]],.031,grip);                           // grip
  box(accent,.033,.05,.03,0,-.075,-.078,.22);                                                        // grip panel
  guard(-.027,-.012);box(dark,.006,.018,.006,0,-.036,-.014,.3);                                      // trigger guard + trigger
  cyl(dark,.0085,.016,.018,.1);cyl(steel,.0115,.006,.018,.094);                                      // barrel + bushing
  box(dark,.006,.008,.01,0,.046,.085);box(dark,.02,.009,.008,0,.046,-.086);box(steel,.008,.009,.01,0,.046,-.086);   // sights
  for(let i=0;i<5;i++)for(const s of [-1,1])box(dark,.002,.026,.004,s*.0172,.022,-.05-i*.008);     // rear serrations
  box(dark,.002,.014,.04,.0172,.03,.02);                                                             // ejection port
  box(dark,.012,.012,.02,0,.012,-.1,.4);                                                             // hammer
  box(dark,.03,.008,.045,0,-.132,-.09,.22);                                                          // magazine base
  muzzleF=.112;
 }
 const muzzle=new THREE.Object3D();muzzle.position.set(0,id==='gun_smg'?.012:.018,-muzzleF);g.add(muzzle);
 const fm=new THREE.MeshBasicMaterial({color:'#ffd27a',transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
 const flash=new THREE.Group();for(let i=0;i<3;i++){const p=new THREE.Mesh(new THREE.PlaneGeometry(.13,.05),fm);p.rotation.z=i*Math.PI/3;flash.add(p)}flash.add(new THREE.Mesh(new THREE.PlaneGeometry(.06,.06),fm));flash.position.copy(muzzle.position);flash.visible=false;g.add(flash);
 g.userData={muzzle,flash};g.traverse(o=>{if(o.isMesh)o.renderOrder=10});return g;
}
export class Player{
 constructor(camera,dom,colliders,settings){
  this.camera=camera;this.dom=dom;this.colliders=colliders;this.settings=settings;
  this.pos=new THREE.Vector3(0,0,0);this.vel=new THREE.Vector3();this.yaw=0;this.pitch=0;this.onGround=true;
  this.keys=new Set();this.enabled=false;this.speedMul=1;this.jumpMul=1;this.bobT=0;this.stamina=1;
  this.arms=this.buildArms();camera.add(this.arms);
  addEventListener('keydown',e=>{if(!this.enabled)return;this.keys.add(e.code);if(e.code==='Space'&&this.onGround){this.vel.y=5.2*this.jumpMul*(this.board?(this.boardStats?.jump||1):1);this.onGround=false}});
  addEventListener('keyup',e=>this.keys.delete(e.code));
  addEventListener('blur',()=>this.keys.clear());
  document.addEventListener('mousemove',e=>{if(!this.enabled||document.pointerLockElement!==this.dom)return;const s=.0022*(this.settings.sensitivity||1);this.yaw-=e.movementX*s;this.pitch-=e.movementY*s*(this.settings.invertY?-1:1);this.pitch=Math.max(-1.5,Math.min(1.5,this.pitch))});
 }
 buildArms(){
  const g=new THREE.Group();const skin=new THREE.MeshStandardMaterial({color:'#e2b48c',roughness:.8});
  this.sleeveMat=new THREE.MeshStandardMaterial({color:'#e9e9ee',roughness:.9});
  // Rounded cartoon arms: capsule sleeve, cuff, round hand with a thumb.
  const cuffMat=new THREE.MeshStandardMaterial({color:'#f1efe9',roughness:.85});
  const arm=(x)=>{const a=new THREE.Group();
   const sleeve=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.42,6,12).rotateX(Math.PI/2),this.sleeveMat);sleeve.position.z=.12;
   const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.05,14).rotateX(Math.PI/2),cuffMat);cuff.position.z=-.12;
   const palm=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),skin);palm.scale.set(.068,.06,.09);palm.position.z=-.2;
   const fingers=new THREE.Mesh(new THREE.CapsuleGeometry(.045,.07,4,10).rotateX(Math.PI/2),skin);fingers.scale.set(1.35,.8,1);fingers.position.set(0,-.01,-.27);
   const thumb=new THREE.Mesh(new THREE.CapsuleGeometry(.022,.05,4,8).rotateX(Math.PI/2),skin);thumb.position.set(x<0?.06:-.06,.02,-.23);thumb.rotation.y=x<0?-.5:.5;
   a.add(sleeve,cuff,palm,fingers,thumb);a.position.set(x,-.32,-.42);a.rotation.x=.12;return a};
  this.leftArm=arm(-.26);this.rightArm=arm(.26);g.add(this.leftArm,this.rightArm);
  this.held=new THREE.Group();this.held.position.set(.26,-.24,-.7);g.add(this.held);
  g.traverse(o=>{if(o.isMesh){o.renderOrder=10;o.material.depthTest=true}});
  g.scale.setScalar(.62);g.position.z=-.05;
  return g;
 }
 setShirt(color){this.sleeveMat.color.set(color)}
 setHeld(kind,color){
  this.held.clear();this.tip=null;this.led=null;this.ember=null;this.muzzle=null;this.flash=null;this.kickZ=0;if(!kind)return;
  let m;
  if(kind==='bag'){m=baggieModel(color||'#58c96b');m.rotation.x=-.25;m.scale.setScalar(1.3)}
  else if(kind==='can'){m=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.14,12),new THREE.MeshStandardMaterial({color:color||'#3fa9d6',metalness:.6,roughness:.3}))}
  else if(kind==='seed'){m=new THREE.Mesh(new THREE.BoxGeometry(.1,.14,.02),new THREE.MeshStandardMaterial({color:'#c9a86b'}))}
  else if(kind==='joint'){m=jointModel();this.tip=m.userData.tip;this.ember=m.userData.emberM;m.rotation.set(-.15,-.5,0);m.scale.setScalar(1.5)}
  else if(kind==='gun'){m=gunModel(color);this.muzzle=m.userData.muzzle;this.flash=m.userData.flash}
  else if(kind==='vape'){ // slim rounded pen: coloured body, dark mouthpiece, glowing LED window
   m=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.018,.11,4,12),new THREE.MeshStandardMaterial({color:color||'#7fe3ff',metalness:.55,roughness:.28}));body.scale.set(1.25,1,.8);
   const mouth=new THREE.Mesh(new THREE.CylinderGeometry(.011,.017,.035,12),new THREE.MeshStandardMaterial({color:'#1b1d22',roughness:.4}));mouth.position.y=.085;
   const band=new THREE.Mesh(new THREE.CylinderGeometry(.0235,.0235,.012,14),new THREE.MeshStandardMaterial({color:'#f2f2f2',metalness:.8,roughness:.2}));band.scale.z=.8;band.position.y=.04;
   const led=new THREE.Mesh(new THREE.SphereGeometry(.007,10,8),new THREE.MeshStandardMaterial({color:'#222',emissive:color||'#7fe3ff',emissiveIntensity:.2}));led.position.set(0,-.06,-.019);
   m.add(body,mouth,band,led);this.led=led;m.rotation.x=-.35}
  else m=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),new THREE.MeshStandardMaterial({color:color||'#ccc'}));
  if(kind!=='gun')m.rotation.y=.4;else{m.position.set(-.05,.03,.08);m.rotation.y=.2}this.held.add(m);
 }
 collide(p){
  for(const c of this.colliders){
   if(p.y>c.h-.05)continue;
   const cx=Math.max(c.minX,Math.min(p.x,c.maxX)),cz=Math.max(c.minZ,Math.min(p.z,c.maxZ));
   const dx=p.x-cx,dz=p.z-cz,d2=dx*dx+dz*dz;
   if(d2<RADIUS*RADIUS){
    if(d2>1e-9){const d=Math.sqrt(d2);p.x=cx+dx/d*RADIUS;p.z=cz+dz/d*RADIUS}
    else{ // centre inside the box: push out on the shallowest axis
     const opts=[[c.minX-RADIUS-p.x,0],[c.maxX+RADIUS-p.x,0],[0,c.minZ-RADIUS-p.z],[0,c.maxZ+RADIUS-p.z]].sort((a,b)=>Math.abs(a[0]+a[1])-Math.abs(b[0]+b[1]))[0];p.x+=opts[0];p.z+=opts[1]}
   }
  }
 }
 update(dt){
  const k=this.keys;let fx=0,fz=0;
  if(this.enabled){if(k.has('KeyW')||k.has('ArrowUp'))fz-=1;if(k.has('KeyS')||k.has('ArrowDown'))fz+=1;if(k.has('KeyA')||k.has('ArrowLeft'))fx-=1;if(k.has('KeyD')||k.has('ArrowRight'))fx+=1}
  const moving=fx||fz;const sprint=moving&&(k.has('ShiftLeft')||k.has('ShiftRight'))&&this.stamina>.05;
  this.stamina=Math.max(0,Math.min(1,this.stamina+(sprint?-dt*.18:dt*.12)));
  const board=this.board;const bs=this.boardStats||{speed:8,glide:.4};const speed=(board?(sprint?bs.speed+2.5:bs.speed):(sprint?6.6:3.6))*this.speedMul;
  const dir=new THREE.Vector3(fx,0,fz);if(moving)dir.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),this.yaw);
  const accel=board?(this.onGround?(moving?2.4:1.3-bs.glide):.3):(this.onGround?12:3);
  this.vel.x+=(dir.x*speed-this.vel.x)*Math.min(1,accel*dt);this.vel.z+=(dir.z*speed-this.vel.z)*Math.min(1,accel*dt);
  this.vel.y-=18*dt;
  this.pos.addScaledVector(this.vel,dt);
  const gy=heightAt(this.pos.x,this.pos.z);
  if(this.pos.y<=gy){if(!this.onGround&&this.vel.y<-2)this.landed=true;this.pos.y=gy;this.vel.y=0;this.onGround=true}else if(this.onGround&&this.pos.y-gy<.35&&this.vel.y<=0){this.pos.y=gy}
  // stand on top of low colliders (tables, benches)
  this.collide(this.pos);
  clampToIsland(this.pos,8);
  const hspeed=Math.hypot(this.vel.x,this.vel.z);
  if(this.onGround&&hspeed>.5&&!board)this.bobT+=dt*hspeed*1.9;
  const bob=this.settings.viewBob===false?0:Math.sin(this.bobT)*.045*Math.min(1,hspeed/4);
  this.camera.position.set(this.pos.x,this.pos.y+EYE+bob+(board?.14:0),this.pos.z);
  this.camera.rotation.set(this.pitch+(this.hitLook||0),this.yaw,0,'YXZ');
  this.arms.position.y=Math.sin(this.bobT*.5)*.012*Math.min(1,hspeed/4);this.arms.position.x=Math.cos(this.bobT*.5)*.01*Math.min(1,hspeed/4);
  this.animateHeld(dt);
  return {speed:hspeed,sprint};
 }
 forward(){return new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(this.pitch,this.yaw,0,'YXZ'))}
 teleport(x,z,yaw=0){this.pos.set(x,0,z);this.vel.set(0,0,0);this.yaw=yaw;this.pitch=0}
 // Bring the held item up to the mouth for a hit, hold it, then lower it again.
 hit(ms=1300){const h=this.held,start=performance.now(),from={x:.26,y:-.24,z:-.7},to={x:.06,y:-.2,z:-.42};this.hitting=true;
  const run=()=>{const t=(performance.now()-start)/ms;const k=t<.25?t/.25:t<.75?1:Math.max(0,1-(t-.75)/.25);const e=k*k*(3-2*k);
   h.position.set(from.x+(to.x-from.x)*e,from.y+(to.y-from.y)*e,from.z+(to.z-from.z)*e);h.rotation.x=e*.5;
   const ra=this.rightArm;ra.position.set(.26-.08*e,-.32+.05*e,-.42);ra.rotation.x=.12+.38*e;ra.rotation.z=.18*e;
   if(this.led)this.led.material.emissiveIntensity=.2+(t>.2&&t<.8?2.6:0);
   this.hitLook=Math.sin(Math.min(1,t)*Math.PI)*.09;
   if(this.ember)this.ember.emissiveIntensity=1.6+(t>.2&&t<.8?4*Math.sin((t-.2)/.6*Math.PI):0);
   if(t<1)requestAnimationFrame(run);else{h.position.set(from.x,from.y,from.z);h.rotation.x=0;this.rightArm.position.set(.26,-.32,-.42);this.rightArm.rotation.set(.12,0,0);this.hitLook=0;this.hitting=false;this.onHitDone?.()}};run()}
 kick(k=1){this.kickZ=Math.min(.12,this.kickZ+.05*k);if(this.flash){this.flash.visible=true;this.flash.rotation.z=Math.random()*3;clearTimeout(this._fl);this._fl=setTimeout(()=>{if(this.flash)this.flash.visible=false},45)}}
 reloadAnim(sec){this.reloadT=sec;this.reloadDur=sec}
 animateHeld(dt){
  if(this.hitting)return;let rx=0,y=-.24,z=-.7;
  if(this.kickZ>0){this.kickZ=Math.max(0,this.kickZ-dt*.5);z+=this.kickZ;rx+=this.kickZ*3.5}
  if(this.reloadT>0){this.reloadT-=dt;const p=1-this.reloadT/this.reloadDur,s=Math.sin(Math.min(1,p)*Math.PI);rx-=s*.9;y-=s*.12}
  this.held.position.set(.26,y,z);this.held.rotation.x=rx;
 }
 // Jab: the fist drives forward and back, alternating hands; the view nudges with the hit.
 punch(){if(this.punchAnim)return;this.punchSide=!this.punchSide;const a=this.punchSide?this.rightArm:this.leftArm,s=this.punchSide?1:-1;const base={x:a.position.x,y:a.position.y,z:a.position.z,rx:a.rotation.x};const start=performance.now();this.punchAnim=true;this.held.visible=!this.punchSide;
  const run=()=>{const t=(performance.now()-start)/300;const k=t<.35?Math.sin(t/.35*Math.PI/2):t<1?Math.cos((t-.35)/.65*Math.PI/2):0;
   a.position.set(base.x-s*.18*k,base.y+.1*k,base.z-.42*k);a.rotation.set(base.rx+.05*k,s*.25*k,s*-.2*k);this.hitLook=(this.hitLook||0)*.8+(-.03*k);
   if(t<1)requestAnimationFrame(run);else{a.position.set(base.x,base.y,base.z);a.rotation.set(base.rx,0,0);this.hitLook=0;this.punchAnim=false;this.held.visible=true}};run()}
 // Jab: the fist drives forward and back, alternating hands; the view nudges with the hit.
 punch(){if(this.punchAnim)return;this.punchSide=!this.punchSide;const a=this.punchSide?this.rightArm:this.leftArm,s=this.punchSide?1:-1;const base={x:a.position.x,y:a.position.y,z:a.position.z,rx:a.rotation.x};const start=performance.now();this.punchAnim=true;this.held.visible=!this.punchSide;
  const run=()=>{const t=(performance.now()-start)/300;const k=t<.35?Math.sin(t/.35*Math.PI/2):t<1?Math.cos((t-.35)/.65*Math.PI/2):0;
   a.position.set(base.x-s*.18*k,base.y+.1*k,base.z-.42*k);a.rotation.set(base.rx+.05*k,s*.25*k,s*-.2*k);this.hitLook=(this.hitLook||0)*.8+(-.03*k);
   if(t<1)requestAnimationFrame(run);else{a.position.set(base.x,base.y,base.z);a.rotation.set(base.rx,0,0);this.hitLook=0;this.punchAnim=false;this.held.visible=true}};run()}
 swing(){if(this.swingAnim)return;const a=this.rightArm;const start=performance.now();this.swingAnim=true;const run=()=>{const t=(performance.now()-start)/260;a.rotation.x=.12-Math.sin(Math.min(1,t)*Math.PI)*.7;if(t<1)requestAnimationFrame(run);else{a.rotation.x=.12;this.swingAnim=false}};run()}
}
