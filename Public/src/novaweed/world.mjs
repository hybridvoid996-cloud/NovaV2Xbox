// Nova City: procedurally built low-poly neighbourhood.
// Roads run along x/z = -60, 0, 60. Sidewalk centre lines are 6.5m either side of a road.
import * as THREE from '/vendor/three/three.module.min.js';
import {rng} from './people.mjs';

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
 mesh(new THREE.PlaneGeometry(260,260).rotateX(-Math.PI/2),std({map:grassTex}),{cast:false});
 const roadTex=canvasTex(128,512,(x,w,h)=>{noise(x,w,h,'#2a2b30',40,3000);x.fillStyle='#e8d36a';for(let y=0;y<h;y+=64)x.fillRect(w/2-3,y,6,34);x.fillStyle='#d9d9df';x.fillRect(4,0,4,h);x.fillRect(w-8,0,4,h)});
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
 const windowTex=(seed,cols,rows,wall)=>{const rr=rng(seed);let lit=[];const color=canvasTex(256,256,(x,w,h)=>{x.fillStyle=wall;x.fillRect(0,0,w,h);const cw=w/cols,ch=h/rows;for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const on=rr()<.45;lit.push(on);x.fillStyle=on?'#3a3f4d':'#2a2e38';x.fillRect(i*cw+cw*.2,j*ch+ch*.22,cw*.6,ch*.56);x.fillStyle='rgba(255,255,255,.08)';x.fillRect(i*cw+cw*.2,j*ch+ch*.22,cw*.6,ch*.12)}});let k=0;const em=canvasTex(256,256,(x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);const cw=w/cols,ch=h/rows;for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){if(lit[k++]){x.fillStyle=rr()<.5?'#ffd98a':'#ffe9c2';x.fillRect(i*cw+cw*.2,j*ch+ch*.22,cw*.6,ch*.56)}}});return {color,em}};
 const WALLS=['#8f5c4a','#b8a58a','#6d7682','#a3786a','#c9c0b0','#5d6b5a','#7c6a8e','#9c8a6c'];
 const building=(minX,maxX,minZ,maxZ,height,seed,wall)=>{
  const {color,em}=windowTex(seed,4,6,wall);const fx=(maxX-minX)/6,fz=(maxZ-minZ)/6,fy=height/8;
  const mk=(rx,ry)=>{const c=color.clone(),e=em.clone();c.needsUpdate=e.needsUpdate=true;c.repeat.set(rx,ry);e.repeat.set(rx,ry);const m=std({map:c,emissiveMap:e,emissive:'#ffffff',emissiveIntensity:0});windowMats.push(m);return m};
  const mats=[mk(fz,fy),mk(fz,fy),std({color:'#3b3b42'}),std({color:'#222'}),mk(fx,fy),mk(fx,fy)];
  const o=mesh(new THREE.BoxGeometry(maxX-minX,height,maxZ-minZ),mats,{x:(minX+maxX)/2,y:height/2,z:(minZ+maxZ)/2});
  addCollider(minX,maxX,minZ,maxZ,height);
  // roof trim
  mesh(new THREE.BoxGeometry(maxX-minX+.6,.5,maxZ-minZ+.6),std({color:'#2b2b31'}),{x:(minX+maxX)/2,y:height+.25,z:(minZ+maxZ)/2});
  return o;
 };
 const blocks=[-90,-30,30,90];
 const reserved=new Set(['-30,-30','30,-30','30,30','-30,30','90,-30','-30,90']);
 for(const bx of blocks)for(const bz of blocks){
  if(reserved.has(bx+','+bz))continue;
  const minX=bx-21,maxX=bx+21,minZ=bz-21,maxZ=bz+21;
  // 2x2 lots with gaps (alleys)
  for(const [ax,az]of [[0,0],[1,0],[0,1],[1,1]]){
   if(r()<.15)continue;
   const x0=minX+ax*22+1,z0=minZ+az*22+1;const h=8+Math.floor(r()*5)*4;
   building(x0,x0+18+r()*1,z0,z0+18+r()*1,h,Math.floor(r()*1e6),WALLS[Math.floor(r()*WALLS.length)]);
  }
 }
 // shops
 const shop=(cx,face,name,color,accent,wall)=>{
  const front=face<0?-14:14;const minZ=face<0?-42:14,maxZ=face<0?-14:42;
  building(cx-14,cx+14,minZ,maxZ,10,cx*7+face,wall);
  // storefront + awning + counter + sign
  const zf=front+face*-.01;
  mesh(new THREE.BoxGeometry(20,4,.2),std({color:'#1a1d24',emissive:color,emissiveIntensity:.15}),{x:cx,y:2.2,z:front+(face<0?.11:-.11)});
  const aw=mesh(new THREE.BoxGeometry(22,.25,3.4),std({color:accent}),{x:cx,y:4.4,z:front+(face<0?1.6:-1.6)});aw.rotation.x=face<0?-.12:.12;
  boxAt(cx-4,cx+4,0,1.1,face<0?-12.4:11.6,face<0?-11.6:12.4,std({color:'#6b4a33'}));
  const sign=canvasTex(512,128,(x,w,h)=>{x.fillStyle='#111';x.fillRect(0,0,w,h);x.font='bold 64px Segoe UI, sans-serif';x.textAlign='center';x.textBaseline='middle';x.shadowColor=color;x.shadowBlur=24;x.fillStyle=color;x.fillText(name,w/2,h/2+4)});
  mesh(new THREE.BoxGeometry(12,2.4,.3),std({map:sign,emissive:'#ffffff',emissiveMap:sign,emissiveIntensity:.9}),{x:cx,y:6.6,z:front+(face<0?.3:-.3)});
 };
 shop(30,-1,'GREEN THUMB','#5dff8a','#2f7d45','#7d8a74');
 shop(30,1,'QUICK STOP','#ffcf3d','#c0392b','#b8a58a');
 shop(-30,1,'THREAD CO.','#ff6ad5','#5b3a8c','#6d7682');
 // police station
 building(76,104,-42,-16,12,555,'#5e6b80');
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
 const upper=building(A.minX-.3,A.maxX+.3,A.minZ-.3,A.maxZ+.3,14,321,'#8f5c4a');colliders.pop();upper.position.y=4+7;
 // neighbours in the block
 building(-50,-36,-50,-30,16,222,'#a3786a');building(-34,-12,-50,-30,12,223,'#c9c0b0');building(-50,-36,-28,-10,10,224,'#6d7682');
 const roomLight=new THREE.PointLight('#d7b6ff',18,18,1.6);roomLight.position.set(-22,3.5,-19);scene.add(roomLight);
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
 boxAt(-31.6,-27.6,0,.6,-14.6,-11.4,std({color:'#3a4a7a'}));mesh(new THREE.BoxGeometry(1.2,.25,3),std({color:'#f2f2f2'}),{x:-30.8,y:.75,z:-13});
 // pot slots: two rows of four
 const potSlots=[];for(let row=0;row<2;row++)for(let i=0;i<4;i++)potSlots.push(new THREE.Vector3(-30+i*2.4,0,-24.4+row*2.6));

 // ---------- park ----------
 const park={minX:-51,maxX:-9,minZ:69,maxZ:111};
 mesh(new THREE.PlaneGeometry(42,42).rotateX(-Math.PI/2),std({color:'#4f9a46'}),{x:-30,y:.03,z:90,cast:false});
 const pathM=std({color:'#c9b48a'});mesh(new THREE.BoxGeometry(3,.04,42),pathM,{x:-30,y:.05,z:90,cast:false});mesh(new THREE.BoxGeometry(42,.04,3),pathM,{x:-30,y:.05,z:90,cast:false});
 const fountain=mesh(new THREE.CylinderGeometry(3.4,3.6,.8,24),std({color:'#9aa3ad'}),{x:-30,y:.4,z:90});addCollider(-33.4,-26.6,86.6,93.4,.8);
 mesh(new THREE.CylinderGeometry(3,3,.1,24),std({color:'#3fa9d6',emissive:'#1b5d7a',emissiveIntensity:.4,roughness:.1,metalness:.2}),{x:-30,y:.82,z:90,cast:false});
 for(const [x,z,rot]of [[-36,84,0],[-24,84,0],[-36,96,Math.PI],[-24,96,Math.PI]]){const b=mesh(new THREE.BoxGeometry(2.4,.12,.7),wood,{x,y:.55,z});b.rotation.y=rot;mesh(new THREE.BoxGeometry(2.4,.6,.1),wood,{x,y:.9,z:z+(rot?-.35:.35)})}
 // ---------- trees ----------
 const trunkM=std({color:'#5a3d26'}),leafMs=['#2f7d3a','#3b8f45','#4a9a3c','#2d6e46'].map(c=>std({color:c}));
 const tree=(x,z,s=1)=>{mesh(new THREE.CylinderGeometry(.18*s,.25*s,2*s,8),trunkM,{x,y:s,z});const l=mesh(new THREE.IcosahedronGeometry(1.4*s,0),leafMs[Math.floor(r()*4)],{x,y:2.6*s,z});l.rotation.set(r(),r(),r());addCollider(x-.3,x+.3,z-.3,z+.3,3);trees.push(l)};
 for(let i=0;i<26;i++){const x=park.minX+3+r()*(park.maxX-park.minX-6),z=park.minZ+3+r()*(park.maxZ-park.minZ-6);if(Math.abs(x+30)<5||Math.abs(z-90)<5)continue;tree(x,z,.9+r()*.6)}
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
 for(const [a,b,c,d]of [[-BOUND-1,BOUND+1,-BOUND-1,-BOUND],[-BOUND-1,BOUND+1,BOUND,BOUND+1],[-BOUND-1,-BOUND,-BOUND,BOUND],[BOUND,BOUND+1,-BOUND,BOUND]])boxAt(a,b,0,2.2,c,d,fenceM);
 // distant skyline
 const far=std({color:'#1d2230'});for(let i=0;i<60;i++){const ang=i/60*Math.PI*2,dist=170+r()*30,h=20+r()*60;const o=mesh(new THREE.BoxGeometry(12+r()*10,h,12+r()*10),far,{x:Math.cos(ang)*dist,y:h/2,z:Math.sin(ang)*dist,cast:false,receive:false});windowMats.push(o.material)}

 // ---------- bus stop ----------
 mesh(new THREE.BoxGeometry(3.6,.1,1.4),std({color:'#1e5aa8'}),{x:3,y:2.6,z:-9.4});mesh(new THREE.BoxGeometry(.1,2.6,1.4),poleM,{x:1.3,y:1.3,z:-9.4});mesh(new THREE.BoxGeometry(.1,2.6,1.4),poleM,{x:4.7,y:1.3,z:-9.4});
 mesh(new THREE.BoxGeometry(3.2,.1,.5),wood,{x:3,y:.55,z:-9.7});

 return {colliders,lamps,windowMats,bulbM,cars,trees,potSlots,roomLight,lampPanel,apartment:A};
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
 const hemi=new THREE.HemisphereLight('#bcd7ff','#3b4a2a',.6);scene.add(hemi);
 const sun=new THREE.DirectionalLight('#fff1d6',2.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-60;sc.right=60;sc.top=60;sc.bottom=-60;sc.near=1;sc.far=260;sun.shadow.bias=-.0004;scene.add(sun,sun.target);
 scene.fog=new THREE.Fog('#9ec4e8',60,230);
 const day=new THREE.Color('#8fc0ef'),dusk=new THREE.Color('#ff9a62'),night=new THREE.Color('#0a1022');
 const tmp=new THREE.Color();
 return {sun,hemi,update(minute,player,world){
  const h=(minute/60)%24;const ang=(h-6)/12*Math.PI;          // 6am rise, 6pm set
  const height=Math.sin(ang);const dayAmt=THREE.MathUtils.clamp(height*2.2+.15,0,1);
  const duskAmt=THREE.MathUtils.clamp(1-Math.abs(height)*4,0,1)*(height>-0.25?1:0);
  tmp.copy(night).lerp(day,dayAmt).lerp(dusk,duskAmt*.55);
  scene.background=tmp.clone();scene.fog.color.copy(tmp);
  sun.intensity=.15+dayAmt*2.1;sun.color.set(duskAmt>.3?'#ffb27a':dayAmt>.1?'#fff1d6':'#8fa8ff');
  const sx=Math.cos(ang)*80,sy=Math.max(15,Math.abs(height)*90);
  sun.position.set(player.x+sx,sy,player.z+30);sun.target.position.set(player.x,0,player.z);
  hemi.intensity=.18+dayAmt*.55;hemi.color.set(dayAmt>.2?'#bcd7ff':'#4a5a8c');
  const nightAmt=1-dayAmt;
  for(const m of world.windowMats){if('emissiveIntensity' in m)m.emissiveIntensity=nightAmt*1.1}
  world.bulbM.emissiveIntensity=nightAmt*2.5;
  renderer.toneMappingExposure=.75+dayAmt*.35;
  return {dayAmt,nightAmt};
 }};
}
