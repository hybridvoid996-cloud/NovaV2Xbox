// Top bar polish: groups the app buttons with thin dividers and slides a glass pill
// behind whichever page is open. Purely visual; the buttons themselves are untouched.
(()=>{
 const header=document.querySelector('header'),nav=header?.querySelector('nav');if(!nav)return;
 // Groups: Home Library Apps Search | Music NovaTube NovaMOVIE | Chat AI | Settings Admin
 const AFTER=['search','novamovies','ai'];
 const pill=document.createElement('span');pill.className='nav-pill';pill.setAttribute('aria-hidden','true');
 let frame=0;
 function ensure(){
  if(pill.parentNode!==nav)nav.prepend(pill);
  for(const page of AFTER){
   const b=nav.querySelector(':scope > button[data-page="'+page+'"]');if(!b)continue;
   let next=b.nextElementSibling;while(next&&next.hidden)next=next.nextElementSibling;
   const has=b.nextElementSibling?.classList.contains('nav-sep');
   if(!next){if(has)b.nextElementSibling.remove();continue}
   if(!has){const s=document.createElement('span');s.className='nav-sep';s.setAttribute('aria-hidden','true');b.after(s)}
  }
  move();
 }
 function move(){
  cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   const active=nav.querySelector(':scope > button.active:not([hidden])');
   if(!active){pill.classList.remove('on');return}
   pill.style.transform='translate('+active.offsetLeft+'px,'+active.offsetTop+'px)';
   pill.style.width=active.offsetWidth+'px';pill.style.height=active.offsetHeight+'px';
   pill.style.setProperty('--pill-accent',getComputedStyle(active).getPropertyValue('--service-accent').trim()||'#ffffff');
   if(!pill.classList.contains('on'))requestAnimationFrame(()=>pill.classList.add('on'));
  });
 }
 let busy=false;
 new MutationObserver(()=>{if(busy)return;busy=true;queueMicrotask(()=>{ensure();busy=false})}).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
 addEventListener('resize',move,{passive:true});
 if(typeof ResizeObserver==='function')new ResizeObserver(move).observe(nav);
 document.fonts?.ready?.then(move);
 ensure();
 document.documentElement.classList.add('nav-polished');
})();
