// Nova Weed shops: a cart-style store screen for every counter, Island Motors (car dealer),
// The Board Room (skate shop), Fuel & Go at the gas station, and a basketball court with a real ball.
import * as THREE from '/vendor/three/three.module.min.js';
import {makePerson,randomLook,animatePerson} from './people.mjs?v=15';
import {ITEMS,GUNS,VAPES,MIXERS,RANKS,rankOf,BOARDS} from './economy.mjs?v=15';
import {RIDES,carModel,mopedModel} from './vehicles.mjs?v=15';
import {iconEl} from './icons.mjs?v=15';

const CAT=id=>id.startsWith('seed_')?'Seeds':/^(soil|fertilizer|pot|baggies)$/.test(id)?'Grow':id.startsWith('drink_')||id.startsWith('snack_')?'Food & drink':id.startsWith('mix_')?'Mixers':id.startsWith('vape_')?'Vapes':id.startsWith('gun_')?'Guns':'Gear';
export const STORES={
 garden:{title:'Green Thumb',sub:'Grow supplies · Mira',color:'#2f8f4e'},
 quick:{title:'Quick Stop',sub:'Corner store · open 24/7',color:'#c0392b'},
 gas:{title:'Fuel & Go',sub:'Gas station mart',color:'#d83a32'},
 arms:{title:'Vic’s Trunk',sub:'Works on NPCs and cops, never on players',color:'#5a616c'}
};
const inShop=(item,kind)=>item.shop===kind||item.shops?.includes(kind);

