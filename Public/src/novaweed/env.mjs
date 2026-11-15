// Nova Weed environment: the island (grass, beach, sea), sky dome, distant islands,
// pier + lighthouse, and shader patterns that make flat-coloured walls and roofs look built.
import * as THREE from '/vendor/three/three.module.min.js';

// Island outline: a rounded square (superellipse) so the town grid fits, with a wobbly coastline.
export const ISLAND_R=140;
const N=4;
export function coastR(ang){return ISLAND_R*(1+.035*Math.sin(ang*5)+.02*Math.sin(ang*11+1.3))}
// distance factor: <1 inside the island edge, 1 on the coast
export function islandK(x,z){const ang=Math.atan2(z,x),R=coastR(ang);return Math.pow(Math.pow(Math.abs(x)/R,N)+Math.pow(Math.abs(z)/R,N),1/N)}
// keep things on land (beach included)
export function clampToIsland(p,extra=10){const k=islandK(p.x,p.z),lim=1+extra/ISLAND_R;if(k>lim){p.x*=lim/k;p.z*=lim/k}}

function canvasTex(w,h,draw,repeat=1){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;if(repeat!==1)t.repeat.set(repeat,repeat);return t}
function speckle(x,w,h,base,n,spread,seed=1){x.fillStyle=base;x.fillRect(0,0,w,h);let s=seed;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;for(let i=0;i<n;i++){const v=(rnd()-.5)*spread;x.fillStyle=v>0?`rgba(255,255,240,${v/255})`:`rgba(0,10,0,${-v/255})`;const r=1+rnd()*3;x.fillRect(rnd()*w,rnd()*h,r,r)}}

