// Nova Music opening screen: a spinning 3D record over a slow wall of the listener's own
// album covers (recently played + liked). New listeners see popular covers instead.
(()=>{
 const MARKUP='<div class="nmc-boot-intro nml" role="status" aria-label="Opening Nova Music"><div class="nml-wall" aria-hidden="true"></div><div class="nml-center"><div class="nml-stage" aria-hidden="true"><div class="nml-tilt"><div class="nml-disc"><i class="nml-layer"></i><i class="nml-layer"></i><i class="nml-layer"></i><i class="nml-face"></i><span class="nml-label"><img src="/Nova12.png" alt=""></span></div><i class="nml-ring"></i><i class="nml-ring is-outer"></i></div></div><div class="nml-copy"><strong>Nova Music</strong><span>Loading your sound</span></div><div class="nml-meter"><i></i></div></div></div>';
 function start(root){if(!root||root.dataset.nmlStarted)return;root.dataset.nmlStarted='1';
 const wall=root.querySelector('.nml-wall');
 let skin='spotify';try{skin=localStorage.getItem('nova_music_skin')==='apple'?'apple':'spotify'}catch{}
 document.documentElement.dataset.musicSkin=skin;
 const ok=v=>typeof v==='string'&&/^(https:\/\/|\/(?!\/))/.test(v)&&v.length<2000&&!/Nova12\.png/.test(v);
 const covers=[];const add=t=>{const v=t&&(t.thumb||t.art);if(ok(v)&&!covers.includes(v))covers.push(v)};
 try{JSON.parse(localStorage.getItem('nova_music_recent')||'[]').forEach(add)}catch{}
 try{const lib=JSON.parse(localStorage.getItem('nova_music_library_cache')||'null');Object.values(lib?.liked||{}).forEach(add);for(const p of Object.values(lib?.playlists||{}))Object.values(p?.songs||{}).slice(0,6).forEach(add)}catch{}
 const ROWS=4,PER=9;
 const palette=['#1db954','#fa2d48','#7c5cff','#ff8a3d','#19b8d6','#e83e8c','#f5c518','#3ddc97','#5b8cff'];
 function tile(src,i){const t=document.createElement('span');t.className='nml-tile';if(src){const img=new Image();img.alt='';img.decoding='async';img.loading='eager';img.referrerPolicy='no-referrer';img.onerror=()=>{img.remove();t.style.background=grad(i)};img.src=src;t.append(img)}else t.style.background=grad(i);return t}
 function grad(i){const a=palette[i%palette.length],b=palette[(i*3+2)%palette.length];return 'linear-gradient('+(i*47%360)+'deg,'+a+','+b+')'}
 function paint(list){wall.replaceChildren();for(let r=0;r<ROWS;r++){const row=document.createElement('div');row.className='nml-row'+(r%2?' is-rev':'');row.style.setProperty('--s',(38+r*7)+'s');const set=[];for(let i=0;i<PER;i++){const n=r*PER+i;set.push(list.length?list[(n*7+r)%list.length]:'')}
  // Two copies so the row can loop seamlessly.
  for(const copy of [0,1])set.forEach((src,i)=>row.append(tile(src,r*PER+i)));wall.append(row)}root.classList.add('has-wall')}
 paint(covers);
 if(covers.length<8){try{JSON.parse(localStorage.getItem('nova_music_popular_covers')||'[]').forEach(v=>add({thumb:v}));if(covers.length)paint(covers)}catch{}}
 if(covers.length<8){
  // New listener: show what is popular right now (best effort, never blocks the app).
  const ctrl=new AbortController();setTimeout(()=>ctrl.abort(),9000);
  fetch('/api/soundcloud?op=catalog&q='+encodeURIComponent('top hits'),{signal:ctrl.signal}).then(r=>r.ok?r.json():null).then(data=>{if(!data||!root.isConnected)return;const popular=[...(data.releases||[]),...(data.tracks||[])].map(t=>t.thumb).filter(ok).slice(0,36);try{localStorage.setItem('nova_music_popular_covers',JSON.stringify(popular))}catch{}popular.forEach(v=>add({thumb:v}));if(covers.length)paint(covers)}).catch(()=>{});
 }
 // Gentle parallax: the wall leans toward the pointer.
 const lean=e=>{const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;root.style.setProperty('--px',x.toFixed(3));root.style.setProperty('--py',y.toFixed(3))};
 addEventListener('pointermove',lean,{passive:true});
 new MutationObserver((_,o)=>{if(!root.isConnected){removeEventListener('pointermove',lean);o.disconnect()}}).observe(document.body,{childList:true,subtree:true});
 }
 window.NovaMusicLoader={markup:MARKUP,start,mount(host){host.innerHTML=MARKUP;start(host.querySelector('.nml'))}};
 document.querySelectorAll('.nml').forEach(start);
})();
