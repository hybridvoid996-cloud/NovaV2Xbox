// First-person player: pointer-lock look, WASD movement, sprint/jump, AABB collision, arms.
import * as THREE from '/vendor/three/three.module.min.js';

const EYE=1.65,RADIUS=.35;
export class Player{
 constructor(camera,dom,colliders,settings){
  this.camera=camera;this.dom=dom;this.colliders=colliders;this.settings=settings;
  this.pos=new THREE.Vector3(0,0,0);this.vel=new THREE.Vector3();this.yaw=0;this.pitch=0;this.onGround=true;
  this.keys=new Set();this.enabled=false;this.speedMul=1;this.jumpMul=1;this.bobT=0;this.stamina=1;
  this.arms=this.buildArms();camera.add(this.arms);
  addEventListener('keydown',e=>{if(!this.enabled)return;this.keys.add(e.code);if(e.code==='Space'&&this.onGround){this.vel.y=5.2*this.jumpMul;this.onGround=false}});
  addEventListener('keyup',e=>this.keys.delete(e.code));
  addEventListener('blur',()=>this.keys.clear());
  document.addEventListener('mousemove',e=>{if(!this.enabled||document.pointerLockElement!==this.dom)return;const s=.0022*(this.settings.sensitivity||1);this.yaw-=e.movementX*s;this.pitch-=e.movementY*s*(this.settings.invertY?-1:1);this.pitch=Math.max(-1.5,Math.min(1.5,this.pitch))});
 }
 buildArms(){
  const g=new THREE.Group();const skin=new THREE.MeshStandardMaterial({color:'#e2b48c',roughness:.8});
  this.sleeveMat=new THREE.MeshStandardMaterial({color:'#e9e9ee',roughness:.9});
  const arm=(x)=>{const a=new THREE.Group();const sleeve=new THREE.Mesh(new THREE.BoxGeometry(.13,.13,.5),this.sleeveMat);sleeve.position.z=.1;const hand=new THREE.Mesh(new THREE.BoxGeometry(.11,.11,.14),skin);hand.position.z=-.2;a.add(sleeve,hand);a.position.set(x,-.32,-.42);a.rotation.x=.12;return a};
  this.leftArm=arm(-.26);this.rightArm=arm(.26);g.add(this.leftArm,this.rightArm);
  this.held=new THREE.Group();this.held.position.set(.26,-.24,-.7);g.add(this.held);
  g.traverse(o=>{if(o.isMesh){o.renderOrder=10;o.material.depthTest=true}});
  g.scale.setScalar(.62);g.position.z=-.05;
  return g;
 }
 setShirt(color){this.sleeveMat.color.set(color)}
 setHeld(kind,color){
  this.held.clear();if(!kind)return;
  let m;
  if(kind==='bag'){m=new THREE.Mesh(new THREE.BoxGeometry(.12,.16,.03),new THREE.MeshStandardMaterial({color:'#e8f5e9',transparent:true,opacity:.75}));const bud=new THREE.Mesh(new THREE.IcosahedronGeometry(.045,0),new THREE.MeshStandardMaterial({color:color||'#58c96b'}));bud.position.y=-.02;m.add(bud)}
  else if(kind==='can'){m=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.14,12),new THREE.MeshStandardMaterial({color:color||'#3fa9d6',metalness:.6,roughness:.3}))}
  else if(kind==='seed'){m=new THREE.Mesh(new THREE.BoxGeometry(.1,.14,.02),new THREE.MeshStandardMaterial({color:'#c9a86b'}))}
  else if(kind==='joint'){m=new THREE.Mesh(new THREE.CylinderGeometry(.008,.012,.13,8).rotateX(Math.PI/2),new THREE.MeshStandardMaterial({color:'#f2efe6'}));const tip=new THREE.Mesh(new THREE.SphereGeometry(.012,8,8),new THREE.MeshStandardMaterial({color:'#ff7a2a',emissive:'#ff5a00',emissiveIntensity:2}));tip.position.z=-.065;m.add(tip)}
  else m=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),new THREE.MeshStandardMaterial({color:color||'#ccc'}));
  m.rotation.y=.4;this.held.add(m);
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
  const speed=(sprint?6.6:3.6)*this.speedMul;
  const dir=new THREE.Vector3(fx,0,fz);if(moving)dir.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),this.yaw);
  const accel=this.onGround?12:3;
  this.vel.x+=(dir.x*speed-this.vel.x)*Math.min(1,accel*dt);this.vel.z+=(dir.z*speed-this.vel.z)*Math.min(1,accel*dt);
  this.vel.y-=18*dt;
  this.pos.addScaledVector(this.vel,dt);
  if(this.pos.y<=0){this.pos.y=0;this.vel.y=0;this.onGround=true}
  // stand on top of low colliders (tables, benches)
  this.collide(this.pos);
  this.pos.x=Math.max(-113,Math.min(113,this.pos.x));this.pos.z=Math.max(-113,Math.min(113,this.pos.z));
  const hspeed=Math.hypot(this.vel.x,this.vel.z);
  if(this.onGround&&hspeed>.5)this.bobT+=dt*hspeed*1.9;
  const bob=this.settings.viewBob===false?0:Math.sin(this.bobT)*.045*Math.min(1,hspeed/4);
  this.camera.position.set(this.pos.x,this.pos.y+EYE+bob,this.pos.z);
  this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');
  this.arms.position.y=Math.sin(this.bobT*.5)*.012*Math.min(1,hspeed/4);this.arms.position.x=Math.cos(this.bobT*.5)*.01*Math.min(1,hspeed/4);
  return {speed:hspeed,sprint};
 }
 forward(){return new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(this.pitch,this.yaw,0,'YXZ'))}
 teleport(x,z,yaw=0){this.pos.set(x,0,z);this.vel.set(0,0,0);this.yaw=yaw;this.pitch=0}
 swing(){if(this.swingAnim)return;const a=this.rightArm;const start=performance.now();this.swingAnim=true;const run=()=>{const t=(performance.now()-start)/260;a.rotation.x=.12-Math.sin(Math.min(1,t)*Math.PI)*.7;if(t<1)requestAnimationFrame(run);else{a.rotation.x=.12;this.swingAnim=false}};run()}
}
