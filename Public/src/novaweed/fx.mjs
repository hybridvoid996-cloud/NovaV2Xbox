// Nova Weed smoke: one instanced, camera-facing particle system (a single draw call)
// used for exhales, vape clouds, joint wisps, chimneys, car exhaust and grow-room haze.
import * as THREE from '/vendor/three/three.module.min.js';

const MAX=900;

// 2x2 atlas of soft, lumpy puffs so clouds don't look like identical circles.
function puffAtlas(){
 const S=256,c=document.createElement('canvas');c.width=c.height=S*2;const x=c.getContext('2d');
 let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let v=0;v<4;v++){
  const ox=(v%2)*S,oy=Math.floor(v/2)*S;
  for(let i=0;i<14;i++){
   const a=rnd()*Math.PI*2,d=rnd()*S*.2,r=S*(.12+rnd()*.16);
   const cx=ox+S/2+Math.cos(a)*d,cy=oy+S/2+Math.sin(a)*d;
   const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(255,255,255,.62)');g.addColorStop(.5,'rgba(255,255,255,.3)');g.addColorStop(1,'rgba(255,255,255,0)');
   x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();
  }
  // soft overall falloff so edges never show a hard square
  const g=x.createRadialGradient(ox+S/2,oy+S/2,S*.05,ox+S/2,oy+S/2,S*.5);g.addColorStop(0,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g;x.fillRect(ox,oy,S,S);
  // fade the corners hard so overlapping lumps never reveal the square
  x.globalCompositeOperation='destination-in';const m=x.createRadialGradient(ox+S/2,oy+S/2,S*.3,ox+S/2,oy+S/2,S*.5);m.addColorStop(0,'#fff');m.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=m;x.fillRect(ox,oy,S,S);x.globalCompositeOperation='source-over';
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.NoColorSpace;t.generateMipmaps=true;return t;
}

const VERT=`
attribute vec3 offset;attribute vec4 data;attribute vec3 tint;
uniform float uFogNear,uFogFar;
varying vec2 vUv;varying float vA,vFog,vShade;varying vec3 vC;
void main(){
 vShade=.74+.36*(position.y+.5);   // lit from above, darker underside
 vec4 mv=modelViewMatrix*vec4(offset,1.);
 float c=cos(data.z),s=sin(data.z);vec2 p=position.xy;
 mv.xy+=vec2(c*p.x-s*p.y,s*p.x+c*p.y)*data.x;
 gl_Position=projectionMatrix*mv;
 vUv=(uv+vec2(mod(data.w,2.),floor(data.w/2.)))*.5;
 float d=-mv.z;
 vA=data.y*smoothstep(.12,.7,d);          // fade out when it's right on the lens
 vFog=smoothstep(uFogNear,uFogFar,d);vC=tint;
}`;
const FRAG=`
uniform sampler2D map;uniform vec3 uLight,uFogColor;
varying vec2 vUv;varying float vA,vFog,vShade;varying vec3 vC;
void main(){
 float a=texture2D(map,vUv).a*vA;if(a<.004)discard;
 gl_FragColor=vec4(mix(vC*uLight*vShade,uFogColor,vFog),min(1.,a));
 #include <colorspace_fragment>
}`;

export function createFx(scene){
 const base=new THREE.PlaneGeometry(1,1);
 const geo=new THREE.InstancedBufferGeometry();geo.index=base.index;geo.setAttribute('position',base.getAttribute('position'));geo.setAttribute('uv',base.getAttribute('uv'));
 const offA=new THREE.InstancedBufferAttribute(new Float32Array(MAX*3),3).setUsage(THREE.DynamicDrawUsage);
 const datA=new THREE.InstancedBufferAttribute(new Float32Array(MAX*4),4).setUsage(THREE.DynamicDrawUsage);
 const colA=new THREE.InstancedBufferAttribute(new Float32Array(MAX*3),3).setUsage(THREE.DynamicDrawUsage);
 geo.setAttribute('offset',offA);geo.setAttribute('data',datA);geo.setAttribute('tint',colA);geo.instanceCount=0;
 const mat=new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:FRAG,transparent:true,depthWrite:false,
  uniforms:{map:{value:puffAtlas()},uLight:{value:new THREE.Color(1,1,1)},uFogColor:{value:new THREE.Color()},uFogNear:{value:80},uFogFar:{value:250}}});
 const mesh=new THREE.Mesh(geo,mat);mesh.frustumCulled=false;mesh.renderOrder=5;scene.add(mesh);

 // particle state (struct of arrays)
 const P={x:new Float32Array(MAX),y:new Float32Array(MAX),z:new Float32Array(MAX),vx:new Float32Array(MAX),vy:new Float32Array(MAX),vz:new Float32Array(MAX),
  age:new Float32Array(MAX),life:new Float32Array(MAX),s0:new Float32Array(MAX),s1:new Float32Array(MAX),a:new Float32Array(MAX),drag:new Float32Array(MAX),rise:new Float32Array(MAX),
  rot:new Float32Array(MAX),spin:new Float32Array(MAX),v:new Float32Array(MAX),r:new Float32Array(MAX),g:new Float32Array(MAX),b:new Float32Array(MAX),seed:new Float32Array(MAX)};
 let n=0;const col=new THREE.Color();const emitters=[];
 const fx={quality:1,wind:{x:.45,z:.2},
  emit(o){
   if(n>=MAX)return;const i=n++;
   P.x[i]=o.x;P.y[i]=o.y;P.z[i]=o.z;P.vx[i]=o.vx||0;P.vy[i]=o.vy||0;P.vz[i]=o.vz||0;P.age[i]=0;P.life[i]=o.life||3;
   P.s0[i]=o.size??.2;P.s1[i]=o.grow??1;P.a[i]=o.alpha??.5;P.drag[i]=o.drag??1;P.rise[i]=o.rise??.2;
   P.rot[i]=Math.random()*6.28;P.spin[i]=(Math.random()-.5)*(o.spin??.6);P.v[i]=Math.floor(Math.random()*4);P.seed[i]=Math.random()*100;
   col.set(o.color||'#e8eaec');P.r[i]=col.r;P.g[i]=col.g;P.b[i]=col.b;
  },
  // Spread emission over time (an exhale lasts most of a second). fn(k) emits one particle.
  stream(duration,rate,fn){emitters.push({t:0,duration,rate:rate*fx.quality,acc:0,k:0,fn})},
  clear(){n=0;emitters.length=0},
  get count(){return n},
  update(dt,{light,fog}={}){
   for(let e=emitters.length-1;e>=0;e--){const em=emitters[e];em.t+=dt;em.acc+=dt*em.rate;while(em.acc>=1){em.acc--;em.fn(em.k++)}if(em.t>=em.duration)emitters.splice(e,1)}
   const t=performance.now()/1000;
   for(let i=0;i<n;i++){
    P.age[i]+=dt;
    if(P.age[i]>=P.life[i]){ // swap-remove
     const j=--n;for(const k in P)P[k][i]=P[k][j];i--;continue;
    }
    const k=Math.exp(-P.drag[i]*dt),sd=P.seed[i];
    P.vx[i]=P.vx[i]*k+(fx.wind.x*.25+Math.sin(t*.9+sd)*.18)*dt;
    P.vz[i]=P.vz[i]*k+(fx.wind.z*.25+Math.cos(t*.7+sd*1.3)*.18)*dt;
    P.vy[i]=P.vy[i]*k+P.rise[i]*dt;
    P.x[i]+=P.vx[i]*dt;P.y[i]+=P.vy[i]*dt;P.z[i]+=P.vz[i]*dt;P.rot[i]+=P.spin[i]*dt;
   }
   const o=offA.array,d=datA.array,c=colA.array;
   for(let i=0;i<n;i++){
    const u=P.age[i]/P.life[i],ease=1-(1-u)*(1-u);
    o[i*3]=P.x[i];o[i*3+1]=P.y[i];o[i*3+2]=P.z[i];
    d[i*4]=P.s0[i]+(P.s1[i]-P.s0[i])*ease;d[i*4+1]=P.a[i]*Math.min(1,u*9)*Math.pow(1-u,1.3);d[i*4+2]=P.rot[i];d[i*4+3]=P.v[i];
    c[i*3]=P.r[i];c[i*3+1]=P.g[i];c[i*3+2]=P.b[i];
   }
   geo.instanceCount=n;
   if(n){offA.addUpdateRange?.(0,n*3);datA.addUpdateRange?.(0,n*4);colA.addUpdateRange?.(0,n*3);offA.needsUpdate=datA.needsUpdate=colA.needsUpdate=true}
   if(light)mat.uniforms.uLight.value.copy(light);
   if(fog){mat.uniforms.uFogColor.value.copy(fog.color);mat.uniforms.uFogNear.value=fog.near;mat.uniforms.uFogFar.value=fog.far}
  }
 };
 return fx;
}

