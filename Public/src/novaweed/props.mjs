// Nova Weed street dressing: power poles with sagging wires, hydrants, trash cans, benches,
// planters, cones, bushes by the houses and dumpsters in the alleys. Each prop type is drawn
// with instancing, so hundreds of props cost only a handful of draw calls.
import * as THREE from '/vendor/three/three.module.min.js';
import {rng} from './people.mjs?v=15';
import {ROADS} from './world.mjs?v=15';

export function buildProps(scene,world){
 const r=rng(777),types={};
 const M=o=>new THREE.MeshStandardMaterial({roughness:.8,...o});
 const wood=M({color:'#6b4a33'}),bench=M({color:'#8a6a48'}),metal=M({color:'#3a3d44',metalness:.5,roughness:.4}),red=M({color:'#d0342c',roughness:.5}),
  can=M({color:'#8d939c',metalness:.5,roughness:.45}),dark=M({color:'#2b2d33'}),g1=M({color:'#3b8f45',flatShading:true}),g2=M({color:'#2f7d3a',flatShading:true}),
  crate=M({color:'#9a6b3f'}),orange=M({color:'#f07a1a',roughness:.6}),white=M({color:'#f3efe6'}),dgreen=M({color:'#2f5d3a',roughness:.6,metalness:.2});
 const P=(geo,mat,x=0,y=0,z=0)=>({geo:geo.translate(x,y,z),mat});
 const def=(name,parts,col)=>types[name]={parts,list:[],col};
 def('pole',[P(new THREE.CylinderGeometry(.1,.14,8.2,8),wood,0,4.1,0),P(new THREE.BoxGeometry(2.4,.12,.12),wood,0,7.5,0),P(new THREE.BoxGeometry(1.5,.1,.1),wood,0,6.8,0),
  P(new THREE.CylinderGeometry(.05,.05,.16,6),white,-1.05,7.64,0),P(new THREE.CylinderGeometry(.05,.05,.16,6),white,1.05,7.64,0),P(new THREE.CylinderGeometry(.22,.22,.6,10),can,.3,6.2,0)],[.16,.16,8]);
 def('hydrant',[P(new THREE.CylinderGeometry(.12,.15,.5,10),red,0,.25,0),P(new THREE.SphereGeometry(.13,10,8),red,0,.52,0),P(new THREE.CylinderGeometry(.045,.045,.4,8).rotateZ(Math.PI/2),red,0,.36,0),P(new THREE.CylinderGeometry(.17,.17,.05,10),red,0,.03,0)],[.2,.2,.7]);
 def('can',[P(new THREE.CylinderGeometry(.3,.25,.85,12),can,0,.43,0),P(new THREE.CylinderGeometry(.32,.32,.07,12),dark,0,.89,0),P(new THREE.TorusGeometry(.08,.015,6,10),dark,0,.96,0)],[.32,.32,.95]);
 def('bench',[P(new THREE.BoxGeometry(1.8,.07,.5),bench,0,.48,0),P(new THREE.BoxGeometry(1.8,.42,.06),bench,0,.84,-.24),P(new THREE.BoxGeometry(.07,.5,.46),metal,-.8,.25,0),P(new THREE.BoxGeometry(.07,.5,.46),metal,.8,.25,0)],[.95,.32,.9]);
 def('planter',[P(new THREE.BoxGeometry(1.4,.5,.6),crate,0,.25,0),P(new THREE.IcosahedronGeometry(.42,1),g1,-.35,.72,0),P(new THREE.IcosahedronGeometry(.46,1),g2,.3,.74,0)],[.72,.32,.8]);
 def('cone',[P(new THREE.ConeGeometry(.15,.5,10),orange,0,.27,0),P(new THREE.BoxGeometry(.38,.04,.38),orange,0,.02,0),P(new THREE.CylinderGeometry(.092,.115,.08,10),white,0,.3,0)]);
 def('bush',[P(new THREE.IcosahedronGeometry(.55,1),g1,0,.42,0),P(new THREE.IcosahedronGeometry(.4,1),g2,.42,.33,.12),P(new THREE.IcosahedronGeometry(.38,1),g1,-.4,.3,-.1)]);
 def('dumpster',[P(new THREE.BoxGeometry(2.2,1.1,1.2),dgreen,0,.7,0),P(new THREE.BoxGeometry(2.3,.08,1.3),dark,0,1.3,0),P(new THREE.BoxGeometry(.1,.15,1.25),dark,-.9,.08,0),P(new THREE.BoxGeometry(.1,.15,1.25),dark,.9,.08,0)],[1.15,.65,1.4]);
 const blocked=(x,z,pad=.7)=>world.colliders.some(c=>x>c.minX-pad&&x<c.maxX+pad&&z>c.minZ-pad&&z<c.maxZ+pad)||(Math.abs(x-3)<4&&Math.abs(z+9.4)<2.5)||(Math.abs(x+21.5)<3&&z>-11&&z<-4);
 const put=(name,x,z,ry=0,s=1)=>{if(blocked(x,z))return false;types[name].list.push({x,z,ry,s});const c=types[name].col;if(c){const sw=Math.abs(Math.sin(ry))>.7;const hx=sw?c[1]:c[0],hz=sw?c[0]:c[1];world.colliders.push({minX:x-hx,maxX:x+hx,minZ:z-hz,maxZ:z+hz,h:c[2]})}return true};
 const nearCross=p=>ROADS.some(q=>Math.abs(q-p)<10.5);
 // power poles down one side of every road, joined by wires
 const rows=[];
 for(const rd of ROADS)for(const axis of ['z','x']){const row=[];for(let p=-100;p<=100;p+=25){if(nearCross(p))continue;const x=axis==='z'?rd+9.6:p,z=axis==='z'?p:rd+9.6;if(put('pole',x,z,axis==='z'?0:Math.PI/2))row.push({x,z,axis})}rows.push(row)}
 const wp=[];for(const row of rows)for(let i=0;i<row.length-1;i++){const a=row[i],b=row[i+1];for(const off of [-1.05,1.05]){const ox=a.axis==='z'?off:0,oz=a.axis==='z'?0:off;
  for(let k=0;k<8;k++){const t0=k/8,t1=(k+1)/8,sag=t=>7.7-Math.sin(t*Math.PI)*.9;wp.push(a.x+(b.x-a.x)*t0+ox,sag(t0),a.z+(b.z-a.z)*t0+oz,a.x+(b.x-a.x)*t1+ox,sag(t1),a.z+(b.z-a.z)*t1+oz)}}}
 const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(wp,3));scene.add(new THREE.LineSegments(wg,new THREE.LineBasicMaterial({color:'#1b1d22'})));
 // sidewalk furniture
 for(const rd of ROADS)for(const axis of ['z','x'])for(const side of [-1,1])for(let p=-104;p<=104;p+=6.5){
  if(nearCross(p)||r()>.3)continue;const lat=rd+side*8.25,x=axis==='z'?lat:p+r()*2,z=axis==='z'?p+r()*2:lat;const k=r();
  const face=axis==='z'?(side>0?-Math.PI/2:Math.PI/2):(side>0?Math.PI:0);
  if(k<.16)put('hydrant',x,z);else if(k<.42)put('can',x,z);else if(k<.68)put('bench',x,z,face);else if(k<.9)put('planter',x,z,face);else put('cone',x,z,r()*3);
 }
 // bushes by the houses, dumpsters in the alleys
 for(const hs of world.houses||[]){const k=hs.k||1,fz=hs.cz+k*(hs.D/2+.6);for(const sx of [-1,1])if(r()<.85)types.bush.list.push({x:hs.cx+sx*(hs.W/2-.9),z:fz,ry:r()*6,s:.8+r()*.5});if(r()<.5)types.bush.list.push({x:hs.cx+(r()-.5)*3,z:hs.cz-k*(hs.D/2+.7),ry:r()*6,s:.9+r()*.5})}
 for(const bx of [-90,-30,30,90])for(const bz of [-90,-30,30,90])if(r()<.7)put('dumpster',bx+(r()<.5?-1:1)*.2,bz+(r()-.5)*6,Math.PI/2);
 // instanced meshes
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),v=new THREE.Vector3(),s3=new THREE.Vector3();let count=0;
 for(const t of Object.values(types)){if(!t.list.length)continue;count+=t.list.length;for(const part of t.parts){const im=new THREE.InstancedMesh(part.geo,part.mat,t.list.length);
  t.list.forEach((o,i)=>{q.setFromAxisAngle(up,o.ry);m4.compose(v.set(o.x,0,o.z),q,s3.setScalar(o.s));im.setMatrixAt(i,m4)});im.castShadow=true;im.receiveShadow=true;im.frustumCulled=false;scene.add(im)}}
 return {count};
}
