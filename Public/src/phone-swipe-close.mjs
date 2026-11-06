export function mountPhoneSwipeClose({header,surface,close}){
 if(!surface)return;
 if(header)header.style.setProperty('display','none','important');
 let closing=false,start=null,tipTimer=0;const docs=new WeakSet();
 const hint=document.createElement('div');hint.className='np-swipe-tip';hint.setAttribute('role','status');hint.textContent='Swipe left across the screen to close';surface.append(hint);
 const ignore=el=>el?.closest?.('#nova-touch-pad,#nova-touch-toggle,input,textarea,select,button,a,[contenteditable=true],.nmc-timeline,.nmc-player');
 const reset=()=>{start=null};
 function finish(){if(closing||surface.hidden)return;closing=true;reset();surface.classList.add('np-swipe-leaving');setTimeout(()=>{close();surface.classList.remove('np-swipe-leaving');closing=false},180)}
 function attach(doc){if(docs.has(doc))return;docs.add(doc);
 doc.addEventListener('pointerdown',e=>{if(surface.hidden||closing||ignore(e.target)||e.button!==0)return;if(e.isPrimary===false){reset();return;}if(start){reset();return;}start={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now(),doc,width:doc.defaultView.innerWidth};},{capture:true,passive:true});
 doc.addEventListener('pointerup',e=>{if(!start||start.doc!==doc||start.id!==e.pointerId)return;const s=start;reset();const dx=s.x-e.clientX,dy=Math.abs(s.y-e.clientY),elapsed=performance.now()-s.time;if(dx>=Math.max(110,s.width*.28)&&dy<dx*.3&&elapsed<1000)finish();},{capture:true,passive:true});
 doc.addEventListener('pointercancel',reset,{capture:true,passive:true});
 }
 function scan(){if(surface.hidden)return;attach(surface.ownerDocument);const frames=[...surface.querySelectorAll('iframe')];for(let i=0;i<frames.length&&i<24;i++){try{const d=frames[i].contentDocument;if(d){attach(d);frames.push(...d.querySelectorAll('iframe'));}}catch{}}}
 // Transparent edge fallback keeps the gesture available for inaccessible frames.
 const edge=document.createElement('div');edge.className='np-swipe-edge';edge.setAttribute('aria-hidden','true');surface.append(edge);edge.addEventListener('pointerdown',e=>edge.setPointerCapture(e.pointerId));
 const timer=setInterval(scan,750);addEventListener('pagehide',()=>{clearInterval(timer);clearTimeout(tipTimer);reset()},{once:true});
 function notify(){reset();scan();clearTimeout(tipTimer);hint.classList.add('visible');tipTimer=setTimeout(()=>hint.classList.remove('visible'),3800)}
 return {notify,reset};
}
