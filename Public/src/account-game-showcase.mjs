// Artwork previews only: no background game engines or account requests.
export function mountGameShowcase(page){
 const games=[['Minecraft','Build your next world.','Creative · Adventure','1044.png'],['GTA on Browser','A whole city to explore.','Open world · Action','1045.png'],['Snow Rider 3D','One more run. One more record.','Arcade · Racing','119.png'],['Retro Bowl','Your team. Your season.','Sports · Strategy','33.png'],['Terraria','Find a world beneath the surface.','Adventure · Sandbox','1041.jpg']];
 page.replaceChildren();const scene=document.createElement('section');scene.className='account-game-scene';scene.setAttribute('aria-label','Game artwork showcase');
 const layers=[0,1].map(()=>{const img=new Image();img.alt='';img.className='game-scene-backdrop';scene.append(img);return img});
 const caption=document.createElement('div');caption.className='game-scene-caption';const kicker=document.createElement('small');kicker.textContent='EXPLORE THE ARCADE';const title=document.createElement('h3'),desc=document.createElement('p'),genre=document.createElement('span');caption.append(kicker,title,desc,genre);scene.append(caption);
 const foreground=new Image();foreground.className='game-scene-cover';scene.append(foreground);
 const rail=document.createElement('div');rail.className='game-scene-rail';rail.setAttribute('aria-label','Choose a game preview');scene.append(rail);
 let selected=-1,layer=0,last=Date.now();const buttons=games.map((game,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Preview '+game[0]);const img=new Image();img.src='/content/covers/'+game[3];img.alt='';img.loading='lazy';b.append(img);b.onclick=()=>select(i);rail.append(b);return b});
 function select(i){if(i===selected)return;selected=i;last=Date.now();const game=games[i];layer=1-layer;layers[layer].src='/content/covers/'+game[3];layers[layer].classList.add('visible');layers[1-layer].classList.remove('visible');foreground.src='/content/covers/'+game[3];foreground.alt=game[0]+' artwork';title.textContent=game[0];desc.textContent=game[1];genre.textContent=game[2];buttons.forEach((b,n)=>{b.classList.toggle('selected',i===n);b.setAttribute('aria-pressed',String(i===n))});scene.dataset.game=String(i);}
 page.append(scene);select(0);setInterval(()=>{if(!document.hidden&&page.getAttribute('aria-hidden')==='false'&&page.parentElement.dataset.paused!=='true'&&Date.now()-last>4500&&!scene.matches(':hover')&&globalThis.NovaMotion?.reduced!==true)select((selected+1)%games.length)},500);
}
export function mountShowcaseTilt(){
 const host=document.querySelector('.nova-showcase'),windowEl=host?.querySelector('.preview-window');if(!host||!windowEl)return;
 let pending=0,x=0,y=0;const reset=()=>{x=y=0;paint()};
 function paint(){if(pending)return;pending=requestAnimationFrame(()=>{pending=0;windowEl.style.setProperty('--tilt-x',y+'deg');windowEl.style.setProperty('--tilt-y',x+'deg');windowEl.style.setProperty('--shine-x',(50+x*6)+'%');windowEl.style.setProperty('--shine-y',(50-y*6)+'%')})}
 host.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||globalThis.NovaMotion?.reduced===true||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=windowEl.getBoundingClientRect();x=Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1))*5;y=Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1))*-4;paint()},{passive:true});host.addEventListener('pointerleave',reset);addEventListener('blur',reset);document.addEventListener('visibilitychange',reset);
}