// ---------- presets ----------
const v3=new THREE.Vector3(),fwd=new THREE.Vector3(),up=new THREE.Vector3(),right=new THREE.Vector3();
// A first-person exhale: a thick cloud pushed out of the mouth along the view direction.
export function exhale(fx,camera,{amount=1,color='#e9e7e2',duration=.9}={}){
 fx.stream(duration,30*amount,()=>{
  camera.getWorldDirection(fwd);up.set(0,1,0).applyQuaternion(camera.quaternion);right.crossVectors(fwd,up);
  v3.copy(camera.position).addScaledVector(fwd,.38).addScaledVector(up,-.16);
  const sp=1.1+Math.random()*1.3*Math.min(1.6,amount);
  fx.emit({x:v3.x,y:v3.y,z:v3.z,
   vx:fwd.x*sp+(Math.random()-.5)*.5+right.x*(Math.random()-.5)*.4,vy:fwd.y*sp+.12+Math.random()*.25,vz:fwd.z*sp+(Math.random()-.5)*.5+right.z*(Math.random()-.5)*.4,
   size:.12+Math.random()*.1,grow:(.9+Math.random()*.8)*(amount>1?1.6:1),life:2.6+Math.random()*1.8*amount,alpha:.62+Math.random()*.2,drag:1.5,rise:.22,color,spin:.9});
 });
}
// Thin smoke curling off a lit joint tip.
export function wisp(fx,p,{color='#d8d8d8',alpha=.32}={}){
 fx.emit({x:p.x+(Math.random()-.5)*.01,y:p.y,z:p.z+(Math.random()-.5)*.01,vx:(Math.random()-.5)*.04,vy:.28+Math.random()*.12,vz:(Math.random()-.5)*.04,size:.025,grow:.32+Math.random()*.2,life:1.8+Math.random(),alpha,drag:.4,rise:.12,color,spin:1.6});
}
// A small puff (NPC smoking, remote players).
export function puff(fx,p,dir,{n=8,color='#e4e2dc',size=.6}={}){
 for(let i=0;i<n;i++)fx.emit({x:p.x,y:p.y,z:p.z,vx:dir.x*(.6+Math.random()*.7)+(Math.random()-.5)*.3,vy:.15+Math.random()*.2,vz:dir.z*(.6+Math.random()*.7)+(Math.random()-.5)*.3,size:.08,grow:size*(.7+Math.random()*.6),life:2+Math.random()*1.4,alpha:.35,drag:1.3,rise:.2,color});
}
export function chimney(fx,p){
 fx.emit({x:p.x+(Math.random()-.5)*.2,y:p.y,z:p.z+(Math.random()-.5)*.2,vx:(Math.random()-.5)*.2,vy:.9+Math.random()*.5,vz:(Math.random()-.5)*.2,size:.7,grow:4.2+Math.random()*2,life:6+Math.random()*2.5,alpha:.75,drag:.3,rise:.32,color:'#f3f4f6',spin:.3});
}
export function exhaust(fx,p){
 fx.emit({x:p.x,y:p.y,z:p.z,vx:(Math.random()-.5)*.3,vy:.2+Math.random()*.2,vz:(Math.random()-.5)*.3,size:.15,grow:.9+Math.random()*.5,life:1.1+Math.random()*.6,alpha:.18,drag:1.2,rise:.15,color:'#bfc2c6'});
}
export function haze(fx,x,y,z,color='#d9c4ff'){
 fx.emit({x,y,z,vx:(Math.random()-.5)*.08,vy:.02,vz:(Math.random()-.5)*.08,size:.8,grow:1.8,life:7+Math.random()*3,alpha:.07,drag:.2,rise:.01,color,spin:.15});
}