// ---------- cart store ----------
export function openStore(G,kind,{h,money,openModal,closeModal,sfx}){
 const S=G.S,rank=rankOf(S.xp),meta=STORES[kind];
 const items=Object.entries(ITEMS).filter(([,it])=>inShop(it,kind)&&it.price);
 const cats=['All',...new Set(items.map(([id])=>CAT(id)))];let cat='All';const cart=new Map();
 const grid=h('div',{class:'nw-sgrid'}),cartBox=h('div',{class:'nw-cart'}),tabs=h('div',{class:'nw-stabs'});
 const owned=id=>id==='pot'?G.potCount():(S.inv[id]||0);
 const maxQ=(id,it)=>it.gun?(S.inv[id]?0:1):id==='pot'?Math.max(0,(G.maxPots?.()||8)-G.potCount()):99;
 const total=()=>[...cart].reduce((a,[id,q])=>a+ITEMS[id].price*q,0);
 const add=(id,n=1)=>{const it=ITEMS[id];const q=Math.min(maxQ(id,it),(cart.get(id)||0)+n);if(q<=0){cart.delete(id)}else cart.set(id,q);sfx.click();paint()};
 const paint=()=>{
  tabs.replaceChildren(...cats.map(c=>h('button',{class:c===cat?'on':'',onclick:()=>{cat=c;paint()}},c)));
  grid.replaceChildren(...items.filter(([id])=>cat==='All'||CAT(id)===cat).map(([id,it])=>{const locked=(it.rank||0)>rank,full=maxQ(id,it)<=0;
   const extra=it.mixer?'Adds '+(MIXERS[id]?.effect||''):it.vape?VAPES[id].hits+' hits':it.gun?'Damage '+GUNS[id].dmg:'Have '+owned(id)+(id==='pot'?' / '+(G.maxPots?.()||8):'');
   return h('div',{class:'nw-scard'+(locked?' locked':'')},h('div',{class:'art'},iconEl(id,null,'big')),h('b',{},it.name),h('small',{},locked?'Unlocks at '+RANKS[it.rank].name:extra),
    h('div',{class:'row'},h('em',{},money(it.price)),h('button',{class:'nw-b go',disabled:(locked||full)||undefined,onclick:()=>add(id)},full&&it.gun?'Owned':'Add')),
    locked?h('span',{class:'lock',html:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z"/></svg>'}):null)}));
  const t=total(),can=S.money+(S.bank||0)>=t&&t>0;
  cartBox.replaceChildren(h('h3',{},'Cart'),
   cart.size?h('div',{class:'lines'},...[...cart].map(([id,q])=>h('div',{class:'line'},iconEl(id,null,'sm'),h('span',{class:'n'},ITEMS[id].name),h('div',{class:'qty'},h('button',{onclick:()=>add(id,-1)},'−'),h('b',{},q),h('button',{onclick:()=>add(id,1)},'+')),h('em',{},money(ITEMS[id].price*q))))):h('p',{class:'empty'},'Your cart is empty.'),
   h('div',{class:'tot'},h('span',{},'Total'),h('b',{},money(t))),
   h('small',{class:'pay'},'Cash '+money(S.money)+' · Card '+money(S.bank||0)),
   h('button',{class:'nw-b go buy',disabled:!can||undefined,onclick:()=>{if(!G.payAny(t))return;
    for(const [id,q]of cart){const it=ITEMS[id];
     if(id==='pot'){for(let i=0;i<q;i++){if(G.coop)G.coop.addPot();else G.addPotLocal()}G.refreshPots()}
     else if(it.gives)for(const [k,n]of Object.entries(it.gives))S.inv[k]=(S.inv[k]||0)+n*q;else S.inv[id]=(S.inv[id]||0)+q;
     if(it.gun){G.mag=G.mag||{};G.mag[id]=GUNS[id].mag}}
    cart.clear();sfx.cash();G.toast('Thanks for shopping at '+meta.title+'!','good');G.save();G.onInventory();paint()}},'Purchase'));
 };
 paint();
 openModal(G,h('div',{class:'nw-store',style:{'--sc':meta.color}},h('div',{class:'head'},h('div',{},h('h2',{},meta.title),h('small',{},meta.sub)),h('button',{class:'x',onclick:()=>closeModal(G),'aria-label':'Close'},'×')),tabs,h('div',{class:'body'},grid,cartBox)));
}

// ---------- world: dealer lot, skate shop, basketball ----------
export function buildShops(G,{scene,world,sfx,h,money,openModal,closeModal}){
 const add=(o,x,y,z)=>{o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;scene.add(o);return o};
 const std=o=>new THREE.MeshStandardMaterial({roughness:.8,...o});
 const col=(minX,maxX,minZ,maxZ,hh=2)=>world.colliders.push({minX,maxX,minZ,maxZ,h:hh});
 const signTex=(text,bg,fg='#fff',w=512,hgt=128)=>{const c=document.createElement('canvas');c.width=w;c.height=hgt;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,w,hgt);x.fillStyle=fg;x.font='900 '+Math.round(hgt*.5)+'px Segoe UI, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,w/2,hgt/2+4);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t};
 const people=[],flags=[];
 const clerk=(seed,look,x,z,ry)=>{const p=makePerson(randomLook(seed,look));p.position.set(x,0,z);p.rotation.y=ry;scene.add(p);people.push(p);return p};

 // Island Motors: paved lot at the south end of Main St with a showroom canopy and display cars
 const LOT={x:0,z:129};
 add(new THREE.Mesh(new THREE.BoxGeometry(30,.06,15),std({color:'#5b5e66'})),LOT.x,.03,LOT.z);
 for(let i=-3;i<=3;i++)add(new THREE.Mesh(new THREE.BoxGeometry(.12,.07,5),std({color:'#e8e8ea'})),LOT.x+i*4,.04,LOT.z+2);
 const canopy=add(new THREE.Mesh(new THREE.BoxGeometry(12,.4,6),std({color:'#f2f0ea'})),LOT.x+8,4,LOT.z+3.5);
 for(const [dx,dz]of [[-5.5,-2.5],[5.5,-2.5],[-5.5,2.5],[5.5,2.5]])add(new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,4,10),std({color:'#c9ced6',metalness:.6})),LOT.x+8+dx,2,LOT.z+3.5+dz);
 const st=signTex('ISLAND MOTORS','#1d4f8f');add(new THREE.Mesh(new THREE.BoxGeometry(8,1.3,.2),std({map:st,emissive:'#ffffff',emissiveMap:st,emissiveIntensity:.35})),LOT.x+8,5,LOT.z+.4);
 {const z=LOT.z-6.8,x0=LOT.x-14.5,x1=LOT.x+14.5,top=4.2;for(const x of [x0,x1])add(new THREE.Mesh(new THREE.CylinderGeometry(.07,.08,top,8),std({color:'#c9ced6',metalness:.6})),x,top/2,z);
  const pts=[];for(let i=0;i<=30;i++){const t=i/30;pts.push(new THREE.Vector3(x0+(x1-x0)*t,top-Math.sin(t*Math.PI)*.7,z))}scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#2b2d33'})));
  const tri=new THREE.BufferGeometry();tri.setAttribute('position',new THREE.Float32BufferAttribute([-.28,0,0,.28,0,0,0,-.6,0],3));tri.computeVertexNormals();
  for(let i=1;i<30;i++){const t=i/30;const f=new THREE.Mesh(tri,new THREE.MeshStandardMaterial({color:['#e8443a','#ffd23f','#3d7be0','#5dff8a'][i%4],side:THREE.DoubleSide,roughness:.8}));f.position.set(x0+(x1-x0)*t,top-Math.sin(t*Math.PI)*.7,z);f.rotation.y=(i%2?.15:-.15);scene.add(f);flags.push(f)}}
 const display=[];['moped','hatch','pickup','muscle'].forEach((id,i)=>{const m=RIDES[id].kind==='car'?carModel(id):mopedModel(id);m.position.set(LOT.x-11+i*5.4,0,LOT.z+2);m.rotation.y=Math.PI+(i%2?.35:-.35);scene.add(m);display.push(m);col(m.position.x-1.1,m.position.x+1.1,m.position.z-2.2,m.position.z+2.2,1.5)});
 const salesman=clerk(5150,{shirt:'#2463b8',pants:'#1d1d22',hairStyle:'short',glasses:true,hat:'none'},LOT.x+8,LOT.z+3,Math.PI);

 // The Board Room: a skate stall in the park with a wall of decks
 const SK={x:-40,z:80};
 add(new THREE.Mesh(new THREE.BoxGeometry(6,.2,4),std({color:'#8a6a48'})),SK.x,.1,SK.z);
 add(new THREE.Mesh(new THREE.BoxGeometry(6,3,.2),std({color:'#2b2b33'})),SK.x,1.6,SK.z+2);
 add(new THREE.Mesh(new THREE.BoxGeometry(6.4,.25,4.4),std({color:'#ff7ad9'})),SK.x,3.2,SK.z);
 const sk=signTex('THE BOARD ROOM','#ff7ad9','#1b1d22');add(new THREE.Mesh(new THREE.BoxGeometry(5,.8,.15),std({map:sk,emissive:'#ffffff',emissiveMap:sk,emissiveIntensity:.3})),SK.x,3.75,SK.z-1.6);
 add(new THREE.Mesh(new THREE.BoxGeometry(4,1,1),std({color:'#f2f0ea'})),SK.x,.6,SK.z-1.2);
 Object.values(BOARDS).forEach((b,i)=>{const d=add(new THREE.Mesh(new THREE.BoxGeometry(.9,.04,.24),std({color:b.color})),SK.x-1.8+(i%3)*1.8,1.2+Math.floor(i/3)*1,SK.z+1.88);d.rotation.x=Math.PI/2})
 col(SK.x-3,SK.x+3,SK.z+1.8,SK.z+2.2,3);col(SK.x-2,SK.x+2,SK.z-1.7,SK.z-.7,1.1);
 const skater=clerk(8080,{shirt:'#8d5bd6',pants:'#33402c',hairStyle:'long',hat:'beanie',hatColor:'#ffb347',glasses:true},SK.x,SK.z+.4,Math.PI);

 // Basketball court
 const CT={x:-20,z:80,w:14,l:18};
 const lines=(()=>{const c=document.createElement('canvas');c.width=256;c.height=330;const x=c.getContext('2d');x.fillStyle='#3d6b8f';x.fillRect(0,0,256,330);x.fillStyle='#c0653a';x.fillRect(14,14,228,302);x.strokeStyle='#fff';x.lineWidth=4;x.strokeRect(14,14,228,302);x.beginPath();x.moveTo(14,165);x.lineTo(242,165);x.stroke();x.beginPath();x.arc(128,165,30,0,7);x.stroke();
  for(const y of [14,316]){const s=y<100?1:-1;x.strokeRect(96,y,64,s*70);x.beginPath();x.arc(128,y+s*70,32,0,7);x.stroke();x.beginPath();x.arc(128,y,100,s>0?0:Math.PI,s>0?Math.PI:Math.PI*2);x.stroke()}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t})();
 add(new THREE.Mesh(new THREE.BoxGeometry(CT.w,.05,CT.l),std({map:lines,roughness:.7})),CT.x,.03,CT.z);
 const HOOPS=[];
 for(const s of [-1,1]){const hz=CT.z+s*(CT.l/2-1.2);
  add(new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,3.6,10),std({color:'#2b2d33',metalness:.5})),CT.x,1.8,hz+s*.9);
  add(new THREE.Mesh(new THREE.BoxGeometry(.12,.12,1),std({color:'#2b2d33'})),CT.x,3.5,hz+s*.4);
  const board=add(new THREE.Mesh(new THREE.BoxGeometry(1.8,1.05,.06),std({color:'#f6f6f6',roughness:.3})),CT.x,3.45,hz);
  add(new THREE.Mesh(new THREE.BoxGeometry(.6,.45,.065),std({color:'#e8443a'})),CT.x,3.25,hz-s*.001).scale.set(1,1,1);
  add(new THREE.Mesh(new THREE.BoxGeometry(.52,.37,.07),std({color:'#f6f6f6',roughness:.3})),CT.x,3.25,hz-s*.002);
  const rim=add(new THREE.Mesh(new THREE.TorusGeometry(.23,.018,8,24).rotateX(Math.PI/2),std({color:'#e8742a',metalness:.4})),CT.x,3.05,hz-s*.3);
  const net=new THREE.Mesh(new THREE.CylinderGeometry(.23,.15,.42,12,3,true),new THREE.MeshBasicMaterial({color:'#ffffff',wireframe:true,transparent:true,opacity:.7}));net.position.set(CT.x,2.83,hz-s*.3);scene.add(net);
  col(CT.x-.15,CT.x+.15,hz+s*.9-.15,hz+s*.9+.15,3.6);
  HOOPS.push({rim:rim.position.clone(),boardZ:hz,side:s,net})}
 // the ball
 const ballTex=(()=>{const c=document.createElement('canvas');c.width=128;c.height=64;const x=c.getContext('2d');x.fillStyle='#e8742a';x.fillRect(0,0,128,64);x.strokeStyle='#3a1d0e';x.lineWidth=2.5;for(const xx of [0,32,64,96]){x.beginPath();x.moveTo(xx,0);x.lineTo(xx,64);x.stroke()}x.beginPath();x.moveTo(0,32);x.lineTo(128,32);x.stroke();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
 const BR=.12;const ball=add(new THREE.Mesh(new THREE.SphereGeometry(BR,20,14),std({map:ballTex,roughness:.65})),CT.x+1,BR,CT.z);
 const B={vel:new THREE.Vector3(),held:false,score:0,spin:new THREE.Vector3()};
 const tmp=new THREE.Vector3();
 function updateBall(dt,camera){
  if(B.held){camera.getWorldDirection(tmp);ball.position.copy(camera.position).addScaledVector(tmp,.55);ball.position.y-=.28;return}
  const p=ball.position,v=B.vel;const prevY=p.y;
  const steps=3;for(let s=0;s<steps;s++){const d=dt/steps;
   v.y-=9.8*d;p.addScaledVector(v,d);
   if(p.y<BR){p.y=BR;if(v.y<-.6){v.y*=-.68;sfx.step()}else v.y=0;v.x*=.86;v.z*=.86}
   for(const H of HOOPS){
    // backboard
    const bz=H.boardZ;if(Math.abs(p.x-H.rim.x)<.9&&p.y>2.92&&p.y<3.98&&Math.abs(p.z-bz)<BR+.03){p.z=bz-H.side*(BR+.03);v.z*=-.55;sfx.step()}
    // rim: nearest point on the ring
    const dx=p.x-H.rim.x,dz=p.z-H.rim.z,hd=Math.hypot(dx,dz)||1e-4;const qx=H.rim.x+dx/hd*.23,qz=H.rim.z+dz/hd*.23,qy=H.rim.y;
    const nx=p.x-qx,ny=p.y-qy,nz=p.z-qz,nd=Math.hypot(nx,ny,nz);
    if(nd<BR+.02){const k=(BR+.02-nd)/(nd||1);p.x+=nx*k;p.y+=ny*k;p.z+=nz*k;const vn=(v.x*nx+v.y*ny+v.z*nz)/(nd||1);if(vn<0){v.x-=1.6*vn*nx/nd;v.y-=1.6*vn*ny/nd;v.z-=1.6*vn*nz/nd}}
   }
  }
  // scoring: dropped down through a ring
  for(const H of HOOPS){const hd=Math.hypot(p.x-H.rim.x,p.z-H.rim.z);if(prevY>H.rim.y&&p.y<=H.rim.y&&hd<.2&&v.y<0){B.score++;sfx.level();G.toast('🏀 Bucket! '+B.score+' made','good');G.addXP(2);H.swish=.6}
   if(H.swish>0){H.swish-=dt;H.net.scale.y=1+Math.sin(H.swish*20)*.15}}
  ball.rotation.x+=v.z*dt/BR;ball.rotation.z-=v.x*dt/BR;
  if(Math.abs(p.x-CT.x)>CT.w/2+4||Math.abs(p.z-CT.z)>CT.l/2+4){p.set(CT.x+1,BR,CT.z);v.set(0,0,0)}
 }
 G.ballHeld=()=>B.held;
 G.throwBall=camera=>{if(!B.held)return false;B.held=false;camera.getWorldDirection(tmp);B.vel.copy(tmp).multiplyScalar(7.6);B.vel.y+=3.4;sfx.click();return true};

 // ---------- dealer + skate shop screens ----------
 const stat=(label,v)=>h('div',{class:'nw-stat'},h('span',{},label),h('i',{},h('b',{style:{width:Math.round(v*100)+'%'}})));
 function openDealer(){const S=G.S;S.rides=S.rides||{};const rank=G.rank();const body=h('div',{class:'nw-dealer'});
  const paint=()=>body.replaceChildren(...['moped','hatch','pickup','muscle'].map(id=>{const R=RIDES[id];const own=S.rides[id]?.owned,locked=R.rank>rank;
   return h('div',{class:'nw-dcard'},h('div',{class:'sw',style:{background:`linear-gradient(135deg,${R.color},#1b1d22)`}},iconEl(R.kind==='car'?'pistol':'skate',null,'hide'),h('b',{},R.name)),h('small',{},R.desc),stat('Top speed',R.top/32),stat('Acceleration',R.accel/13),stat('Handling',R.turn/2.6),
    h('div',{class:'row'},h('em',{},money(R.price)),own?h('span',{class:'own'},'Owned'):h('button',{class:'nw-b go',disabled:(locked||S.money+(S.bank||0)<R.price)||undefined,onclick:()=>{if(!G.payAny(R.price))return;S.rides[id]={owned:true};G.rides.load();sfx.cash();G.toast(R.name+' is yours. It’s parked by your apartment.','good');G.save();paint()}},locked?'Unlocks at '+RANKS[R.rank].name:'Buy')))}));
  paint();openModal(G,h('div',{class:'nw-store',style:{'--sc':'#1d4f8f'}},h('div',{class:'head'},h('div',{},h('h2',{},'Island Motors'),h('small',{},'New and nearly new · cash or card')),h('button',{class:'x',onclick:()=>closeModal(G)},'×')),body))}
 function openBoards(){const S=G.S;S.boards=S.boards||{};const body=h('div',{class:'nw-dealer'});
  const paint=()=>body.replaceChildren(...Object.entries(BOARDS).map(([id,b])=>{const own=S.boards[id],sel=S.board===id;
   return h('div',{class:'nw-dcard'},h('div',{class:'sw',style:{background:'#24262a'}},iconEl('skate',b.color,'big'),h('b',{},b.name)),h('small',{},b.desc),stat('Speed',b.speed/11),stat('Pop',b.jump/1.3),stat('Glide',b.glide),
    h('div',{class:'row'},h('em',{},money(b.price)),own?h('button',{class:'nw-b'+(sel?' go':''),onclick:()=>{S.board=id;S.rides=S.rides||{};S.rides.skate={owned:true};G.rides.setBoard?.(id);sfx.click();G.save();paint()}},sel?'Riding':'Use'):h('button',{class:'nw-b go',disabled:S.money+(S.bank||0)<b.price||undefined,onclick:()=>{if(!G.payAny(b.price))return;S.boards[id]=true;S.board=id;S.rides=S.rides||{};S.rides.skate={owned:true};G.rides.setBoard?.(id);sfx.cash();G.toast(b.name+' bought. Press B to ride.','good');G.save();paint()}},'Buy')))}));
  paint();openModal(G,h('div',{class:'nw-store',style:{'--sc':'#ff7ad9'}},h('div',{class:'head'},h('div',{},h('h2',{},'The Board Room'),h('small',{},'“Which deck are you after?”')),h('button',{class:'x',onclick:()=>closeModal(G)},'×')),body))}

 // ---------- interactions ----------
 const gas=world.gas;
 G.shopsInteract=P=>{
  P(salesman.position.x,salesman.position.z-1.6,2.4,'Talk to Marco (Island Motors)',()=>G.talk({name:'Marco',line:'Welcome to Island Motors! Looking for something with wheels?',options:[{label:'Show me the cars',fn:openDealer},{label:'Just looking'}]}));
  P(SK.x,SK.z-2.2,2.4,'Talk to Kai (The Board Room)',()=>G.talk({name:'Kai',line:'Wicked, my dude. Which deck are you after?',options:[{label:'Let me see the boards',fn:openBoards},{label:'Nah, I’m good'}]}));
  if(gas)P(gas.door.x,gas.door.z,2.2,'Shop at Fuel & Go',()=>openStore(G,'gas',{h,money,openModal,closeModal,sfx}));
  if(!B.held&&ball.position.distanceTo(G.player.pos)<1.8)P(ball.position.x,ball.position.z,1.8,'Pick up the ball',()=>{B.held=true;B.vel.set(0,0,0);G.toast('Click to shoot. Aim a bit above the rim.')});
 };
 return {update(dt,t,camera){updateBall(dt,camera);for(const p of people)animatePerson(p,t,0);flags.forEach((f,i)=>{f.rotation.x=Math.sin(t*2.2+i*.7)*.25})},openDealer,openBoards};
}
