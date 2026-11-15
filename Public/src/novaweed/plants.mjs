// Nova Weed plants and product props: serrated fan leaves, colas with orange hairs and frost,
// a nursery pot, plus the baggie, joint and bud you hold in first person.
import * as THREE from '/vendor/three/three.module.min.js';

// ---------- fan leaf texture (7 serrated leaflets) ----------
let LEAF_TEX=null;
function leafTexture(){
 if(LEAF_TEX)return LEAF_TEX;
 const S=256,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');
 const bx=S/2,by=S-8;
 const blades=[[-82,.34],[-56,.6],[-28,.86],[0,1],[28,.86],[56,.6],[82,.34]];
 for(const [deg,len]of blades){
  const a=(deg-90)*Math.PI/180,L=len*(S-24),W=L*.13,steps=22;
  const ux=Math.cos(a),uy=Math.sin(a),px=-uy,py=ux;
  const left=[],right=[];
  for(let i=0;i<=steps;i++){const t=i/steps;const w=Math.pow(Math.sin(Math.PI*Math.min(1,t*1.08)),.9)*W*(1-t*.15);const tooth=(i%2?1:.72);
   const cx=bx+ux*L*t,cy=by+uy*L*t;left.push([cx+px*w*tooth,cy+py*w*tooth]);right.push([cx-px*w*tooth,cy-py*w*tooth])}
  x.beginPath();x.moveTo(bx,by);for(const p of left)x.lineTo(p[0],p[1]);for(const p of right.reverse())x.lineTo(p[0],p[1]);x.closePath();
  const g=x.createLinearGradient(bx,by,bx+ux*L,by+uy*L);g.addColorStop(0,'#cfe9c0');g.addColorStop(1,'#ffffff');x.fillStyle=g;x.fill();
  x.strokeStyle='rgba(120,160,100,.65)';x.lineWidth=2;x.beginPath();x.moveTo(bx,by);x.lineTo(bx+ux*L*.95,by+uy*L*.95);x.stroke();
 }
 x.fillStyle='#b9d9a6';x.fillRect(bx-3,by-6,6,14);
 LEAF_TEX=new THREE.CanvasTexture(c);LEAF_TEX.colorSpace=THREE.SRGBColorSpace;LEAF_TEX.anisotropy=4;return LEAF_TEX;
}
// a leaf plane with its stalk at the origin, pointing up (+y)
let LEAF_GEO=null;
const leafGeo=()=>LEAF_GEO||(LEAF_GEO=new THREE.PlaneGeometry(1,1,2,2).translate(0,.5,0));

// ---------- cola (bud cluster) ----------
const PISTIL=new THREE.MeshStandardMaterial({color:'#e07a2a',roughness:.6});
function cola(budMat,len=.32,r=.07){
 const g=new THREE.Group();const n=Math.round(len/.045);
 for(let i=0;i<n;i++){const t=i/(n-1||1),rr=r*(1-t*.55);
  for(let k=0;k<3;k++){const a=k*2.1+i*1.3;const b=new THREE.Mesh(new THREE.IcosahedronGeometry(rr*(.75+((i*7+k)%3)*.12),1),budMat);b.position.set(Math.cos(a)*rr*.55,t*len,Math.sin(a)*rr*.55);b.scale.y=1.25;g.add(b)}
  if(i%2===0)for(let k=0;k<3;k++){const p=new THREE.Mesh(new THREE.CylinderGeometry(.004,.004,.05,4),PISTIL);const a=k*2.3+i;p.position.set(Math.cos(a)*rr,t*len+.01,Math.sin(a)*rr);p.rotation.set(Math.cos(a)*1.1,0,-Math.sin(a)*1.1);g.add(p)}
 }
 // little sugar leaves poking out
 return g;
}

