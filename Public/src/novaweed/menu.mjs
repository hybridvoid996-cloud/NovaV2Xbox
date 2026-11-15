// Nova Weed main menu set: night-time, your character outside a backyard grow shed
// with the doors open and purple grow light spilling out over the grass.
import * as THREE from '/vendor/three/three.module.min.js';
import {makePerson,animatePerson,setHighEyes} from './people.mjs?v=15';
import {makePlantModel,makePotModel,makeSoil} from './plants.mjs?v=15';

export function buildMenuSet(scene){
 const g=new THREE.Group();g.position.set(-19.5,0,117);scene.add(g);
 const M=o=>new THREE.MeshStandardMaterial({roughness:.85,...o});
 const plank=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#7a5a3c';x.fillRect(0,0,128,128);for(let i=0;i<128;i+=16){x.fillStyle='rgba(0,0,0,.28)';x.fillRect(i,0,2,128);x.fillStyle='rgba(255,255,255,.05)';x.fillRect(i+3,0,5,128)}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,1);return t})();
 const wall=M({map:plank}),roofM=M({color:'#3d4a5c'}),trim=M({color:'#f3efe6'}),inner=M({color:'#2a2030'});
 const box=(w,h,d,m,x,y,z,ry=0,rx=0)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.rotation.set(rx,ry,0);o.castShadow=o.receiveShadow=true;g.add(o);return o};
 const W=4.6,D=3.2,H=2.5;
 box(W,.12,D,M({color:'#5a4636'}),0,.06,0);box(W,H,.1,wall,0,H/2,D/2);box(W-.1,H-.1,.04,inner,0,H/2,D/2-.07);
 for(const s of [-1,1]){box(.1,H,D,wall,s*W/2,H/2,0);box(.95,H,.1,wall,s*(W/2-.47),H/2,-D/2);box(1.32,H-.5,.07,wall,s*2.05,(H-.5)/2+.06,-D/2-.6,s*-1.15);box(.08,H,.12,trim,s*1.33,H/2,-D/2-.01)}
 box(W,.45,.1,wall,0,H-.22,-D/2);box(W+.1,.1,.14,trim,0,H-.46,-D/2-.01);
 for(const s of [-1,1])box(W+.6,.09,D*.64,roofM,0,H+.48,s*D*.26,0,s*.5);box(W+.6,.12,.2,trim,0,H+.93,0);
 // inside: LED bar, purple light, three flowering plants
 box(W-1,.07,.3,M({color:'#1b1d22',emissive:'#d070ff',emissiveIntensity:3.2}),0,H-.2,.2);
 const grow=new THREE.PointLight('#c45cff',16,11,1.5);grow.position.set(0,1.9,-.3);g.add(grow);
 const spill=new THREE.SpotLight('#c45cff',40,12,.75,.6,1.4);spill.position.set(0,2,.6);spill.target.position.set(0,0,-6);g.add(spill,spill.target);
 for(const x of [-1.35,0,1.35]){const pot=makePotModel().g;pot.position.set(x,.12,.45);pot.scale.setScalar(.85);g.add(pot);const soil=makeSoil();soil.position.set(x,.6,.45);soil.scale.setScalar(.85);g.add(soil);const p=makePlantModel();p.plant.position.set(x,.6,.45);p.plant.scale.setScalar(.95+Math.abs(x)*.06);p.leafMat.color.set('#4fae5a');p.budMat.color.set(x?'#b98ae6':'#9be06a');g.add(p.plant)}
 // outside: porch bulb, crate, string of little lights along the door header
 const bulb=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),M({color:'#fff6d8',emissive:'#ffd98a',emissiveIntensity:4}));bulb.position.set(-1.9,H+.05,-D/2-.2);g.add(bulb);
 const warm=new THREE.PointLight('#ffd9a0',5,8,1.6);warm.position.set(-2.3,2.3,-D/2-1);g.add(warm);
 box(.7,.5,.5,M({color:'#9a6b3f'}),2.9,.25,-D/2-1.1,.3);box(.55,.2,.4,M({color:'#3b2617'}),2.9,.6,-D/2-1.1,.6);
 const lights=[];for(let i=0;i<9;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),M({color:'#fff',emissive:['#ff7ad9','#5dff8a','#ffd166'][i%3],emissiveIntensity:3}));b.position.set(-W/2+.3+i*(W-.6)/8,H-.06-Math.sin(i/8*Math.PI)*.12,-D/2-.1);g.add(b);lights.push(b)}
 let person=null;
 const setLook=look=>{if(person)g.remove(person);person=makePerson(look);person.position.set(-3,0,-2.9);person.rotation.y=Math.PI+.45;setHighEyes(person,true);g.add(person)};
 const cam={pos:new THREE.Vector3(-25,1.5,110.3),look:new THREE.Vector3(-20.4,1.3,116.6)};
 let smokeT=0;
 return {group:g,setLook,
  update(dt,t,camera,fx){g.visible=true;
   camera.position.set(cam.pos.x+Math.sin(t*.13)*.3,cam.pos.y+Math.sin(t*.21)*.05,cam.pos.z+Math.cos(t*.11)*.2);camera.lookAt(cam.look);
   grow.intensity=15+Math.sin(t*3.1)*1.2;lights.forEach((b,i)=>b.material.emissiveIntensity=2.2+Math.sin(t*2+i*1.3)*1.2);
   if(person)animatePerson(person,t,0);
   smokeT-=dt;if(fx&&smokeT<=0){smokeT=.35;fx.emit({x:g.position.x+(Math.random()-.5)*2,y:1.2+Math.random(),z:g.position.z-1.4,vx:(Math.random()-.5)*.1,vy:.12,vz:-.25,size:.5,grow:2,life:6,alpha:.16,color:'#c9a0ff',drag:.3,rise:.03})}
  },
  hide(){g.visible=false}
 };
}
