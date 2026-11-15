// Nova City: procedurally built low-poly neighbourhood.
// Roads run along x/z = -60, 0, 60. Sidewalk centre lines are 6.5m either side of a road.
import * as THREE from '/vendor/three/three.module.min.js';
import {rng} from './people.mjs?v=15';
import {buildIsland,makeSkyDome,patterned,islandK,heightAt} from './env.mjs?v=15';

export const ROADS=[-60,0,60];
export const WALK=[-66.5,-53.5,-6.5,6.5,53.5,66.5];
export const BOUND=114;

// Key places (shared with game logic)
export const PLACES={
 spawn:{x:3,z:-7.5,label:'Bus stop'},
 home:{x:-22,z:-17.5,door:{x:-21.5,z:-10.5},label:'Apartment 4B'},
 garden:{x:30,z:-11,clerk:{x:30,z:-13.2},label:'Green Thumb'},
 quick:{x:30,z:11,clerk:{x:30,z:13.2},label:'Quick Stop'},
 thread:{x:-30,z:11,clerk:{x:-30,z:13.2},label:'Thread Co.'},
 police:{x:90,z:-14,label:'Police'},
 park:{x:-30,z:90,label:'Riverside Park'}
};

function canvasTex(w,h,draw,{repeat=[1,1]}={}){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
function noise(x,w,h,base,spread,count){x.fillStyle=base;x.fillRect(0,0,w,h);const r=rng(w*h+count);for(let i=0;i<count;i++){const v=Math.floor((r()-.5)*spread);x.fillStyle=`rgba(${v>0?255:0},${v>0?255:0},${v>0?255:0},${Math.abs(v)/255})`;x.fillRect(r()*w,r()*h,1+r()*2,1+r()*2)}}

export function buildWorld(scene,{quality='high'}={}){
 const colliders=[],lamps=[],windowMats=[],cars=[],trees=[];
 const addCollider=(minX,maxX,minZ,maxZ,h=10)=>colliders.push({minX,maxX,minZ,maxZ,h});
 const std=(o)=>new THREE.MeshStandardMaterial({roughness:.9,...o});
 const mesh=(geo,m,{x=0,y=0,z=0,cast=true,receive=true}={})=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=cast;o.receiveShadow=receive;scene.add(o);return o};
 const boxAt=(minX,maxX,minY,maxY,minZ,maxZ,m,collide=true)=>{const o=mesh(new THREE.BoxGeometry(maxX-minX,maxY-minY,maxZ-minZ),m,{x:(minX+maxX)/2,y:(minY+maxY)/2,z:(minZ+maxZ)/2});if(collide)addCollider(minX,maxX,minZ,maxZ,maxY);return o};

 // ---------- ground ----------
 const grassTex=canvasTex(256,256,(x,w,h)=>noise(x,w,h,'#3f7a3a',90,5000),{repeat:[60,60]});
 const island=buildIsland(scene,addCollider);
 const roadTex=canvasTex(128,512,(x,w,h)=>{noise(x,w,h,'#4a4d54',46,5000);x.fillStyle='#e8d36a';for(let y=0;y<h;y+=64)x.fillRect(w/2-3,y,6,34);x.fillStyle='#d9d9df';x.fillRect(4,0,4,h);x.fillRect(w-8,0,4,h)});
 const walkTex=canvasTex(128,128,(x,w,h)=>{noise(x,w,h,'#9a9aa3',50,2500);x.strokeStyle='rgba(0,0,0,.18)';x.lineWidth=2;for(let i=0;i<=w;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(w,i);x.stroke()}});
 for(const r of ROADS){
  for(const axis of ['x','z']){
   const tex=roadTex.clone();tex.needsUpdate=true;tex.repeat.set(1,22);
   const geo=new THREE.PlaneGeometry(10,240).rotateX(-Math.PI/2);if(axis==='x')geo.rotateY(Math.PI/2);
   mesh(geo,std({map:tex,roughness:.95}),{x:axis==='z'?r:0,z:axis==='x'?r:0,y:.02,cast:false});
   for(const side of [-1,1]){const wt=walkTex.clone();wt.needsUpdate=true;wt.repeat.set(axis==='z'?1:60,axis==='z'?60:1);const sg=new THREE.BoxGeometry(axis==='z'?4:240,.18,axis==='z'?240:4);mesh(sg,std({map:wt}),{x:axis==='z'?r+side*7:0,z:axis==='x'?r+side*7:0,y:.09,cast:false})}
  }
 }
 // crosswalk stripes at intersections
 const stripeMat=std({color:'#e7e7ea'});
 for(const a of ROADS)for(const b of ROADS)for(const [dx,dz,rot]of [[0,-6.2,0],[0,6.2,0],[-6.2,0,1],[6.2,0,1]])for(let i=-4;i<=4;i+=1.6){const s=mesh(new THREE.BoxGeometry(rot?1.6:.7,.02,rot?.7:1.6),stripeMat,{x:a+dx+(rot?0:i),z:b+dz+(rot?i:0),y:.04,cast:false})}

 // ---------- buildings ----------
 const r=rng(99);
 const windowTex=(seed,cols,rows,wall)=>{const rr=rng(seed);let lit=[];const color=canvasTex(256,256,(x,w,h)=>{x.fillStyle=wall;x.fillRect(0,0,w,h);const cw=w/cols,ch=h/rows;for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const on=rr()<.45;lit.push(on);x.fillStyle='#f3efe6';x.fillRect(i*cw+cw*.16,j*ch+ch*.18,cw*.68,ch*.64);x.fillStyle=on?'#3c5272':'#2c3e57';x.fillRect(i*cw+cw*.2,j*ch+ch*.22,cw*.6,ch*.56);x.fillStyle='#f3efe6';x.fillRect(i*cw+cw*.49,j*ch+ch*.22,cw*.02,ch*.56);x.fillStyle='rgba(255,255,255,.08)';x.fillRect(i*cw+cw*.2,j*ch+ch*.22,cw*.6,ch*.12)}});let k=0;const em=canvasTex(256,256,(x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);const cw=w/cols,ch=h/rows;for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){if(lit[k++]){x.fillStyle=rr()<.5?'#ffd98a':'#ffe9c2';x.fillRect(i*cw+cw*.2,j*ch+ch*.22,cw*.6,ch*.56)}}});return {color,em}};
 const WALLS=['#d9b38c','#e6d3b3','#b7c6d6','#d8a894','#e9e1cf','#bfd1b5','#cbb8dc','#e7c98f'];
 const building=(minX,maxX,minZ,maxZ,height,seed,wall)=>{
  height=Math.min(height,9);const {color,em}=windowTex(seed,4,3,wall);const fx=(maxX-minX)/6,fz=(maxZ-minZ)/6,fy=height/8;
  const mk=(rx,ry)=>{const c=color.clone(),e=em.clone();c.needsUpdate=e.needsUpdate=true;c.repeat.set(rx,ry);e.repeat.set(rx,ry);const m=std({map:c,emissiveMap:e,emissive:'#ffffff',emissiveIntensity:0});windowMats.push(m);return m};
  const mats=[mk(fz,fy*2.4),mk(fz,fy*2.4),std({color:'#6b6560'}),std({color:'#222'}),mk(fx,fy*2.4),mk(fx,fy*2.4)];
  const o=mesh(new THREE.BoxGeometry(maxX-minX,height,maxZ-minZ),mats,{x:(minX+maxX)/2,y:height/2,z:(minZ+maxZ)/2});
  addCollider(minX,maxX,minZ,maxZ,height);
  // roof trim
  mesh(new THREE.BoxGeometry(maxX-minX+.6,.6,maxZ-minZ+.6),std({color:'#f3efe6'}),{x:(minX+maxX)/2,y:height+.3,z:(minZ+maxZ)/2});
  return o;
 };
 // ---------- small-town kit (houses, motel, gas station, garages) ----------
 // Each building is merged into a few meshes (one per material) so a full town stays light on laptops.
 const KIT={};const kitMat=(key,o)=>KIT[key]||(KIT[key]=patterned(std(o),/^(wall|w#|motelwall|garwall)/.test(key)?'siding':/^brick/.test(key)?'brick':/^(roof|r#|motelroof)/.test(key)?'shingle':'plain'));
 const glassM=kitMat('glass',{color:'#2c3e57',roughness:.25,metalness:.1,emissive:'#ffd98a',emissiveIntensity:0});if(!windowMats.includes(glassM))windowMats.push(glassM);
 const trimM=kitMat('trim',{color:'#f3efe6'}),doorM=kitMat('door',{color:'#6b4630'}),stoneM=kitMat('stone',{color:'#8e8a84'}),darkM=kitMat('dark',{color:'#2a2b30'});
 const tmpObj=new THREE.Object3D();
 // All town buildings are batched by material and drawn as a handful of meshes.
 const TOWN=new Map();const flushTown=()=>{for(const [m,list]of TOWN){const o=new THREE.Mesh(mergeParts(list),m);o.castShadow=true;o.receiveShadow=true;scene.add(o)}TOWN.clear()};
 function mergeParts(parts){
  // parts: [{geo,x,y,z,rx,ry,rz,sx,sy,sz}] -> one BufferGeometry (non-indexed, position/normal/uv)
  const pos=[],nor=[],uv=[];
  for(const p of parts){
   tmpObj.position.set(p.x||0,p.y||0,p.z||0);tmpObj.rotation.set(p.rx||0,p.ry||0,p.rz||0);tmpObj.scale.set(p.sx||1,p.sy||1,p.sz||1);tmpObj.updateMatrix();
   const g=(p.geo.index?p.geo.toNonIndexed():p.geo.clone());g.applyMatrix4(tmpObj.matrix);
   pos.push(...g.attributes.position.array);nor.push(...g.attributes.normal.array);if(g.attributes.uv)uv.push(...g.attributes.uv.array);else uv.push(...new Array(g.attributes.position.count*2).fill(0));
  }
  const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));out.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));out.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return out;
 }
 // A builder collects parts per material in local space, then places the whole group in the world.
 function builder(){const groups=new Map();return {
  add(material,geo,t={}){if(!groups.has(material))groups.set(material,[]);groups.get(material).push({geo,...t})},
  box(material,w,h,d,t={}){this.add(material,new THREE.BoxGeometry(w,h,d),t)},
  place(x,z,ry=0){const m4=new THREE.Matrix4().makeRotationY(ry).setPosition(x,0,z);for(const [m,parts]of groups){if(!TOWN.has(m))TOWN.set(m,[]);TOWN.get(m).push({geo:mergeParts(parts).applyMatrix4(m4)})}}
 }}
 const prism=(w,h,d)=>{const s=new THREE.Shape();s.moveTo(-d/2,0);s.lineTo(d/2,0);s.lineTo(0,h);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:w,bevelEnabled:false});g.translate(0,0,-w/2);g.rotateY(Math.PI/2);return g};
 const PASTEL=['#e9dcc0','#cfe0cb','#e5c3b0','#c4d3e6','#efd27f','#d5c6e2','#f0e6d8','#b7d1c8','#e8b9a6'];
 const ROOFS=['#7a3b30','#3d4a5c','#5a4636','#46543a','#6b2f3a'];
 const pickR=(arr)=>arr[Math.floor(r()*arr.length)];
 const windowSet=(b,x,y,z,ry=0,w=1.3,h=1.15)=>{b.box(trimM,w+.24,h+.24,.06,{x,y,z,ry});b.box(glassM,w,h,.08,{x,y,z,ry});b.box(trimM,w+.4,.1,.22,{x,y:y-h/2-.12,z,ry});b.box(trimM,.06,h,.1,{x,y,z,ry})};
 // House: 1 or 2 floors, pitched roof, porch, picket fence along the street side.
 const chimneys=[],houses=[];let motelAt=null,gasAt=null;
 function house(cx,cz,face,{floors=1,lot=18}={}){
  const b=builder(),W=9.5+r()*2.5,D=7.5+r()*1.5,H=3.1*floors,wall=kitMat('w'+pickR(PASTEL),{color:pickR(PASTEL)}),roof=kitMat('r'+pickR(ROOFS),{color:pickR(ROOFS)});
  const wallM=kitMat('wall'+wall.color.getHexString(),{color:wall.color}),roofM=kitMat('roof'+roof.color.getHexString(),{color:roof.color,roughness:.8});
  b.box(stoneM,W+.3,.4,D+.3,{y:.2});b.box(wallM,W,H,D,{y:.4+H/2});
  b.add(roofM,prism(W+1.1,2+floors*.2,D+1.2),{y:.4+H});b.box(trimM,W+.25,.18,D+.25,{y:.4+H});
  let chim=null;if(r()<.6){b.box(kitMat('brick',{color:'#8a4b3a'}),.7,1.8,.7,{x:W*.28,y:.4+H+1.4,z:D*.15});chim={x:W*.28,y:.4+H+2.35,z:D*.15}}
  // front: door + porch + windows (front is -z in local space)
  const fz=-D/2-.04;b.box(doorM,1.1,2.15,.1,{y:.4+1.075,z:fz});b.box(trimM,1.35,2.35,.06,{y:.4+1.15,z:fz+.04});b.box(kitMat('knob',{color:'#d9b65a',metalness:.6,roughness:.3}),.08,.08,.08,{x:.38,y:1.45,z:fz-.07});
  b.box(kitMat('porch',{color:'#9a8d7c'}),3.4,.3,1.9,{y:.15,z:-D/2-.95});b.box(kitMat('porch',{color:'#9a8d7c'}),2,.15,.5,{y:.08,z:-D/2-2.05});
  if(r()<.7){b.box(roofM,3.6,.14,2,{y:2.95,z:-D/2-.95,rx:-.12});for(const px of [-1.55,1.55])b.box(trimM,.14,2.6,.14,{x:px,y:1.6,z:-D/2-1.8})}
  for(let f=0;f<floors;f++){const y=.4+1.75+f*3.1;for(const wx of [-W*.3,W*.3]){windowSet(b,wx,y,fz);windowSet(b,wx,y,D/2+.04)}windowSet(b,-W/2-.04,y,0,Math.PI/2);windowSet(b,W/2+.04,y,0,Math.PI/2)}
  if(floors>1)windowSet(b,0,.4+1.75+3.1,fz);
  // picket fence along the street edge of the lot, with a gap for the path
  const fzLot=-lot/2+.6;for(let x=-lot/2+.5;x<=lot/2-.5;x+=.42){if(Math.abs(x)<1.2)continue;b.box(trimM,.1,.9,.06,{x,y:.45,z:fzLot})}
  for(const sx of [-1,1])b.box(trimM,lot/2-1.4,.08,.05,{x:sx*(lot/4+.35),y:.65,z:fzLot});
  b.box(kitMat('path',{color:'#b9b2a6'}),1.4,.04,lot/2-D/2-2.4,{y:.02,z:-(lot/2+D/2+2.2)/2+.5});
  b.box(darkM,.18,1.1,.18,{x:1.8,y:.55,z:fzLot-.2});b.box(kitMat('mail',{color:'#3d6bc0'}),.4,.35,.6,{x:1.8,y:1.2,z:fzLot-.2});
  const root=b.place(cx,cz,face>0?Math.PI:0);{const k=face>0?-1:1;if(chim)chimneys.push({x:cx+k*chim.x,y:chim.y,z:cz+k*chim.z});houses.push({x:cx,z:cz+k*(-D/2-2.4),cx,cz,k:-k,D,W})}
  const hx=face>0?-1:1;addCollider(cx-W/2,cx+W/2,cz-D/2,cz+D/2,H+3);
  return root;
 }
 // Garage / workshop: corrugated walls and a roll-up door.
 const corrTex=canvasTex(128,128,(x,w,h)=>{x.fillStyle='#a9b0b8';x.fillRect(0,0,w,h);for(let i=0;i<w;i+=8){x.fillStyle='rgba(0,0,0,.18)';x.fillRect(i,0,3,h);x.fillStyle='rgba(255,255,255,.18)';x.fillRect(i+4,0,2,h)}},{repeat:[3,1]});
 function garage(cx,cz,face){
  const b=builder(),W=11+r()*3,D=9,H=4.4,tint=pickR(['#c9d1d9','#d9c9a8','#a8c4d9','#c9a8a8']);
  b.box(kitMat('corr'+tint,{color:tint,map:corrTex}),W,H,D,{y:H/2});b.box(darkM,W+.4,.3,D+.4,{y:H+.15});
  const door=canvasTex(128,128,(x,w,h)=>{x.fillStyle='#d8d4cc';x.fillRect(0,0,w,h);for(let i=0;i<h;i+=12){x.fillStyle='rgba(0,0,0,.16)';x.fillRect(0,i,w,3)}});
  b.box(kitMat('rollup',{map:door}),4.6,3.4,.12,{x:-W*.18,y:1.7,z:-D/2-.06});b.box(doorM,1,2.1,.1,{x:W*.3,y:1.05,z:-D/2-.05});
  b.box(kitMat('sign'+tint,{color:'#e9a23b'}),3,.7,.1,{x:W*.2,y:3.6,z:-D/2-.07});
  b.place(cx,cz,face>0?Math.PI:0);addCollider(cx-W/2,cx+W/2,cz-D/2,cz+D/2,H);
 }
 // Motel: long single storey with numbered doors, a walkway canopy and a neon sign.
 function motel(cx,cz,face){
  const b=builder(),W=17.5,D=6.5,H=3.3,wallM=kitMat('motelwall',{color:'#e7d6b8'}),roofM=kitMat('motelroof',{color:'#6b2f3a'});
  b.box(stoneM,W+.3,.35,D+.3,{y:.17});b.box(wallM,W,H,D,{y:.35+H/2});b.box(roofM,W+.6,.35,D+2.8,{y:.35+H+.17,z:-1.2});
  for(let i=0;i<6;i++){const x=-W/2+1.6+i*2.85;b.box(kitMat('motdoor',{color:'#3f6f8f'}),1,2.1,.1,{x,y:1.4,z:-D/2-.05});windowSet(b,x+1.15,1.9,-D/2-.04,0,.9,.8);b.box(trimM,.12,3,.12,{x:x-.7,y:1.85,z:-D/2-2.4})}
  b.box(kitMat('walk',{color:'#a8a29a'}),W,.2,2.6,{y:.1,z:-D/2-1.3});
  const neon=canvasTex(512,160,(x,w,h)=>{x.fillStyle='#14080b';x.fillRect(0,0,w,h);x.font='bold 120px Segoe UI, sans-serif';x.textAlign='center';x.textBaseline='middle';x.shadowColor='#ff3b3b';x.shadowBlur=30;x.fillStyle='#ff5a4a';x.fillText('MOTEL',w/2,h/2+6)});
  b.box(kitMat('neon',{map:neon,emissive:'#ffffff',emissiveMap:neon,emissiveIntensity:1.1}),7,2.2,.3,{y:.35+H+1.5,z:-D/2+.6});
  b.place(cx,cz,face>0?Math.PI:0);addCollider(cx-W/2,cx+W/2,cz-D/2,cz+D/2,H+2);
 }
 // Gas station: canopy over pumps plus a little shop.
 function gasStation(cx,cz,face){
  const b=builder(),red=kitMat('gasred',{color:'#d83a32'}),white=kitMat('gaswhite',{color:'#f2f0ea'});
  b.box(white,12,.6,7,{y:5,z:-2});b.box(red,12.2,.25,7.2,{y:4.65,z:-2});
  for(const [x,z]of [[-4.5,-4.5],[4.5,-4.5],[-4.5,.5],[4.5,.5]])b.box(white,.4,4.6,.4,{x,y:2.3,z});
  for(const x of [-2,2]){b.box(stoneM,1.2,.25,2.6,{x,y:.12,z:-2});b.box(red,.7,1.6,.5,{x,y:1.05,z:-2});b.box(kitMat('pumpscreen',{color:'#1b2633',emissive:'#4fd1ff',emissiveIntensity:.5}),.45,.3,.05,{x,y:1.45,z:-2.26})}
  b.box(kitMat('gasshop',{color:'#efe7d8'}),8,3.4,5,{y:1.7,z:5});b.box(red,8.3,.4,5.3,{y:3.6,z:5});
  b.box(glassM,4,1.6,.08,{x:-1,y:1.6,z:2.46});b.box(doorM,1.1,2.2,.1,{x:2.4,y:1.1,z:2.45});
  const sign=canvasTex(256,128,(x,w,h)=>{x.fillStyle='#d83a32';x.fillRect(0,0,w,h);x.font='bold 64px Segoe UI, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';x.fillText('GAS',w/2,h/2+4)});
  b.box(kitMat('gassign',{map:sign,emissive:'#ffffff',emissiveMap:sign,emissiveIntensity:.5}),3,1.5,.2,{x:6.2,y:5.6,z:-7});b.box(darkM,.25,5,.25,{x:6.2,y:2.5,z:-7});
  b.place(cx,cz,face>0?Math.PI:0);addCollider(cx-4,cx+4,cz+(face>0?-7.5:2.5),cz+(face>0?-2.5:7.5),3.4);
 }
 // Empty lot: grass, a couple of trees (trees are added later), a bench.
 function yard(cx,cz){const b=builder();b.box(kitMat('bench',{color:'#8a5a36'}),2.4,.12,.6,{y:.55});for(const x of [-1,1])b.box(darkM,.1,.55,.5,{x,y:.27});b.place(cx,cz)}

 const blocks=[-90,-30,30,90];
 const reserved=new Set(['-30,-30','30,-30','30,30','-30,30','90,-30','-30,90']);
 for(const bx of blocks)for(const bz of blocks){
  if(reserved.has(bx+','+bz))continue;
  const minX=bx-21,maxX=bx+21,minZ=bz-21,maxZ=bz+21;
  // 2x2 lots with gaps (alleys)
  for(const [ax,az]of [[0,0],[1,0],[0,1],[1,1]]){
   const special=(bx===-90&&bz===-30&&ax===1&&az===0)||(bx===30&&bz===-90&&ax===0&&az===1);if(!special&&r()<.15)continue;
   const x0=minX+ax*22+1,z0=minZ+az*22+1,cx=x0+9,cz=z0+9,face=az===0?-1:1;
   if(bx===-90&&bz===-30&&ax===1&&az===0){motel(cx,cz,face);motelAt={x:cx,z:cz};continue}
   if(bx===30&&bz===-90&&ax===0&&az===1){gasStation(cx,cz,face);const k=face>0?-1:1;gasAt={x:cx,z:cz,door:{x:cx+k*2.4,z:cz+k*1.3}};continue}
   const k=r();if(k<.5)house(cx,cz,face);else if(k<.72)house(cx,cz,face,{floors:2});else if(k<.88)garage(cx,cz,face);else yard(cx,cz);
  }
 }
 flushTown();
 // shops
 const shop=(cx,face,name,color,accent,wall)=>{
  const front=face<0?-14:14;const minZ=face<0?-42:14,maxZ=face<0?-14:42;
  building(cx-14,cx+14,minZ,maxZ,10,cx*7+face,wall);
  const out=face<0?1:-1,fz=front+out*.06;   // just in front of the facade
  // a lit shop interior painted on the glass: shelves of products, ceiling lights, a back wall
  const inside=canvasTex(512,192,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#fff8e8');g.addColorStop(1,'#e8dcc4');x.fillStyle=g;x.fillRect(0,0,w,h);
   x.fillStyle='rgba(255,255,255,.9)';for(let i=0;i<5;i++)x.fillRect(30+i*100,8,60,6);
   x.fillStyle=color;x.globalAlpha=.25;x.fillRect(0,h-36,w,36);x.globalAlpha=1;
   const cols=['#e8443a','#3d7be0','#ffd23f','#2fbf71','#ff7ad9','#e8912e','#8d5bd6'];
   for(let s=0;s<3;s++){const sy=48+s*38;x.fillStyle='#8a6a48';x.fillRect(20,sy+26,w-40,5);for(let i=0;i<34;i++){x.fillStyle=cols[(i*7+s*3)%cols.length];const bw=9+(i*13%7),bh=14+(i*17%12);x.fillRect(24+i*14,sy+26-bh,bw,bh);x.fillStyle='rgba(255,255,255,.35)';x.fillRect(24+i*14,sy+26-bh,2,bh)}}
   x.fillStyle='rgba(255,255,255,.14)';x.beginPath();x.moveTo(0,0);x.lineTo(140,0);x.lineTo(40,h);x.lineTo(0,h);x.fill();});
  const glassM=std({map:inside,emissive:'#ffffff',emissiveMap:inside,emissiveIntensity:.55,roughness:.08,metalness:.1});
  const frameM=std({color:'#2a2d33',metalness:.4,roughness:.4}),accentM=std({color:accent}),kickM=std({color:'#3a3d44'});
  mesh(new THREE.BoxGeometry(21,.7,.25),kickM,{x:cx,y:.35,z:fz});                                  // kick plate
  mesh(new THREE.BoxGeometry(14,2.7,.08),glassM,{x:cx-3,y:2.05,z:fz+out*.02});                       // display window
  for(let i=0;i<=4;i++)mesh(new THREE.BoxGeometry(.14,2.9,.2),frameM,{x:cx-10+i*3.5,y:2.05,z:fz+out*.05});
  mesh(new THREE.BoxGeometry(21,.18,.22),frameM,{x:cx,y:.72,z:fz+out*.05});mesh(new THREE.BoxGeometry(21,.18,.22),frameM,{x:cx,y:3.42,z:fz+out*.05});
  // glass door with a handle
  mesh(new THREE.BoxGeometry(2.4,2.75,.08),std({color:'#9fc6d8',roughness:.05,metalness:.3,transparent:true,opacity:.55}),{x:cx+6.2,y:1.4,z:fz+out*.02});
  mesh(new THREE.BoxGeometry(2.7,.16,.24),frameM,{x:cx+6.2,y:2.86,z:fz+out*.05});for(const dx of [-1.3,1.3])mesh(new THREE.BoxGeometry(.14,2.9,.24),frameM,{x:cx+6.2+dx,y:1.45,z:fz+out*.05});
  mesh(new THREE.BoxGeometry(.06,.9,.08),std({color:'#d9dde3',metalness:.9,roughness:.2}),{x:cx+5.4,y:1.4,z:fz+out*.12});
  mesh(new THREE.BoxGeometry(2.6,.3,.03),std({color:accent,emissive:accent,emissiveIntensity:.3}),{x:cx+6.2,y:3.15,z:fz+out*.18});
  // sign band + neon letters
  mesh(new THREE.BoxGeometry(22,1.6,.35),accentM,{x:cx,y:4.4,z:fz+out*.1});
  const sign=canvasTex(1024,128,(x,w,h)=>{x.clearRect(0,0,w,h);x.font='900 92px Segoe UI, sans-serif';x.textAlign='center';x.textBaseline='middle';x.shadowColor=color;x.shadowBlur=26;x.fillStyle='#ffffff';x.fillText(name,w/2,h/2+6);x.shadowBlur=0;x.fillStyle=color;x.globalAlpha=.6;x.fillText(name,w/2,h/2+6)});
  mesh(new THREE.PlaneGeometry(14,1.75),new THREE.MeshStandardMaterial({map:sign,transparent:true,emissive:'#ffffff',emissiveMap:sign,emissiveIntensity:.9,depthWrite:false}),{x:cx,y:4.4,z:fz+out*.3,cast:false}).rotation.y=out>0?0:Math.PI;
  // striped canvas awning with a scalloped edge
  const stripes=canvasTex(256,64,(x,w,h)=>{for(let i=0;i<8;i++){x.fillStyle=i%2?'#f6f1e6':accent;x.fillRect(i*32,0,32,h)}},{repeat:[5,1]});
  const aw=mesh(new THREE.BoxGeometry(22,.1,2.6),std({map:stripes,roughness:.9}),{x:cx,y:3.55,z:front+out*1.35});aw.rotation.x=out>0?.32:-.32;
  const val=canvasTex(512,64,(x,w2,h2)=>{x.clearRect(0,0,w2,h2);for(let i=0;i<16;i++){x.fillStyle=i%2?'#f6f1e6':accent;x.fillRect(i*32,0,32,30);x.beginPath();x.arc(i*32+16,30,16,0,Math.PI);x.fill()}});
  mesh(new THREE.PlaneGeometry(22,.62),new THREE.MeshStandardMaterial({map:val,transparent:true,alphaTest:.5,side:THREE.DoubleSide,roughness:.9}),{x:cx,y:2.98,z:front+out*2.58,cast:false}).rotation.y=out>0?0:Math.PI;
  // service counter: wood top, coloured front, a register and a few goods
  boxAt(cx-4,cx+4,0,1.0,face<0?-12.4:11.6,face<0?-11.6:12.4,std({color:'#5a3d26'}));
  mesh(new THREE.BoxGeometry(8.3,.1,1.05),std({color:'#c9a77a',roughness:.5}),{x:cx,y:1.05,z:face<0?-12:12});
  mesh(new THREE.BoxGeometry(7.6,.7,.04),accentM,{x:cx,y:.5,z:face<0?-11.58:11.58});
  mesh(new THREE.BoxGeometry(.6,.35,.45),std({color:'#2b2d33'}),{x:cx+2.6,y:1.28,z:face<0?-12:12});mesh(new THREE.BoxGeometry(.5,.3,.05),std({color:'#9fe8ff',emissive:'#3fb7e8',emissiveIntensity:.6}),{x:cx+2.6,y:1.62,z:face<0?-12.1:12.1});
  for(let i=0;i<4;i++)mesh(new THREE.BoxGeometry(.32,.38,.26),std({color:['#e8443a','#3d7be0','#ffd23f','#2fbf71'][i]}),{x:cx-2.8+i*.5,y:1.29,z:face<0?-12:12});
 };
 shop(30,-1,'GREEN THUMB','#5dff8a','#2f7d45','#cfe0c3');
 shop(30,1,'QUICK STOP','#ffcf3d','#c0392b','#efd9a8');
 shop(-30,1,'THREAD CO.','#ff6ad5','#5b3a8c','#e3cbe6');
 // police station
 building(76,104,-42,-16,12,555,'#b9c8dc');
 const pSign=canvasTex(512,128,(x,w,h)=>{x.fillStyle='#0b1a33';x.fillRect(0,0,w,h);x.font='bold 70px Segoe UI, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#9cc8ff';x.fillText('POLICE',w/2,h/2+4)});
 mesh(new THREE.BoxGeometry(12,2.4,.3),std({map:pSign,emissive:'#ffffff',emissiveMap:pSign,emissiveIntensity:.8}),{x:90,y:7,z:-15.8});

 // ---------- apartment with walk-in grow room ----------
 const wallM=std({color:'#d8cfc0'}),floorM=std({map:canvasTex(128,128,(x,w,h)=>{x.fillStyle='#7a5536';x.fillRect(0,0,w,h);for(let i=0;i<h;i+=16){x.fillStyle=i/16%2?'#6e4b2f':'#82593a';x.fillRect(0,i,w,15)}},{repeat:[4,3]})});
 const A={minX:-32,maxX:-12,minZ:-26,maxZ:-11};
 mesh(new THREE.BoxGeometry(A.maxX-A.minX,.1,A.maxZ-A.minZ),floorM,{x:(A.minX+A.maxX)/2,y:.06,z:(A.minZ+A.maxZ)/2,cast:false});
 boxAt(A.minX,A.maxX,0,4,A.minZ-.3,A.minZ,wallM);                       // back
 boxAt(A.minX-.3,A.minX,0,4,A.minZ,A.maxZ,wallM);                       // left
 boxAt(A.maxX,A.maxX+.3,0,4,A.minZ,A.maxZ,wallM);                       // right
 boxAt(A.minX,-23,0,4,A.maxZ,A.maxZ+.3,wallM);boxAt(-20,A.maxX,0,4,A.maxZ,A.maxZ+.3,wallM); // front with door gap
 boxAt(-23,-20,3,4,A.maxZ,A.maxZ+.3,wallM,false);
 boxAt(A.minX-.3,A.maxX+.3,4,4.25,A.minZ-.3,A.maxZ+.3,std({color:'#e9e4da'}),false);  // ceiling
 // upper floors sit on top of the walk-in room (no collider: you can't reach them)
 const upper=building(A.minX-.3,A.maxX+.3,A.minZ-.3,A.maxZ+.3,14,321,'#8f5c4a');colliders.pop();upper.position.y=4.25;
 {const brick=kitMat('brickApt',{color:'#8f5c4a'}),trim=kitMat('trim',{color:'#f3efe6'});const E=.36;
  for(const [x0,x1,z0,z1]of [[A.minX-E,A.maxX+E,A.maxZ+.3,A.maxZ+E],[A.minX-E,A.maxX+E,A.minZ-E,A.minZ-.3],[A.minX-E,A.minX-.3,A.minZ-.3,A.maxZ+.3],[A.maxX+.3,A.maxX+E,A.minZ-.3,A.maxZ+.3]]){
   if(z0===A.maxZ+.3){mesh(new THREE.BoxGeometry(-23-(A.minX-E),4.25,E-.3),brick,{x:(A.minX-E-23)/2,y:2.125,z:(z0+z1)/2});mesh(new THREE.BoxGeometry(A.maxX+E+20,4.25,E-.3),brick,{x:(A.maxX+E-20)/2,y:2.125,z:(z0+z1)/2});mesh(new THREE.BoxGeometry(3,1.25,E-.3),brick,{x:-21.5,y:3.62,z:(z0+z1)/2})}
   else mesh(new THREE.BoxGeometry(x1-x0,4.25,z1-z0),brick,{x:(x0+x1)/2,y:2.125,z:(z0+z1)/2})}
  mesh(new THREE.BoxGeometry(A.maxX-A.minX+1.2,.35,A.maxZ-A.minZ+1.2),trim,{x:(A.minX+A.maxX)/2,y:4.2,z:(A.minZ+A.maxZ)/2,cast:false});
  // front windows (dark glass with frames) either side of the door
  for(const wx of [-29,-25.5,-17,-14]){mesh(new THREE.BoxGeometry(2,1.5,.06),std({color:'#2c3e57',roughness:.1,metalness:.3,emissive:'#ffd98a',emissiveIntensity:0}),{x:wx,y:2.2,z:A.maxZ+E+.02});mesh(new THREE.BoxGeometry(2.3,1.8,.04),trim,{x:wx,y:2.2,z:A.maxZ+E+.005});mesh(new THREE.BoxGeometry(2.4,.12,.2),trim,{x:wx,y:1.4,z:A.maxZ+E+.08})}
  // entrance canopy + steps
  mesh(new THREE.BoxGeometry(4,.18,1.6),kitMat('canopy',{color:'#2f3a4a'}),{x:-21.5,y:3.2,z:A.maxZ+1.1});for(const dx of [-1.8,1.8])mesh(new THREE.CylinderGeometry(.06,.06,3.1,8),kitMat('pole',{color:'#2b2d33',metalness:.5}),{x:-21.5+dx,y:1.55,z:A.maxZ+1.8});
  mesh(new THREE.BoxGeometry(3.4,.14,1.2),kitMat('stone',{color:'#9a958c'}),{x:-21.5,y:.07,z:A.maxZ+.95})}
 // neighbours in the block
 building(-50,-36,-50,-30,16,222,'#a3786a');building(-34,-12,-50,-30,12,223,'#c9c0b0');building(-50,-36,-28,-10,10,224,'#6d7682');
 const roomLight=new THREE.PointLight('#c79bff',14,18,1.6);roomLight.position.set(-22,3.5,-19);scene.add(roomLight);
 const lampPanel=mesh(new THREE.BoxGeometry(8,.08,1.2),std({color:'#222',emissive:'#e4c8ff',emissiveIntensity:1.6}),{x:-25,y:3.9,z:-23.5,cast:false});
 // door sign
 const homeSign=canvasTex(256,96,(x,w,h)=>{x.fillStyle='#20232b';x.fillRect(0,0,w,h);x.fillStyle='#fff';x.font='bold 46px Segoe UI';x.textAlign='center';x.textBaseline='middle';x.fillText('4B',w/2,h/2)});
 mesh(new THREE.BoxGeometry(1.2,.45,.05),std({map:homeSign}),{x:-21.5,y:3.4,z:A.maxZ+.33});

 // furniture: tables, bed
 const wood=std({color:'#6b4a33'});
 const table=(x0,x1,z0,z1,h=.95)=>{boxAt(x0,x1,h-.08,h,z0,z1,wood);for(const [px,pz]of [[x0+.1,z0+.1],[x1-.1,z0+.1],[x0+.1,z1-.1],[x1-.1,z1-.1]])mesh(new THREE.BoxGeometry(.12,h,.12),wood,{x:px,y:h/2,z:pz});addCollider(x0,x1,z0,z1,h)};
 table(-15.5,-12.4,-24.5,-21.5);   // packing table
 table(-15.5,-12.4,-19.5,-16.5);   // mixing station
 mesh(new THREE.BoxGeometry(1.2,.3,.8),std({color:'#bfc6d1'}),{x:-14,y:1.1,z:-23});            // scale/baggies
 mesh(new THREE.CylinderGeometry(.35,.4,.5,16),std({color:'#cfd8e3',metalness:.5,roughness:.3}),{x:-14,y:1.2,z:-18});
 {const fr=std({color:'#5a3d26'});boxAt(-31.6,-27.6,.12,.42,-14.6,-11.4,fr);for(const [x,z]of [[-31.5,-14.5],[-27.7,-14.5],[-31.5,-11.5],[-27.7,-11.5]])mesh(new THREE.BoxGeometry(.14,.3,.14),fr,{x,y:.15,z});
  mesh(new THREE.BoxGeometry(.16,1.25,3.3),fr,{x:-31.62,y:.72,z:-13});mesh(new THREE.BoxGeometry(3.9,.28,3.05),std({color:'#f3efe6'}),{x:-29.6,y:.56,z:-13});
  mesh(new THREE.BoxGeometry(2.7,.1,3.15),std({color:'#3a5a8a',roughness:.95}),{x:-28.95,y:.73,z:-13});mesh(new THREE.BoxGeometry(.35,.12,3.15),std({color:'#e8e2d4'}),{x:-30.35,y:.74,z:-13});
  for(const z of [-13.75,-12.25]){const pl=mesh(new THREE.SphereGeometry(1,14,10),std({color:'#ffffff',roughness:.9}),{x:-31.05,y:.82,z});pl.scale.set(.32,.12,.6)}}
 // pot slots: two rows of four
 const potSlots=[];for(let row=0;row<2;row++)for(let i=0;i<4;i++)potSlots.push(new THREE.Vector3(-30+i*2.4,0,-24.4+row*2.6));
 // grow rack: black metal frame over the pots with purple LED bars, soil shelf, watering can
 {const metal=std({color:'#1c1d22',metalness:.6,roughness:.4}),led=std({color:'#2a1a33',emissive:'#c45cff',emissiveIntensity:2.4}),ledHousing=std({color:'#2b2c33',metalness:.5,roughness:.5});
  const x0=-31.4,x1=-21.4,z0=-25.8,z1=-20.4,top=3.05;
  for(const x of [x0,(x0+x1)/2,x1])for(const z of [z0,z1])mesh(new THREE.BoxGeometry(.08,top,.08),metal,{x,y:top/2,z});
  for(const z of [z0,z1])mesh(new THREE.BoxGeometry(x1-x0,.08,.08),metal,{x:(x0+x1)/2,y:top,z});
  for(const x of [x0,(x0+x1)/2,x1])mesh(new THREE.BoxGeometry(.08,.08,z1-z0),metal,{x,y:top,z:(z0+z1)/2});
  for(let i=0;i<4;i++){const x=-30+i*2.4;for(const z of [-24.4,-21.8]){mesh(new THREE.BoxGeometry(1.5,.07,.42),ledHousing,{x,y:2.62,z,cast:false});mesh(new THREE.BoxGeometry(1.36,.03,.3),led,{x,y:2.575,z,cast:false});for(const sx of [-.6,.6])mesh(new THREE.BoxGeometry(.015,.4,.015),metal,{x:x+sx,y:2.85,z,cast:false})}}
  for(const x of [-28.8,-23.9]){const l=new THREE.PointLight('#b65cff',9,7,1.8);l.position.set(x,2.3,-23.1);scene.add(l)}
  const shelfM=std({color:'#d9d5cc'});const sx=-33.2,sz=-19.5;
  for(const y of [.05,.8,1.55,2.3])mesh(new THREE.BoxGeometry(.9,.06,2.2),shelfM,{x:sx,y,z:sz});for(const dz of [-1.05,1.05])for(const dx of [-.4,.4])mesh(new THREE.BoxGeometry(.05,2.35,.05),shelfM,{x:sx+dx,y:1.17,z:sz+dz});
  const soilTex=canvasTex(128,128,(x,w,h)=>{x.fillStyle='#e9e4d3';x.fillRect(0,0,w,h);x.fillStyle='#3fa34d';x.fillRect(0,0,w,26);x.beginPath();x.ellipse(w/2,h*.6,w*.38,h*.2,0,0,Math.PI*2);x.fill();x.fillStyle='#f4f1e6';x.font='bold 30px Segoe UI';x.textAlign='center';x.textBaseline='middle';x.fillText('SOIL',w/2,h*.6)});
  const soilM=std({map:soilTex,roughness:.95});for(const y of [.4,1.15])for(const dz of [-.55,.55]){const bag=mesh(new THREE.CylinderGeometry(.32,.34,.62,14),soilM,{x:sx,y,z:sz+dz});bag.rotation.y=Math.PI/2}
  for(const [y,dz,c]of [[1.82,-.6,'#b23b3b'],[1.82,0,'#e0b33d'],[1.82,.6,'#3d7be0']])mesh(new THREE.CylinderGeometry(.11,.11,.42,12),std({color:c}),{x:sx,y,z:sz+dz});
  const can=mesh(new THREE.CylinderGeometry(.18,.2,.32,14),std({color:'#3fa9d6',metalness:.3,roughness:.4}),{x:-20.9,y:.16,z:-22.6});const spout=mesh(new THREE.CylinderGeometry(.03,.04,.45,8),std({color:'#3fa9d6'}),{x:-20.65,y:.32,z:-22.6});spout.rotation.z=-1}


 // ---------- park ----------
 const park={minX:-51,maxX:-9,minZ:69,maxZ:111};
 mesh(new THREE.PlaneGeometry(42,42).rotateX(-Math.PI/2),std({color:'#4f9a46'}),{x:-30,y:.03,z:90,cast:false});
 const pathM=std({color:'#c9b48a'});mesh(new THREE.BoxGeometry(3,.04,42),pathM,{x:-30,y:.05,z:90,cast:false});mesh(new THREE.BoxGeometry(42,.04,3),pathM,{x:-30,y:.05,z:90,cast:false});
 const fountain=mesh(new THREE.CylinderGeometry(3.4,3.6,.8,24),std({color:'#9aa3ad'}),{x:-30,y:.4,z:90});addCollider(-33.4,-26.6,86.6,93.4,.8);
 mesh(new THREE.CylinderGeometry(3,3,.1,24),std({color:'#3fa9d6',emissive:'#1b5d7a',emissiveIntensity:.4,roughness:.1,metalness:.2}),{x:-30,y:.82,z:90,cast:false});
 for(const [x,z,rot]of [[-36,84,0],[-24,84,0],[-36,96,Math.PI],[-24,96,Math.PI]]){const b=mesh(new THREE.BoxGeometry(2.4,.12,.7),wood,{x,y:.55,z});b.rotation.y=rot;mesh(new THREE.BoxGeometry(2.4,.6,.1),wood,{x,y:.9,z:z+(rot?-.35:.35)})}
 // ---------- trees ----------
 const trunkM=std({color:'#5a3d26'}),leafMs=['#2f7d3a','#3b8f45','#4a9a3c','#2d6e46'].map(c=>std({color:c}));
 leafMs.forEach(m=>{m.flatShading=true;m.roughness=.85});const pineMs=['#24553a','#2c6342','#1f4a33'].map(c=>std({color:c,flatShading:true,roughness:.85}));
 const tree=(x,z,s=1)=>{mesh(new THREE.CylinderGeometry(.14*s,.26*s,2.4*s,8),trunkM,{x,y:1.2*s,z});const m=leafMs[Math.floor(r()*4)];
  for(let i=0;i<4;i++){const l=mesh(new THREE.IcosahedronGeometry((i?.85:1.15)*s,1),m,{x:x+(i?Math.cos(i*2.1)*.75*s:0),y:(i?2.5:3)*s+(i%2)*.35*s,z:z+(i?Math.sin(i*2.1)*.75*s:0)});l.rotation.set(r(),r(),r());l.scale.y=.85;if(!i)trees.push(l)}
  addCollider(x-.3,x+.3,z-.3,z+.3,3)};
 const pine=(x,z,s=1)=>{const hy=heightAt(x,z);mesh(new THREE.CylinderGeometry(.12*s,.2*s,1.6*s,7),trunkM,{x,y:hy+.8*s,z});const m=pineMs[Math.floor(r()*3)];for(let i=0;i<4;i++){const c=mesh(new THREE.ConeGeometry((1.7-i*.35)*s,(1.9-i*.2)*s,9),m,{x,y:hy+(1.7+i*1.05)*s,z});c.rotation.y=r()*3}};
 for(let i=0;i<26;i++){const x=park.minX+3+r()*(park.maxX-park.minX-6),z=park.minZ+3+r()*(park.maxZ-park.minZ-6);if(Math.abs(x+30)<5||Math.abs(z-90)<5)continue;if(z<90&&x>-29)continue;if(z<85&&x<-34&&x>-46)continue;tree(x,z,.9+r()*.6)}
 for(const s of WALK)for(let p=-100;p<=100;p+=24){if(r()<.5)continue;const along=p+12;const off=s>0?2.2:-2.2;if(Math.abs(along%60)<12)continue;if(r()<.5)tree(s+off,along,.8);}

 // ---------- street lamps ----------
 const poleM=std({color:'#2b2d33',metalness:.6,roughness:.4}),bulbM=std({color:'#fff6d8',emissive:'#ffd98a',emissiveIntensity:0});
 for(const rr of ROADS)for(let p=-105;p<=105;p+=21){for(const side of [-1,1]){if(r()<.3)continue;const x=rr+side*8.6,z=p;if(ROADS.some(q=>Math.abs(q-z)<8))continue;mesh(new THREE.CylinderGeometry(.08,.1,5,8),poleM,{x,y:2.5,z});const arm=mesh(new THREE.BoxGeometry(1.2,.08,.08),poleM,{x:x-side*.6,y:5,z});const b=mesh(new THREE.BoxGeometry(.5,.12,.3),bulbM,{x:x-side*1.1,y:4.92,z,cast:false});lamps.push(new THREE.Vector3(x-side*1.1,4.8,z));addCollider(x-.15,x+.15,z-.15,z+.15,5)}}
 // ---------- parked + moving cars ----------
 const CARC=['#c0392b','#2c3e50','#f1c40f','#ecf0f1','#16a085','#8e44ad','#d35400','#1b1b1f'];
 const car=(color)=>{const g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(1.9,.7,4.2),std({color,metalness:.4,roughness:.4}));body.position.y=.65;const top=new THREE.Mesh(new THREE.BoxGeometry(1.7,.6,2.2),std({color:'#1a2433',metalness:.6,roughness:.15}));top.position.set(0,1.25,-.2);g.add(body,top);for(const [wx,wz]of [[-.9,1.3],[.9,1.3],[-.9,-1.3],[.9,-1.3]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.25,12).rotateZ(Math.PI/2),std({color:'#111'}));w.position.set(wx,.36,wz);g.add(w)}const hl=new THREE.Mesh(new THREE.BoxGeometry(1.5,.15,.05),std({color:'#fff',emissive:'#fff2c0',emissiveIntensity:.3}));hl.position.set(0,.7,2.11);g.add(hl);g.traverse(o=>{if(o.isMesh){o.castShadow=true}});scene.add(g);return g};
 for(let i=0;i<14;i++){const rr=ROADS[Math.floor(r()*3)],axis=r()<.5?'x':'z',p=-100+r()*200;if(ROADS.some(q=>Math.abs(q-p)<10))continue;const c=car(CARC[Math.floor(r()*CARC.length)]);const side=r()<.5?-1:1;if(axis==='z'){c.position.set(rr+side*3.6,0,p);c.rotation.y=side>0?0:Math.PI;addCollider(rr+side*3.6-1,rr+side*3.6+1,p-2.1,p+2.1,1.6)}else{c.position.set(p,0,rr+side*3.6);c.rotation.y=Math.PI/2;addCollider(p-2.1,p+2.1,rr+side*3.6-1,rr+side*3.6+1,1.6)}}
 for(let i=0;i<6;i++){const c=car(CARC[i]);const lane=i%2?1.8:-1.8;const loopAxis=i<3?'z':'x';const road=ROADS[i%3];cars.push({g:c,axis:loopAxis,road,lane,pos:-110+i*40,speed:(i%2?1:-1)*(9+i)})}

 // ---------- edge of map ----------
 const fenceM=std({color:'#3a3d44'});
 // (the sea is the edge of the map now)
 // pines along the coast (the distant hills are islands out at sea now)
 for(let i=0;i<300;i++){const ang=r()*Math.PI*2,k=.86+r()*.12;const R=140*(1+.035*Math.sin(ang*5)+.02*Math.sin(ang*11+1.3))*k;const ca=Math.cos(ang),sa=Math.sin(ang),q=Math.pow(Math.pow(Math.abs(ca),4)+Math.pow(Math.abs(sa),4),.25);const x=ca/q*R,z=sa/q*R;if(Math.abs(x)<125&&Math.abs(z)<125&&Math.max(Math.abs(x),Math.abs(z))<114)continue;if(ROADS.some(q=>Math.abs(q-x)<8||Math.abs(q-z)<8))continue;if(Math.abs(x)<20&&z>112)continue;pine(x,z,.9+r()*.9)}

 // ---------- bus stop ----------
 {const steel=std({color:'#c9ced6',metalness:.7,roughness:.3}),glassB=new THREE.MeshStandardMaterial({color:'#bfe3f2',transparent:true,opacity:.28,roughness:.05,metalness:.2,depthWrite:false});
  mesh(new THREE.BoxGeometry(4.2,.14,1.7),std({color:'#1e5aa8',metalness:.3,roughness:.4}),{x:3,y:2.62,z:-9.3});
  for(const [x,z]of [[1.0,-10.05],[5.0,-10.05],[1.0,-8.65],[5.0,-8.65]])mesh(new THREE.BoxGeometry(.09,2.55,.09),steel,{x,y:1.3,z});
  mesh(new THREE.BoxGeometry(3.9,2.1,.03),glassB,{x:3,y:1.35,z:-10.05,cast:false});mesh(new THREE.BoxGeometry(.03,2.1,1.3),glassB,{x:1.0,y:1.35,z:-9.35,cast:false});
  const ad=canvasTex(256,384,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#1d1f24');g.addColorStop(1,'#3a3d44');x.fillStyle=g;x.fillRect(0,0,w,h);x.fillStyle='#ffd23f';x.font='900 58px Segoe UI, sans-serif';x.textAlign='center';x.fillText('VOLT',w/2,90);x.fillStyle='#fff';x.font='700 26px Segoe UI, sans-serif';x.fillText('ENERGY',w/2,126);x.fillStyle='#ffd23f';x.fillRect(w/2-40,170,80,150);x.fillStyle='#1d1f24';x.beginPath();x.moveTo(w/2+8,190);x.lineTo(w/2-20,250);x.lineTo(w/2,250);x.lineTo(w/2-10,300);x.lineTo(w/2+22,235);x.lineTo(w/2+2,235);x.closePath();x.fill()});
  mesh(new THREE.BoxGeometry(1.1,1.7,.08),std({map:ad,emissive:'#ffffff',emissiveMap:ad,emissiveIntensity:.5}),{x:5.0,y:1.35,z:-9.35}).rotation.y=Math.PI/2;
  mesh(new THREE.BoxGeometry(2.6,.08,.45),wood,{x:2.6,y:.5,z:-9.75});for(const dx of [-1.1,1.1])mesh(new THREE.BoxGeometry(.06,.5,.4),steel,{x:2.6+dx,y:.25,z:-9.75});
  mesh(new THREE.CylinderGeometry(.05,.05,2.8,8),steel,{x:6.0,y:1.4,z:-8.6});const bs=canvasTex(128,128,(x,w,h)=>{x.fillStyle='#1e5aa8';x.beginPath();x.arc(64,64,62,0,7);x.fill();x.fillStyle='#fff';x.font='900 40px Segoe UI, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('BUS',64,66)});
  mesh(new THREE.CylinderGeometry(.42,.42,.04,24).rotateX(Math.PI/2),std({map:bs}),{x:6.0,y:2.85,z:-8.6});addCollider(.9,5.1,-10.1,-9.95,2.6)}

 return {colliders,lamps,windowMats,bulbM,cars,trees,potSlots,roomLight,lampPanel,apartment:A,chimneys,houses,motel:motelAt,gas:gasAt,island};
}

// Sidewalk graph for NPCs: every intersection of sidewalk lines, edges along the lines.
export function walkGraph(){
 const nodes=[];for(const x of WALK)for(const z of WALK)nodes.push([x,z]);
 const idx=(i,j)=>i*WALK.length+j;const edges=nodes.map(()=>[]);
 for(let i=0;i<WALK.length;i++)for(let j=0;j<WALK.length;j++){if(i+1<WALK.length){edges[idx(i,j)].push(idx(i+1,j));edges[idx(i+1,j)].push(idx(i,j))}if(j+1<WALK.length){edges[idx(i,j)].push(idx(i,j+1));edges[idx(i,j+1)].push(idx(i,j))}}
 return {nodes,edges};
}

// Sky + lighting for a given minute of the day.
export function makeSky(scene,renderer){
 const dome=makeSkyDome(scene),sunDir=new THREE.Vector3(),horizon=new THREE.Color(),top=new THREE.Color();
 try{const pm=new THREE.PMREMGenerator(renderer),es=new THREE.Scene();es.add(new THREE.Mesh(new THREE.SphereGeometry(10,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vP;void main(){float y=normalize(vP).y;vec3 t=vec3(.5,.66,.92),h=vec3(.96,.93,.86),g=vec3(.25,.3,.22);gl_FragColor=vec4(y>0.?mix(h,t,pow(y,.6)):mix(h,g,pow(-y,.4)),1.);}'})));scene.environment=pm.fromScene(es,0).texture;pm.dispose()}catch{}
 let envLevel=-1;
 const hemi=new THREE.HemisphereLight('#d6e8ff','#6b7a45',.7);scene.add(hemi);
 const sun=new THREE.DirectionalLight('#fff1d6',2.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-60;sc.right=60;sc.top=60;sc.bottom=-60;sc.near=1;sc.far=260;sun.shadow.bias=-.0004;scene.add(sun,sun.target);
 scene.fog=new THREE.Fog('#a9d0ef',70,430);
 const day=new THREE.Color('#8fc0ef'),dusk=new THREE.Color('#ff9a62'),night=new THREE.Color('#0a1022');
 const tmp=new THREE.Color();
 return {sun,hemi,update(minute,player,world){
  const h=(minute/60)%24;const ang=(h-6)/12*Math.PI;          // 6am rise, 6pm set
  const height=Math.sin(ang);const dayAmt=THREE.MathUtils.clamp(height*2.2+.15,0,1);
  const duskAmt=THREE.MathUtils.clamp(1-Math.abs(height)*4,0,1)*(height>-0.25?1:0);
  tmp.copy(night).lerp(day,dayAmt).lerp(dusk,duskAmt*.55);
  top.copy(tmp).multiplyScalar(.78);horizon.copy(tmp).lerp(new THREE.Color('#ffffff'),.28*dayAmt+.05);if(duskAmt>.2)horizon.lerp(new THREE.Color('#ffb07a'),duskAmt*.45);
  scene.background=horizon.clone();scene.fog.color.copy(horizon);
  sunDir.set(Math.cos(ang)*80,Math.max(2,Math.sin(ang)*90),30).normalize();
  const u=dome.material.uniforms;u.uTop.value.copy(top);u.uHorizon.value.copy(horizon);u.uSunDir.value.copy(sunDir);u.uNight.value=1-dayAmt;u.uSun.value.set(duskAmt>.3?'#ffb27a':'#fff2d6').multiplyScalar(dayAmt*.9+.05);dome.position.set(player.x,0,player.z);
  world.island?.update(performance.now()/1000,sunDir,horizon);if(world.island)world.island.lighthouseLamp.emissiveIntensity=.4+(1-dayAmt)*3;
  sun.intensity=.15+dayAmt*2.1;sun.color.set(duskAmt>.3?'#ffb27a':dayAmt>.1?'#fff1d6':'#8fa8ff');
  const sx=Math.cos(ang)*80,sy=Math.max(15,Math.abs(height)*90);
  sun.position.set(player.x+sx,sy,player.z+30);sun.target.position.set(player.x,0,player.z);
  hemi.intensity=.18+dayAmt*.55;hemi.color.set(dayAmt>.2?'#bcd7ff':'#4a5a8c');
  const nightAmt=1-dayAmt;
  for(const m of world.windowMats){if('emissiveIntensity' in m)m.emissiveIntensity=nightAmt*1.1}
  world.bulbM.emissiveIntensity=nightAmt*2.5;
  renderer.toneMappingExposure=.75+dayAmt*.35;
  const want=Math.round((.18+dayAmt*.5)*20)/20;if(want!==envLevel){envLevel=want;scene.traverse(o=>{const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of ms)if('envMapIntensity' in m)m.envMapIntensity=want})}
  return {dayAmt,nightAmt};
 }};
}