// ---------- the plant ----------
// Returns {plant,buds,leafMat,budMat}; scale plant by growth, show buds when flowering.
export function makePlantModel(){
 const plant=new THREE.Group(),buds=new THREE.Group();
 const leafMat=new THREE.MeshStandardMaterial({map:leafTexture(),color:'#3fa34d',alphaTest:.45,side:THREE.DoubleSide,roughness:.75});
 const stemMat=new THREE.MeshStandardMaterial({color:'#5d8f3c',roughness:.8});
 const budMat=new THREE.MeshStandardMaterial({color:'#9be06a',roughness:.55,emissive:'#2a5a10',emissiveIntensity:.2});
 const H=1.15;
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(.018,.032,H,7).translate(0,H/2,0),stemMat);plant.add(stem);
 const leaf=(parent,y,ang,size,tilt)=>{const piv=new THREE.Group();piv.position.y=y;piv.rotation.y=ang;const l=new THREE.Mesh(leafGeo(),leafMat);l.scale.set(size,size,size);l.rotation.x=tilt;l.position.z=.02;piv.add(l);parent.add(piv);return l};
 // nodes up the stem: pairs of fan leaves, alternating 90 degrees; side branches lower down
 const nodes=6;
 for(let i=0;i<nodes;i++){
  const t=i/(nodes-1),y=.12+t*(H-.25),size=.5-t*.22,ang=i*Math.PI/2;
  for(const s of [0,Math.PI])leaf(plant,y,ang+s,size,1.05-t*.25);
  if(i>0&&i<nodes-1){
   for(const s of [0,Math.PI]){const br=new THREE.Group();br.position.y=y;br.rotation.y=ang+s+Math.PI/4;plant.add(br);
    const blen=.32-t*.18;const bm=new THREE.Mesh(new THREE.CylinderGeometry(.008,.012,blen,5).translate(0,blen/2,0),stemMat);bm.rotation.x=.75;br.add(bm);
    const tip=new THREE.Group();tip.position.set(0,Math.cos(.75)*blen,Math.sin(.75)*blen);br.add(tip);
    for(const s2 of [-.6,.6]){const lp=new THREE.Group();lp.rotation.y=s2;tip.add(lp);const l=new THREE.Mesh(leafGeo(),leafMat);l.scale.setScalar(size*.6);l.rotation.x=.9;lp.add(l)}
    // side colas belong to the bud group so they hide until flowering
    const holder=new THREE.Group();holder.position.y=y;holder.rotation.y=br.rotation.y;const cc=cola(budMat,.14+t*.06,.035);cc.position.set(0,Math.cos(.75)*blen,Math.sin(.75)*blen);cc.rotation.x=.35;holder.add(cc);buds.add(holder);
   }
  }
 }
 // top cola
 const top=cola(budMat,.34,.06);top.position.y=H-.12;buds.add(top);
 // small top leaves
 for(let k=0;k<4;k++)leaf(plant,H-.05,k*Math.PI/2+.4,.22,.5);
 plant.add(buds);
 plant.traverse(o=>{if(o.isMesh){o.castShadow=true}});
 return {plant,buds,leafMat,budMat};
}
// black nursery pot with a rolled rim and textured soil
export function makePotModel(){
 const g=new THREE.Group();const potM=new THREE.MeshStandardMaterial({color:'#24262a',roughness:.55});
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.42,.31,.6,24,1,true),potM);body.position.y=.3;
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.03,24),potM);base.position.y=.015;
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.425,.03,8,28).rotateX(Math.PI/2),potM);rim.position.y=.6;
 const inner=new THREE.Mesh(new THREE.CylinderGeometry(.41,.3,.58,24,1,true),new THREE.MeshStandardMaterial({color:'#141518',roughness:.8,side:THREE.BackSide}));inner.position.y=.31;
 g.add(body,base,rim,inner);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
 return {g,body};
}
export function makeSoil(){
 const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='#3a2617';x.fillRect(0,0,64,64);for(let i=0;i<500;i++){x.fillStyle=Math.random()<.5?'rgba(0,0,0,.35)':'rgba(140,100,60,.35)';x.fillRect(Math.random()*64,Math.random()*64,1+Math.random()*2,1+Math.random()*2)}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const m=new THREE.Mesh(new THREE.CircleGeometry(.4,24).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:t,roughness:1}));return m;
}

// ---------- held props (first person) ----------
// Zip baggie with a few buds inside.
export function baggieModel(color='#58c96b'){
 const g=new THREE.Group();
 const bag=new THREE.Mesh(new THREE.BoxGeometry(.11,.14,.025),new THREE.MeshStandardMaterial({color:'#eef7ef',transparent:true,opacity:.42,roughness:.15,metalness:0,depthWrite:false}));
 const zip=new THREE.Mesh(new THREE.BoxGeometry(.112,.012,.028),new THREE.MeshStandardMaterial({color:'#e8443a',roughness:.4}));zip.position.y=.058;
 const bm=new THREE.MeshStandardMaterial({color,roughness:.6,emissive:'#1d3a10',emissiveIntensity:.15});
 for(let i=0;i<4;i++){const b=new THREE.Mesh(new THREE.IcosahedronGeometry(.022,1),bm);b.position.set((i%2-.5)*.04,-.045+Math.floor(i/2)*.03,0);b.scale.y=1.3;g.add(b)}
 for(let i=0;i<3;i++){const p=new THREE.Mesh(new THREE.CylinderGeometry(.002,.002,.02,3),PISTIL);p.position.set((i-1)*.025,-.03,.01);p.rotation.z=i;g.add(p)}
 g.add(bag,zip);return g;
}
// Rolled cone joint: paper tapers to a twisted tip; filter at the mouth end; glowing ember + ash.
export function jointModel(){
 const g=new THREE.Group();
 const paperM=new THREE.MeshStandardMaterial({color:'#f4f0e4',roughness:.85});
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.0145,.0085,.12,12).rotateX(Math.PI/2),paperM);body.position.z=0;
 const filter=new THREE.Mesh(new THREE.CylinderGeometry(.0088,.0085,.022,12).rotateX(Math.PI/2),new THREE.MeshStandardMaterial({color:'#c99a5b',roughness:.9}));filter.position.z=.069;
 const ash=new THREE.Mesh(new THREE.CylinderGeometry(.0135,.0143,.012,12).rotateX(Math.PI/2),new THREE.MeshStandardMaterial({color:'#8d8a85',roughness:1}));ash.position.z=-.064;
 const emberM=new THREE.MeshStandardMaterial({color:'#ff7a2a',emissive:'#ff4a00',emissiveIntensity:1.6,roughness:.6});
 const ember=new THREE.Mesh(new THREE.CylinderGeometry(.0132,.0137,.006,12).rotateX(Math.PI/2),emberM);ember.position.z=-.072;
 // a seam line along the paper
 const seam=new THREE.Mesh(new THREE.BoxGeometry(.0015,.002,.11),new THREE.MeshStandardMaterial({color:'#e2dccb'}));seam.position.set(0,.0118,0);
 g.add(body,filter,ash,ember,seam);
 const tip=new THREE.Object3D();tip.position.z=-.08;g.add(tip);
 g.userData={tip,emberM,ash};return g;
}
// A single bud (for seeds/products on display)
export function budModel(color='#58c96b'){const g=new THREE.Group();const m=new THREE.MeshStandardMaterial({color,roughness:.6});const c=cola(m,.06,.025);g.add(c);return g}
