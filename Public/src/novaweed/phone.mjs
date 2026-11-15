// Nova Weed phone + GPS: drawn app icons, chat threads, contacts, an interactive map,
// a glowing route line on the street, a compass bar, and "!" markers over people who want to buy.
import * as THREE from '/vendor/three/three.module.min.js';
import {ISLAND_R,coastR} from './env.mjs?v=15';

const g=(d,extra='')=>`<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
export const APP_ICONS={
 messages:g('<path d="M4 5h16v11H9l-5 4z" fill="#fff" stroke="none"/>'),
 contacts:g('<circle cx="12" cy="8.5" r="3.6" fill="#fff" stroke="none"/><path d="M5 19.5c1-3.6 3.8-5.5 7-5.5s6 1.9 7 5.5z" fill="#fff" stroke="none"/>'),
 map:g('<path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" fill="rgba(255,255,255,.25)"/><path d="M9 4.5v13M15 6.5v13"/><circle cx="16.5" cy="9.5" r="2.2" fill="#ff5a6e" stroke="none"/>'),
 products:g('<path d="M6 7h12l-1 13H7z" fill="rgba(255,255,255,.25)"/><path d="M6 7l2-3h8l2 3"/><path d="M12 17c0-3 0-5 0-7m0 3c-1.6-1.6-3.4-2-5-1.6 1.2 1.6 3 2 5 1.6zm0 0c1.6-1.6 3.4-2 5-1.6-1.2 1.6-3 2-5 1.6z" stroke-width="1.5"/>'),
 jobs:g('<rect x="3.5" y="7.5" width="17" height="12" rx="2" fill="rgba(255,255,255,.25)"/><path d="M9 7.5V5.5h6v2M3.5 12.5h17"/>'),
 bank:g('<path d="M3.5 9.5L12 4.5l8.5 5z" fill="#fff" stroke="none"/><path d="M6 11v6M10 11v6M14 11v6M18 11v6M4 19.5h16"/>'),
 rides:g('<path d="M4 15.5l1.6-5h12.8l1.6 5v3H4z" fill="rgba(255,255,255,.25)"/><circle cx="7.5" cy="18.5" r="1.7" fill="#fff"/><circle cx="16.5" cy="18.5" r="1.7" fill="#fff"/><path d="M7 10.5l1.4-3h7.2l1.4 3"/>'),
 profile:g('<path d="M5 14c0-5 3-8 7-8s7 3 7 8" fill="rgba(255,255,255,.25)"/><path d="M3.5 14.5h17M12 6V3.5"/><path d="M7 14.5v4h10v-4"/>'),
  homes:g('<path d="M3.5 11.5L12 4l8.5 7.5"/><path d="M6 10v9.5h12V10" fill="rgba(255,255,255,.25)"/><path d="M10 19.5v-4.5h4v4.5"/>'),
 dealers:g('<path d="M3 13l4-4 3 1 2-2 3 1 3-2 3 3-6 7-3-1-2 2-3-1z" fill="rgba(255,255,255,.25)"/><path d="M9 10l3 3M12 8l3 3"/>'),
 rent:g('<path d="M4 11l8-6.5 8 6.5v8.5H4z" fill="rgba(255,255,255,.25)"/><path d="M10 19.5v-5h4v5"/>'),
 settings:g('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>')
};
export const APP_COLORS={messages:'#2fbf71',contacts:'#3d7be0',map:'#2f8f4e',products:'#c0392b',jobs:'#e8912e',bank:'#2463b8',rides:'#2fb3b3',profile:'#8d5bd6',rent:'#d9a441',homes:'#e8443a',dealers:'#2b2350',settings:'#5f6670'};
export const statusIcons='<svg viewBox="0 0 40 12" width="44" height="13"><g fill="#fff"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/><rect x="22" y="1" width="15" height="10" rx="2.5" fill="none" stroke="#fff" stroke-width="1.3"/><rect x="24" y="3" width="10" height="6" rx="1.3"/><rect x="37.6" y="4" width="1.6" height="4" rx=".8"/></g></svg>';

// ---------- messages as chat threads ----------
export function messagesView(G,body,{h,head,thread,setThread}){
 const S=G.S;const by=new Map();for(const m of S.messages){if(!by.has(m.from))by.set(m.from,[]);by.get(m.from).push(m)}
 const initials=n=>n.replace(/\(.*\)/,'').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
 const hue=n=>[...n].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
 if(thread&&by.has(thread)){const list=by.get(thread);for(const m of list)m.read=true;
  body.append(head(thread,()=>setThread(null)),h('div',{class:'nw-chat'},...list.map(m=>h('div',{class:'bub'},h('p',{},m.text),h('small',{},'Day '+m.day)))));return}
 body.append(head('Messages'));
 if(!by.size)body.append(h('p',{class:'sub'},'No messages yet.'));
 const threads=[...by.entries()].sort((a,b)=>S.messages.lastIndexOf(b[1].at(-1))-S.messages.lastIndexOf(a[1].at(-1)));
 body.append(h('div',{class:'nw-threads'},...threads.map(([from,list])=>{const last=list.at(-1),unread=list.filter(m=>!m.read).length;
  return h('button',{class:'nw-thread'+(unread?' unread':''),onclick:()=>setThread(from)},h('span',{class:'av',style:{'--h':hue(from)}},initials(from)),h('div',{class:'t'},h('b',{},from),h('small',{},last.text)),unread?h('span',{class:'dot'},unread):h('small',{class:'d'},'Day '+last.day))})));
}

// ---------- contacts: customers you've met, with GPS ----------
export function contactsView(G,body,{h,head,effectTags,money}){
 const S=G.S;body.append(head('Contacts'));
 const met=G.npcs.filter(n=>S.customers[n.c.id]?.met);
 if(!met.length){body.append(h('p',{class:'sub'},'Nobody yet. Sell to people on the street and they’ll save your number.'));return}
 body.append(h('div',{class:'nw-threads'},...met.map(n=>{const c=S.customers[n.c.id];const hearts='♥'.repeat(c.loyalty)+'♡'.repeat(Math.max(0,5-c.loyalty));
  return h('div',{class:'nw-contact'},h('div',{class:'t'},h('b',{},n.c.name,n.order?h('span',{class:'tag'},'ORDER'):n.wants?h('span',{class:'tag y'},'BUYING'):null),h('small',{class:'hearts'},hearts),h('div',{},'Likes ',effectTags(n.c.likes))),
   h('button',{class:'nw-b go',onclick:()=>{G.setWaypoint({follow:n,label:n.c.name});G.closePhone();G.toast('GPS set to '+n.c.name.split(' ')[0],'good')}},'Locate'))})));
}

// ---------- interactive map ----------
export function mapView(G,body,{h,head,PLACES,ROADS}){
 body.append(head('Map'));
 const W=640,cv=h('canvas',{class:'nw-map',width:String(W),height:String(W)});
 const legend=h('div',{class:'nw-legend'},...[['#5dff8a','You'],['#ffd166','Shops'],['#c77dff','Orders'],['#ffe14d','Buyers'],['#5aa0ff','Police'],['#ff7ad9','Waypoint']].map(([c,t])=>h('span',{},h('i',{style:{background:c}}),t)));
 const tip=h('p',{class:'sub'},'Tap a place or a person to set your GPS. Tap empty ground for a custom pin.');
 body.append(cv,legend,tip);
 const R=165,s=W/(R*2),P=v=>(v+R)*s,U=px=>px/s-R;
 const pins=[];
 const draw=()=>{const x=cv.getContext('2d');pins.length=0;
  x.fillStyle='#1d5c7c';x.fillRect(0,0,W,W);
  // sea texture
  x.strokeStyle='rgba(255,255,255,.05)';for(let i=0;i<W;i+=14){x.beginPath();x.moveTo(0,i);x.quadraticCurveTo(W/2,i+6,W,i);x.stroke()}
  const ring=(k,fill)=>{x.beginPath();for(let i=0;i<=200;i++){const a=i/200*Math.PI*2,r=coastR(a)*k,ca=Math.cos(a),sa=Math.sin(a),q=Math.pow(Math.pow(Math.abs(ca),4)+Math.pow(Math.abs(sa),4),.25);const px=P(ca/q*r),pz=P(sa/q*r);i?x.lineTo(px,pz):x.moveTo(px,pz)}x.closePath();x.fillStyle=fill;x.fill()};
  ring(1.09,'#3fb7b5');ring(1.06,'#e8d7a6');ring(1.0,'#3f7a3a');
  // blocks
  x.fillStyle='#4a8a3e';for(const bx of [-90,-30,30,90])for(const bz of [-90,-30,30,90])x.fillRect(P(bx-21),P(bz-21),42*s,42*s);
  x.fillStyle='#2f6a2f';x.fillRect(P(-51),P(69),42*s,42*s);
  for(const hs of G.world?.houses||[]){x.fillStyle='#d9c9b0';x.fillRect(P(hs.x)-5,P(hs.z)-5,10,10)}
  // roads
  x.fillStyle='#55585f';for(const r of ROADS){x.fillRect(P(r-5),P(-120),10*s,240*s);x.fillRect(P(-120),P(r-5),240*s,10*s)}
  x.strokeStyle='rgba(255,220,100,.6)';x.setLineDash([6,6]);x.lineWidth=1.2;for(const r of ROADS){x.beginPath();x.moveTo(P(r),P(-120));x.lineTo(P(r),P(120));x.stroke();x.beginPath();x.moveTo(P(-120),P(r));x.lineTo(P(120),P(r));x.stroke()}x.setLineDash([]);
  x.fillStyle='#5b5e66';x.fillRect(P(-15),P(121.5),30*s,15*s);
  // route
  const route=G.gps?.route;if(route?.length>1){x.strokeStyle='#ff7ad9';x.lineWidth=4;x.beginPath();route.forEach((p,i)=>i?x.lineTo(P(p.x),P(p.z)):x.moveTo(P(p.x),P(p.z)));x.stroke()}
  const pin=(px,pz,c,label,r=7,act)=>{x.fillStyle=c;x.strokeStyle='rgba(0,0,0,.5)';x.lineWidth=2;x.beginPath();x.arc(P(px),P(pz),r,0,7);x.fill();x.stroke();
   if(label){x.font='800 13px Segoe UI, sans-serif';const w=x.measureText(label).width;x.fillStyle='rgba(0,0,0,.6)';x.fillRect(P(px)+r+3,P(pz)-9,w+8,18);x.fillStyle='#fff';x.fillText(label,P(px)+r+7,P(pz)+5)}
   if(act)pins.push({x:P(px),y:P(pz),r:Math.max(r,12),act})};
  const place=(p,label,c='#ffd166')=>pin(p.x,p.z,c,label,7,()=>G.setWaypoint({x:p.x,z:p.z,label}));
  place(PLACES.home,'Home','#ffffff');place(PLACES.garden,'Green Thumb');place(PLACES.quick,'Quick Stop');place(PLACES.thread,'Thread Co.');place(PLACES.police,'Police','#5aa0ff');place(PLACES.park,'Park','#7fe0a0');
  if(G.world?.gas)place(G.world.gas.door,'Fuel & Go');place({x:0,z:129},'Island Motors');place({x:-40,z:80},'Board Room','#ff7ad9');if(G.world?.motel)place({x:G.world.motel.x+10,z:G.world.motel.z-4},'Vic (motel)','#ff8a5a');
  for(const m of (G.jobMarks?.()||[]))pin(m.x,m.z,'#5dff8a',m.label||null,m.label?8:5,()=>G.setWaypoint({x:m.x,z:m.z,label:m.label||'Job'}));
  for(const n of G.npcs){if(n.dead)continue;const p=n.g.position;if(n.order)pin(p.x,p.z,'#c77dff',n.c.name.split(' ')[0],8,()=>G.setWaypoint({follow:n,label:n.c.name}));else if(n.wants)pin(p.x,p.z,'#ffe14d',null,6,()=>G.setWaypoint({follow:n,label:n.c.name}))}
  for(const o of G.police)if(!o.dead&&o.g.visible)pin(o.g.position.x,o.g.position.z,'#5aa0ff',null,5);
  const wp=G.gps?.target();if(wp){x.fillStyle='#ff7ad9';x.beginPath();x.moveTo(P(wp.x),P(wp.z));x.arc(P(wp.x),P(wp.z)-14,8,Math.PI*.75,Math.PI*2.25);x.closePath();x.fill()}
  const p=G.player.pos;x.save();x.translate(P(p.x),P(p.z));x.rotate(-G.player.yaw);x.fillStyle='#5dff8a';x.strokeStyle='#0b130e';x.lineWidth=2;x.beginPath();x.moveTo(0,-13);x.lineTo(9,10);x.lineTo(0,5);x.lineTo(-9,10);x.closePath();x.fill();x.stroke();x.restore();
 };
 draw();const iv=setInterval(()=>{if(!cv.isConnected)return clearInterval(iv);draw()},700);
 cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect(),mx=(e.clientX-r.left)/r.width*W,my=(e.clientY-r.top)/r.height*W;
  const hit=pins.find(p=>Math.hypot(p.x-mx,p.y-my)<p.r+4);if(hit)hit.act();else G.setWaypoint({x:U(mx),z:U(my),label:'Pin'});draw();tip.textContent='GPS set to '+(G.gps.label()||'pin')+'. Close the phone and follow the pink line.'});
}

// ---------- GPS route, compass, buyer markers ----------
export function createGPS(G,{scene,player,graph,camera,hud,h}){
 let wp=null,route=[],ribbon=null,routeT=0;
 const arrowTex=(()=>{const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');x.fillStyle='rgba(255,122,217,.35)';x.fillRect(0,0,64,64);x.fillStyle='#ff7ad9';x.beginPath();x.moveTo(12,44);x.lineTo(32,18);x.lineTo(52,44);x.lineTo(42,44);x.lineTo(32,31);x.lineTo(22,44);x.closePath();x.fill();const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t})();
 const ribbonMat=new THREE.MeshBasicMaterial({map:arrowTex,transparent:true,depthWrite:false,opacity:.9,side:THREE.DoubleSide,toneMapped:false});
 const pinMesh=new THREE.Group();{const m=new THREE.MeshBasicMaterial({color:'#ff7ad9',transparent:true,opacity:.35,depthWrite:false});const col=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,18,16,1,true),m);col.position.y=9;const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.45),new THREE.MeshBasicMaterial({color:'#ff7ad9'}));gem.position.y=2.6;pinMesh.add(col,gem);pinMesh.userData.gem=gem;pinMesh.visible=false;scene.add(pinMesh)}
 const nearest=(x,z)=>{let bi=0,bd=1e9;graph.nodes.forEach((n,i)=>{const d=(n[0]-x)**2+(n[1]-z)**2;if(d<bd){bd=d;bi=i}});return bi};
 function path(a,b){ // A* over the sidewalk graph
  const N=graph.nodes,open=new Set([a]),from=new Map(),gs=new Map([[a,0]]),f=new Map([[a,0]]);const hh=i=>Math.hypot(N[i][0]-N[b][0],N[i][1]-N[b][1]);
  while(open.size){let cur=null,cf=1e9;for(const i of open){const v=f.get(i)??1e9;if(v<cf){cf=v;cur=i}}if(cur===b)break;open.delete(cur);
   for(const nb of graph.edges[cur]){const t=gs.get(cur)+Math.hypot(N[cur][0]-N[nb][0],N[cur][1]-N[nb][1]);if(t<(gs.get(nb)??1e9)){from.set(nb,cur);gs.set(nb,t);f.set(nb,t+hh(nb));open.add(nb)}}}
  const out=[];let c=b;while(c!=null){out.unshift(c);c=from.get(c)}return out[0]===a?out:[a,b];
 }
 const target=()=>wp?(wp.follow?{x:wp.follow.g.position.x,z:wp.follow.g.position.z}:{x:wp.x,z:wp.z}):null;
 function rebuild(){
  const t=target();if(!t)return;const a=nearest(player.pos.x,player.pos.z),b=nearest(t.x,t.z);
  const pts=[{x:player.pos.x,z:player.pos.z},...path(a,b).map(i=>({x:graph.nodes[i][0],z:graph.nodes[i][1]})),t];
  // drop backtracking first node if it's behind us
  if(pts.length>3&&Math.hypot(pts[2].x-pts[0].x,pts[2].z-pts[0].z)<Math.hypot(pts[1].x-pts[0].x,pts[1].z-pts[0].z)+Math.hypot(pts[2].x-pts[1].x,pts[2].z-pts[1].z)-1)pts.splice(1,1);
  route=pts;
  if(ribbon){scene.remove(ribbon);ribbon.geometry.dispose()}
  const pos=[],uv=[],idx=[];let along=0;const w=.32;
  for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[Math.min(i+1,pts.length-1)],o=pts[Math.max(i-1,0)];let dx=q.x-o.x,dz=q.z-o.z;const L=Math.hypot(dx,dz)||1;dx/=L;dz/=L;
   if(i)along+=Math.hypot(p.x-pts[i-1].x,p.z-pts[i-1].z);
   pos.push(p.x-dz*w,.21,p.z+dx*w,p.x+dz*w,.21,p.z-dx*w);uv.push(0,along/1.4,1,along/1.4);if(i){const k=i*2;idx.push(k-2,k-1,k,k-1,k+1,k)}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);
  ribbon=new THREE.Mesh(geo,ribbonMat);ribbon.renderOrder=3;scene.add(ribbon);
 }
 G.setWaypoint=w=>{wp=w;routeT=0;if(!w){if(ribbon){scene.remove(ribbon);ribbon=null}route=[];pinMesh.visible=false}};
 G.gps={target,label:()=>wp?.label||'',get route(){return route}};
 // compass bar
 const strip=h('div',{class:'nw-compass'},h('div',{class:'ticks'}),h('i',{class:'mid'}));hud.append(strip);const ticks=strip.firstChild;
 const dist=h('div',{class:'nw-gpsinfo',hidden:true});hud.append(dist);
 // "!" over buyers
 const bangTex=(txt,bg)=>{const c=document.createElement('canvas');c.width=128;c.height=128;const x=c.getContext('2d');x.fillStyle=bg;x.strokeStyle='rgba(0,0,0,.55)';x.lineWidth=8;x.beginPath();x.moveTo(64,6);x.lineTo(122,64);x.lineTo(64,122);x.lineTo(6,64);x.closePath();x.fill();x.stroke();x.fillStyle='#14161a';x.font='900 78px Segoe UI, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(txt,64,70);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t};
 const ORDER=new THREE.SpriteMaterial({map:bangTex('!','#5dff8a'),depthTest:false,transparent:true}),BUY=new THREE.SpriteMaterial({map:bangTex('!','#ffe14d'),depthTest:false,transparent:true});
 let wantT=0;
 function buyers(dt,t){
  wantT-=dt;if(wantT<=0){wantT=40;for(const n of G.npcs){if(n.dead||n.order)continue;if(!n.wants&&Math.random()<.25)n.wants=true;else if(n.wants&&Math.random()<.2)n.wants=false}}
  for(const n of G.npcs){const show=!n.dead&&n.w.mode!=='flee'&&(n.order||n.wants);
   if(show&&!n.bang){n.bang=new THREE.Sprite(ORDER);n.bang.scale.set(.55,.55,1);n.bang.renderOrder=30;n.g.add(n.bang)}
   if(n.bang){n.bang.visible=!!show;if(show){n.bang.material=n.order?ORDER:BUY;n.bang.position.y=2.75+Math.sin(t*3+n.g.id)*.08;const d=n.g.position.distanceTo(player.pos);const s=Math.min(1.4,.45+d*.025)*(n.order?1.15:1);n.bang.scale.set(s,s,1)}}}
 }
 return {update(dt,t){
  buyers(dt,t);
  const f=player.forward(),head=Math.atan2(f.x,-f.z);
  const marks=[];const tg=target();if(tg)marks.push({x:tg.x,z:tg.z,c:'#ff7ad9',k:'wp'});
  for(const m of (G.jobMarks?.()||[]).slice(0,4))marks.push({x:m.x,z:m.z,c:'#5dff8a'});
  for(const n of G.npcs)if(n.order&&!n.dead)marks.push({x:n.g.position.x,z:n.g.position.z,c:'#c77dff'});
  const kids=[];for(let deg=0;deg<360;deg+=15){let rel=deg*Math.PI/180-head;rel=Math.atan2(Math.sin(rel),Math.cos(rel));if(Math.abs(rel)>1.6)continue;const lab={0:'N',90:'E',180:'S',270:'W'}[deg];kids.push(h('span',{class:lab?'l':'t',style:{left:(50+rel/1.6*50)+'%'}},lab||''))}
  for(const m of marks){let rel=Math.atan2(m.x-player.pos.x,-(m.z-player.pos.z))-head;rel=Math.atan2(Math.sin(rel),Math.cos(rel));const cl=Math.max(-1.6,Math.min(1.6,rel));kids.push(h('b',{class:'m'+(m.k?' wp':''),style:{left:(50+cl/1.6*50)+'%','--c':m.c}}))}
  ticks.replaceChildren(...kids);
  if(tg){pinMesh.visible=true;pinMesh.position.set(tg.x,0,tg.z);pinMesh.userData.gem.rotation.y=t*2;pinMesh.userData.gem.position.y=2.6+Math.sin(t*2.4)*.25;
   const d=Math.hypot(tg.x-player.pos.x,tg.z-player.pos.z);dist.hidden=false;dist.replaceChildren(h('b',{},wp.label||'Waypoint'),h('span',{},Math.round(d)+' m'),h('button',{onclick:()=>G.setWaypoint(null),'aria-label':'Clear GPS'},'×'));
   routeT-=dt;if(routeT<=0){routeT=wp.follow?.8:1.5;rebuild()}
   if(ribbon)ribbonMat.map.offset.y-=dt*1.4;
   if(d<(wp.follow?3:6)){G.toast('📍 You’ve arrived'+(wp.label?' at '+wp.label:''),'good');G.setWaypoint(null)}}
  else dist.hidden=true;
 }};
}
