export function attachTubeTheater({doc=document,storage=localStorage}={}){
 const toggle=doc.getElementById('tube-theater');if(!toggle)return;
 let enabled=false;try{enabled=storage.getItem('nova_tube_theater')==='true'}catch{}
 function paint(){doc.body.classList.toggle('tube-theater',enabled);toggle.setAttribute('aria-pressed',String(enabled));toggle.setAttribute('aria-label',enabled?'Exit theater mode':'Theater mode');toggle.title=(enabled?'Exit theater mode':'Theater mode')+' (T)';toggle.querySelector('span').textContent=enabled?'Default view':'Theater mode'}
 let motion;function change(){const stage=doc.querySelector('.tube-player-wrap'),before=stage?.getBoundingClientRect();motion?.cancel();enabled=!enabled;paint();if(stage&&before&&!doc.documentElement.classList.contains('reduce-motion')){const after=stage.getBoundingClientRect();if(after.width&&after.height)motion=stage.animate?.([{transformOrigin:'top left',transform:'translate('+(before.left-after.left)+'px,'+(before.top-after.top)+'px) scale('+(before.width/after.width)+','+(before.height/after.height)+')',opacity:.8},{transformOrigin:'top left',transform:'none',opacity:1}],{duration:260,easing:'cubic-bezier(.2,.8,.2,1)'})}try{storage.setItem('nova_tube_theater',String(enabled))}catch{}}
 toggle.addEventListener('click',change);
 doc.addEventListener('keydown',e=>{if(e.ctrlKey||e.altKey||e.metaKey||e.repeat||e.target.closest?.('input,textarea,select,[contenteditable=true]')||doc.querySelector('dialog[open]')||doc.getElementById('tube-watch')?.hidden||doc.body.classList.contains('tube-short-view'))return;if(e.key.toLowerCase()==='t'){e.preventDefault();change()}});
 paint();
}