// ring/disc in island shape: rows of [scale, y, color]; scale 1 = coastline
function shapeRings(rows,seg=220){
 const pos=[],col=[],idx=[],c=new THREE.Color();
 for(let r=0;r<rows.length;r++)for(let i=0;i<=seg;i++){
  const a=i/seg*Math.PI*2,R=coastR(a)*rows[r][0];
  // invert the superellipse so the ring follows the rounded-square outline
  const ca=Math.cos(a),sa=Math.sin(a),k=Math.pow(Math.pow(Math.abs(ca),N)+Math.pow(Math.abs(sa),N),1/N);
  pos.push(ca/k*R,rows[r][1],sa/k*R);c.set(rows[r][2]);col.push(c.r,c.g,c.b);
 }
 for(let r=0;r<rows.length-1;r++)for(let i=0;i<seg;i++){const a=r*(seg+1)+i,b=a+seg+1;idx.push(a,a+1,b,a+1,b+1,b)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g;
}

const WATER_V=`
uniform float uTime;varying vec3 vW;
#include <fog_pars_vertex>
void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
const WATER_F=`
uniform float uTime;uniform vec3 uDeep,uShallow,uSky,uSun;uniform vec3 uSunDir;uniform float uIslandR;varying vec3 vW;
#include <fog_pars_fragment>
float coast(float a){return uIslandR*(1.+.035*sin(a*5.)+.02*sin(a*11.+1.3));}
void main(){
 vec2 p=vW.xz;float t=uTime;
 // layered waves -> normal
 vec2 g=vec2(0.);
 g+=vec2(.8,.3)*cos(dot(p,vec2(.8,.3))*.35+t*1.1)*.35;
 g+=vec2(-.4,.9)*cos(dot(p,vec2(-.4,.9))*.6+t*1.6)*.22;
 g+=vec2(.6,-.7)*cos(dot(p,vec2(.6,-.7))*1.3+t*2.3)*.1;
 g+=vec2(-.9,-.2)*cos(dot(p,vec2(-.9,-.2))*2.7+t*3.1)*.05;
 float fade=clamp(1.-length(cameraPosition-vW)/220.,.08,1.);g*=.45*fade;
 vec3 n=normalize(vec3(-g.x,1.,-g.y));
 vec3 v=normalize(cameraPosition-vW);
 float fres=pow(1.-max(dot(n,v),0.),4.);
 // distance from the coast (in island-shape units) for shallow colour + foam
 float a=atan(p.y,p.x);float R=coast(a);float k=pow(pow(abs(p.x)/R,4.)+pow(abs(p.y)/R,4.),.25);
 float shore=clamp((k-1.07)/.12,0.,1.);
 vec3 col=mix(uShallow,uDeep,shore);
 col=mix(col,uSky,fres*.55+.06);
 vec3 h=normalize(uSunDir+v);float spec=pow(max(dot(n,h),0.),180.)*2.2;col+=uSun*spec;
 float foam=smoothstep(.035,0.,abs(k-1.085-sin(t*.8+a*20.)*.006))*.75;col=mix(col,vec3(.95),foam);
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`;
const SKY_V=`varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w*.9999;}`;
const SKY_F=`uniform vec3 uTop,uHorizon,uSun,uSunDir;uniform float uNight;varying vec3 vD;
float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}
void main(){float y=max(vD.y,0.);vec3 c=mix(uHorizon,uTop,pow(y,.55));
 float s=max(dot(vD,normalize(uSunDir)),0.);c+=uSun*(pow(s,600.)*3.+pow(s,8.)*.25);
 // stars at night
 vec3 q=floor(vD*240.);float st=step(.9975,h(q))*uNight*smoothstep(0.,.25,vD.y);c+=vec3(st);
 gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
}`;

export function buildIsland(scene,addCollider){
 const grassTex=canvasTex(512,512,(x,w,h)=>{speckle(x,w,h,'#4a8a3e',14000,120,7);for(let i=0;i<500;i++){x.fillStyle=`rgba(${120+Math.random()*60},${150+Math.random()*60},60,.12)`;x.beginPath();x.arc(Math.random()*w,Math.random()*h,6+Math.random()*22,0,7);x.fill()}});
 grassTex.repeat.set(1/7,1/7);
 // land: grass disc + beach + underwater slope, all following the coastline
 const landRows=[[0,0,'#ffffff'],[.97,0,'#ffffff'],[1.0,.02,'#ffffff']];
 const land=new THREE.Mesh(shapeRings(landRows),new THREE.MeshStandardMaterial({map:grassTex,roughness:.95,vertexColors:true}));
 // world-space UVs for the grass texture
 {const g=land.geometry,p=g.attributes.position,uv=[];for(let i=0;i<p.count;i++)uv.push(p.getX(i),p.getZ(i));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2))}
 land.receiveShadow=true;scene.add(land);buildHills(scene,grassTex);
 const beach=new THREE.Mesh(shapeRings([[1.0,.02,'#5d8f45'],[1.02,.0,'#d9c48f'],[1.06,-.12,'#e8d7a6'],[1.09,-.55,'#cdb47e'],[1.16,-2.2,'#9c8a5e'],[1.35,-6,'#4f5d4a']]),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));
 beach.receiveShadow=true;scene.add(beach);
 // sea
 const water=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400,1,1).rotateX(-Math.PI/2),new THREE.ShaderMaterial({vertexShader:WATER_V,fragmentShader:WATER_F,fog:true,
  uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uTime:{value:0},uDeep:{value:new THREE.Color('#1d5c7c')},uShallow:{value:new THREE.Color('#3fb7b5')},uSky:{value:new THREE.Color('#9fd0f0')},uSun:{value:new THREE.Color('#fff2d6')},uSunDir:{value:new THREE.Vector3(.4,.6,.3)},uIslandR:{value:ISLAND_R}}])}));
 water.position.y=-.45;scene.add(water);
 // distant islands with pine-covered hills, softened by fog
 const far=new THREE.Group();const hillM=new THREE.MeshStandardMaterial({color:'#4f7a52',roughness:1,flatShading:true}),rockM=new THREE.MeshStandardMaterial({color:'#8a8f86',roughness:1,flatShading:true});
 let s=11;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
 for(let i=0;i<9;i++){const a=i/9*Math.PI*2+rnd()*.4,d=330+rnd()*120;const cx=Math.cos(a)*d,cz=Math.sin(a)*d;
  for(let j=0;j<4;j++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1,2),j===0?rockM:hillM);const w=25+rnd()*40;m.scale.set(w,10+rnd()*28,w*(.6+rnd()*.5));m.position.set(cx+(rnd()-.5)*60,-3,cz+(rnd()-.5)*60);far.add(m)}}
 scene.add(far);
 // pier on the south beach + lighthouse on the north-east point
 const wood=new THREE.MeshStandardMaterial({color:'#8a6a48',roughness:.9});
 const pier=new THREE.Group();const pz=coastR(Math.PI/2)*1.0;
 const deck=new THREE.Mesh(new THREE.BoxGeometry(5,.25,34),wood);deck.position.set(20,.55,pz+12);deck.castShadow=deck.receiveShadow=true;pier.add(deck);
 for(let z=-4;z<=28;z+=4)for(const x of [17.8,22.2]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,3,8),wood);post.position.set(x,-.7,pz+z);pier.add(post)}
 for(const x of [17.6,22.4]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,32),wood);rail.position.set(x,1.5,pz+13);pier.add(rail);for(let z=-3;z<=29;z+=3.2){const p=new THREE.Mesh(new THREE.BoxGeometry(.1,1,.1),wood);p.position.set(x,1.05,pz+z);pier.add(p)}}
 scene.add(pier);
 const lh=new THREE.Group();const la=-Math.PI/4,lr=coastR(la)*1.03;const lx=Math.cos(la)/Math.pow(Math.pow(Math.abs(Math.cos(la)),N)+Math.pow(Math.abs(Math.sin(la)),N),1/N)*lr,lz=Math.sin(la)/Math.pow(Math.pow(Math.abs(Math.cos(la)),N)+Math.pow(Math.abs(Math.sin(la)),N),1/N)*lr;
 const white=new THREE.MeshStandardMaterial({color:'#f3efe6',roughness:.7}),red=new THREE.MeshStandardMaterial({color:'#c0392b',roughness:.6});
 for(let i=0;i<5;i++){const seg=new THREE.Mesh(new THREE.CylinderGeometry(2.2-i*.25,2.45-i*.25,3,20),i%2?red:white);seg.position.y=1.5+i*3;seg.castShadow=true;lh.add(seg)}
 const lamp=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,1.6,16),new THREE.MeshStandardMaterial({color:'#fff6d8',emissive:'#ffd98a',emissiveIntensity:1}));lamp.position.y=16;lh.add(lamp);
 const cap=new THREE.Mesh(new THREE.ConeGeometry(1.6,1.6,16),red);cap.position.y=17.6;lh.add(cap);
 lh.position.set(lx,0,lz);scene.add(lh);addCollider?.(lx-2.5,lx+2.5,lz-2.5,lz+2.5,18);
 return {water,lighthouseLamp:lamp.material,update(t,sunDir,skyColor){water.material.uniforms.uTime.value=t;if(sunDir)water.material.uniforms.uSunDir.value.copy(sunDir);if(skyColor)water.material.uniforms.uSky.value.copy(skyColor)}};
}

export function makeSkyDome(scene){
 const m=new THREE.Mesh(new THREE.SphereGeometry(900,32,16),new THREE.ShaderMaterial({vertexShader:SKY_V,fragmentShader:SKY_F,side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{uTop:{value:new THREE.Color('#4f8fd6')},uHorizon:{value:new THREE.Color('#cfe6f7')},uSun:{value:new THREE.Color('#fff2d6')},uSunDir:{value:new THREE.Vector3(.3,.5,.2)},uNight:{value:0}}}));
 m.renderOrder=-10;m.frustumCulled=false;scene.add(m);return m;
}

// Procedural surface detail without textures: lap siding, brick courses, roof shingles,
// plus darkening near the ground (cheap ambient occlusion). Patterns follow world position.
const PAT={siding:1,brick:2,shingle:3,plain:0};
export function patterned(mat,kind='plain'){
 const id=PAT[kind]??0;
 mat.onBeforeCompile=sh=>{
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vNwW;varying vec3 vNwN;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvNwW=(modelMatrix*vec4(transformed,1.)).xyz;vNwN=normalize(mat3(modelMatrix)*objectNormal);');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vNwW;varying vec3 vNwN;\nfloat nwH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}')
   .replace('#include <map_fragment>',`#include <map_fragment>
    {float f=1.;vec3 W=vNwW;float side=1.-abs(vNwN.y);
     if(${id}==1){float l=fract(W.y*4.2);f*=mix(1.,.86+.14*smoothstep(0.,.9,l),side);f*=mix(1.,1.-.06*smoothstep(.93,1.,l),side);}
     if(${id}==2){float row=floor(W.y*6.5);float u=(abs(vNwN.x)>.5?W.z:W.x)*3.2+row*.5;vec2 b=vec2(fract(u),fract(W.y*6.5));float mortar=step(b.x,.06)+step(b.y,.1);f*=mix(1.,mix(.85+.25*nwH(vec2(floor(u),row)),1.18,clamp(mortar,0.,1.)),side);}
     if(${id}==3){float row=floor(W.y*5.);float u=(W.x+W.z)*2.4+row*.5;f*=.82+.12*nwH(vec2(floor(u),row))+.1*fract(W.y*5.);}
     f*=mix(.62,1.,smoothstep(0.,1.2,W.y))*mix(1.,.97+.06*nwH(floor(W.xz*.5)),.6);
     diffuseColor.rgb*=f;}`);
 };
 mat.customProgramCacheKey=()=>'nwpat'+id;return mat;
}

// ---------- hills between the town and the beach ----------
const ROAD_LINES=[-60,0,60];
const sstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
export function heightAt(x,z){
 const sq=Math.max(Math.abs(x),Math.abs(z));if(sq<116)return 0;
 if(Math.abs(x)<24&&z>110)return 0;                       // car lot + beach road stay flat
 let t=sstep(116,126,sq)*(1-sstep(.9,.985,islandK(x,z)));
 const n=(Math.sin(x*.05+1.3)*Math.cos(z*.045)+Math.sin((x+z)*.031)*.7+Math.cos(x*.11-z*.07)*.3+2)/4;
 return t*(2.5+n*11);
}
export function buildHills(scene,grassMap){
 const S=320,N=200,geo=new THREE.PlaneGeometry(S,S,N,N).rotateX(-Math.PI/2);const p=geo.attributes.position,col=[],c=new THREE.Color();
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);let y=heightAt(x,z);if(y<=0.001)y=-.6;p.setY(i,y);
  c.setRGB(1,1,1);if(y>0)c.lerp(new THREE.Color('#c8d8a0'),Math.min(.5,y/30));col.push(c.r,c.g,c.b)}
 geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.computeVertexNormals();
 const uv=[];for(let i=0;i<p.count;i++)uv.push(p.getX(i),p.getZ(i));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:grassMap,vertexColors:true,roughness:.95}));m.receiveShadow=true;m.castShadow=false;scene.add(m);return m;
}
