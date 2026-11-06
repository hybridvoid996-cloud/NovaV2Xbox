// Tile-to-player motion. Loading begins immediately under the visual transition.
export function createLibraryMotion(){
 let active=null,busy=false,returnRequested=false;const panel=document.getElementById('panel');
 const reduce=()=>matchMedia('(prefers-reduced-motion:reduce)').matches||localStorage.getItem('nova_reduce_motion')==='true';
 function layer(game,rect){const root=document.createElement('div');root.className='library-player-morph';root.setAttribute('aria-hidden','true');const backdrop=document.createElement('div');backdrop.className='library-morph-backdrop';const image=document.createElement('img');image.src=game.art||'/Nova12.png';image.alt='';image.onerror=()=>{image.onerror=null;image.src='/Nova12.png'};backdrop.style.backgroundImage='url('+JSON.stringify(image.src)+')';const card=document.createElement('div');card.className='library-morph-card';card.append(image);root.append(backdrop,card);Object.assign(root.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});document.body.append(root);return root;}
 const pose=(from,to)=>`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`;
 async function launch({game,source,start,onReturn}){
  if(busy)return;busy=true;const from=source.querySelector('img')?.getBoundingClientRect()||source.getBoundingClientRect();
  try{start();active={game,from,onReturn};returnRequested=false;if(reduce()||document.body.classList.contains('nova-phone'))return;
   const to=panel.getBoundingClientRect();if(!to.width||!to.height)return;const root=layer(game,to),card=root.querySelector('.library-morph-card');const finalSize=Math.min(112,to.width*.18,to.height*.24);card.style.width=card.style.height=finalSize+'px';
   const motion=root.animate([{transform:pose(from,to),borderRadius:'32px',opacity:.9},{transform:'translate(0,0) scale(1)',borderRadius:'18px',opacity:1}],{duration:490,easing:'cubic-bezier(.18,.8,.22,1)',fill:'both'});
   card.animate([{opacity:0,transform:'scale(.65)'},{opacity:1,transform:'scale(1)'}],{duration:360,delay:100,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});
   await motion.finished.catch(()=>{});await root.animate([{opacity:1},{opacity:0}],{duration:160,easing:'ease-out',fill:'forwards'}).finished.catch(()=>{});root.remove();
  }finally{busy=false;}
 }
 document.addEventListener('click',e=>{if(active&&e.target.closest('#close'))returnRequested=true},true);
 addEventListener('message',e=>{if(e.origin===location.origin&&e.source===document.getElementById('system')?.contentWindow&&e.data?.novaAction==='playerBack')returnRequested=true});
 if(panel)new MutationObserver(async()=>{if(!panel.hidden||!active)return;const state=active;active=null;const restore=returnRequested;returnRequested=false;if(restore)state.onReturn?.();if(reduce()||document.body.classList.contains('nova-phone'))return;const to=panel.getBoundingClientRect();const rect=to.width?to:{left:0,top:0,width:innerWidth,height:innerHeight};const root=layer(state.game,rect);root.classList.add('is-closing');const card=root.querySelector('.library-morph-card');card.style.width=card.style.height='100px';try{await root.animate([{transform:'translate(0,0) scale(1)',opacity:.85,borderRadius:'18px'},{transform:pose(state.from,rect),opacity:0,borderRadius:'32px'}],{duration:360,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}).finished}catch{}root.remove()}).observe(panel,{attributes:true,attributeFilter:['hidden']});
 return {launch};
}
