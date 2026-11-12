// Nova Locker: a lit showroom stage with your profile standing in 3D (it turns to follow the
// cursor), a loadout of equipped slots, and an item picker per category.
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
const CATS=[
 {id:'effect',label:'Profile Effect',plural:'Profile Effects',icon:'✦',test:a=>a.kind==='effect'&&a.subtype!=='frame',slot:'effect'},
 {id:'decoration',label:'Avatar Decoration',plural:'Avatar Decorations',icon:'◎',test:a=>a.kind==='decoration'&&a.subtype!=='frame',slot:'decoration'},
 {id:'banner',label:'Chat Banner',plural:'Chat Banners',icon:'▭',test:a=>a.kind==='banner',slot:'chatBanner'},
 {id:'frame',label:'Profile Frame',plural:'Profile Frames',icon:'▢',test:a=>a.subtype==='frame',slot:null}
];
const RARITY=['singularity','mythic','legendary','epic','uncommon','common'];
const slotOf=item=>item.kind==='banner'?'chatBanner':item.kind;
const reduced=()=>localStorage.getItem('nova_reduce_motion')==='true'||matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mountLocker(panel,ctx,{preview,equip,request}){
 for(const old of panel.querySelectorAll('.shop-locker-stage,.locker-tools,.case-inventory,.locker-empty'))old.hidden=true;
 panel.querySelector('.lk')?.remove();
 const root=el('section','lk'),stage=el('div','lk-stage'),side=el('div','lk-side');root.append(stage,side);panel.append(root);
 const state={cat:localStorage.getItem('nova_locker_cat')||'effect',selected:null,query:''};
 if(!CATS.some(c=>c.id===state.cat))state.cat='effect';
 const me=()=>ctx.person(ctx.state.me.uid)||{};
 const owned=()=>{const inv=ctx.state.store?.inventory||{};return (ctx.state.assets||[]).filter(a=>inv[a.id]?.count>0)};
 const isOn=item=>me()[slotOf(item)]===item.id;
 const catOf=item=>CATS.find(c=>c.test(item))||CATS[0];

 // ---------- stage ----------
 const spot=el('div','lk-spot'),floor=el('div','lk-floor'),rig=el('div','lk-rig'),card=el('div','lk-card'),glare=el('i','lk-glare'),reflect=el('div','lk-reflect');
 const plate=el('div','lk-plate'),actions=el('div','lk-actions');
 rig.append(card,reflect);card.append(glare);
 stage.append(spot,floor,rig,plate,actions);
 function drawStage(){
  card.replaceChildren(preview(ctx,state.selected,true),glare);
  reflect.replaceChildren();const mirror=card.firstChild.cloneNode(true);mirror.querySelectorAll('canvas').forEach(c=>c.remove());reflect.append(mirror);
  const sel=state.selected;plate.replaceChildren();
  if(sel){const c=catOf(sel);plate.append(el('small','lk-kind',c.label),el('b','',sel.name),el('span','lk-rarity r-'+sel.rarity,sel.rarity));stage.dataset.rarity=sel.rarity}
  else{plate.append(el('small','lk-kind','Your profile'),el('b','',me().displayName||me().name||'You'),el('span','lk-rarity','Current look'));delete stage.dataset.rarity}
  actions.replaceChildren();
  if(sel){
   const on=isOn(sel);
   const eq=ctx.button(on?'Equipped':'Equip',async()=>{if(on)return;eq.disabled=true;try{await equip(ctx,sel);ctx.toast('Equipped '+sel.name)}catch(e){ctx.toast(e.message);eq.disabled=false}},'lk-btn lk-primary');eq.disabled=on;actions.append(eq);
   if(on&&['effect','decoration','chatBanner'].includes(slotOf(sel))){const rm=ctx.button('Remove',async()=>{rm.disabled=true;try{await request(ctx,'unequipCosmetic',{kind:slotOf(sel)});me()[slotOf(sel)]=null;ctx.toast('Removed '+sel.name);dispatchEvent(new Event('nova-shop-equipped'))}catch(e){ctx.toast(e.message);rm.disabled=false}},'lk-btn');actions.append(rm)}
   actions.append(ctx.button('Reset view',()=>{state.selected=null;drawAll()},'lk-btn lk-ghost'));
  }else actions.append(el('p','lk-hint','Pick an item to try it on. Move your mouse to look around.'));
 }

 // cursor-follow 3D: smooth toward the target angle every frame
 const look={x:0,y:0,tx:0,ty:0,raf:0,active:false};
 function onMove(e){const r=stage.getBoundingClientRect();look.tx=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/(r.width/2)));look.ty=Math.max(-1,Math.min(1,(e.clientY-(r.top+r.height*.45))/(r.height/2)));look.active=true;kick()}
 function onLeave(){look.active=false;look.tx=0;look.ty=0;kick()}
 function frame(t){look.raf=0;const idle=look.active||reduced()?0:Math.sin(t/1400)*.35;const tx=look.tx+idle,ty=look.ty+(look.active||reduced()?0:Math.cos(t/1900)*.12);
  look.x+=(tx-look.x)*.12;look.y+=(ty-look.y)*.12;
  const ry=look.x*24,rx=-look.y*12;rig.style.transform=`translateY(${(reduced()?0:Math.sin(t/900)*6)}px) rotateY(${ry}deg) rotateX(${rx}deg)`;
  glare.style.background=`radial-gradient(420px circle at ${50+look.x*45}% ${30+look.y*40}%,rgba(255,255,255,.22),transparent 55%)`;
  spot.style.transform=`translateX(${look.x*-18}px)`;floor.style.transform=`translateX(-50%) scaleX(${1-Math.abs(look.x)*.12})`;
  if(root.isConnected&&!document.hidden)kick()}
 function kick(){if(!look.raf)look.raf=requestAnimationFrame(frame)}
 root.addEventListener('pointermove',onMove);root.addEventListener('pointerleave',onLeave);kick();

 // ---------- loadout + picker ----------
 function drawSide(){
  side.replaceChildren();
  const load=el('div','lk-loadout');load.append(el('small','lk-label','LOADOUT'));
  for(const c of CATS){const id=c.slot?me()[c.slot]:null;const worn=(ctx.state.assets||[]).find(a=>a.id===id)||(c.id==='frame'?(ctx.state.assets||[]).find(a=>a.subtype==='frame'&&(me().effect===a.id||me().decoration===a.id)):null);
   const s=el('button','lk-slot'+(c.id===state.cat?' active':''));s.type='button';s.setAttribute('aria-pressed',String(c.id===state.cat));
   const art=el('span','lk-slot-art');if(worn){const im=el('img');im.src=worn.thumbnail||worn.src;im.alt='';art.append(im)}else art.append(el('i','',c.icon));
   const txt=el('span','lk-slot-text');txt.append(el('small','',c.label),el('b','',worn?worn.name:'Empty'));
   s.append(art,txt,el('span','lk-count-pill',String(owned().filter(c.test).length)));
   s.onclick=()=>{state.cat=c.id;localStorage.setItem('nova_locker_cat',c.id);state.selected=null;drawAll()};load.append(s)}
  const idx=CATS.findIndex(c=>c.id===state.cat),cat=CATS[idx];
  const bar=el('div','lk-bar');const prev=el('button','lk-arrow','‹'),next=el('button','lk-arrow','›');prev.type=next.type='button';prev.setAttribute('aria-label','Previous category');next.setAttribute('aria-label','Next category');
  const go=d=>{state.cat=CATS[(idx+d+CATS.length)%CATS.length].id;localStorage.setItem('nova_locker_cat',state.cat);state.selected=null;drawAll()};prev.onclick=()=>go(-1);next.onclick=()=>go(1);
  const title=el('div','lk-title');title.append(el('b','',cat.plural),el('small','',(idx+1)+' / '+CATS.length));bar.append(prev,title,next);
  const search=el('input','lk-search');search.type='search';search.placeholder='Search '+cat.plural.toLowerCase();search.value=state.query;search.setAttribute('aria-label','Search your locker');
  const grid=el('div','lk-grid');
  function drawGrid(){const q=state.query.trim().toLowerCase();const inv=ctx.state.store?.inventory||{};
   const items=owned().filter(cat.test).filter(a=>!q||a.name.toLowerCase().includes(q)).sort((a,b)=>RARITY.indexOf(a.rarity)-RARITY.indexOf(b.rarity)||a.name.localeCompare(b.name));
   grid.replaceChildren();
   if(!items.length){grid.append(el('p','lk-empty',q?'Nothing matches “'+state.query+'”.':'No '+cat.plural.toLowerCase()+' yet. Open a crate or visit the Item Shop.'));return}
   for(const a of items){const t=el('button','lk-tile r-'+a.rarity+(state.selected?.id===a.id?' sel':'')+(isOn(a)?' on':''));t.type='button';t.setAttribute('aria-label',a.name+' · '+a.rarity+(isOn(a)?' · equipped':''));
    const art=el('span','lk-art');const im=el('img');im.src=a.thumbnail||a.src;im.alt='';im.loading='lazy';im.decoding='async';art.append(im);
    t.onpointerenter=()=>{if(a.src)im.src=a.src};t.onpointerleave=()=>{im.src=a.thumbnail||a.src};
    const meta=el('span','lk-meta');meta.append(el('b','',a.name),el('small','',a.rarity+(inv[a.id]?.count>1?' · ×'+inv[a.id].count:'')));
    t.append(art,meta);if(isOn(a))t.append(el('i','lk-on','✓'));
    t.onclick=()=>{state.selected=a;drawStage();grid.querySelectorAll('.lk-tile.sel').forEach(n=>n.classList.remove('sel'));t.classList.add('sel')};grid.append(t)}}
  search.oninput=()=>{state.query=search.value;drawGrid()};
  side.append(load,bar,search,grid);drawGrid();
 }
 function drawAll(){drawStage();drawSide()}
 root.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();side.querySelector('.lk-arrow:'+(e.key==='ArrowRight'?'last-of-type':'first-of-type'))?.click()}});
 addEventListener('nova-shop-equipped',()=>{if(root.isConnected)drawAll()});
 drawAll();
 return {refresh:drawAll};
}
