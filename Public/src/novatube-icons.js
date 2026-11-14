// NovaTube icons: replaces the old text symbols (☰ ⌕ ↻ ⌂ ϟ ◉ ◷ ▤ ♡ ↗ ‹) with real line icons.
(()=>{
 const P={
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
  shorts:'<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
  profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  saved:'<path d="M6 3h12v18l-6-4-6 4Z"/>',
  liked:'<path d="M7 10v11H3V10Zm0 0 4-8a3 3 0 0 1 3 3v4h5.5a2 2 0 0 1 2 2.3l-1.3 8A2 2 0 0 1 18.2 21H7"/>',
  share:'<path d="m15 5 6 6-6 6"/><path d="M21 11H9a6 6 0 0 0-6 6v2"/>',
  back:'<path d="m15 18-6-6 6-6"/>',
  external:'<path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>',
  reload:'<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
  play:'<path d="M8 5.5v13l10.5-6.5Z" fill="currentColor" stroke="none"/>'
 };
 const svg=(name,extra='')=>'<svg class="tube-ico'+extra+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(P[name]||'')+'</svg>';
 window.NovaTubeIcon=svg;
 const set=(sel,html)=>{const n=document.querySelector(sel);if(n)n.innerHTML=html};
 const label=(sel,name,text)=>{const n=document.querySelector(sel);if(n)n.innerHTML=svg(name)+'<span>'+text+'</span>'};
 function apply(){
  set('#tube-menu',svg('menu'));
  set('#tube-home',  '<span class="tube-mark" aria-hidden="true">'+svg('play')+'</span><b>Nova<i>Tube</i></b>');
  set('#tube-search button',svg('search'));
  set('#tube-refresh',svg('refresh'));
  for(const [page,name]of [['home','home'],['shorts','shorts'],['profile','profile'],['history','history'],['saved','saved'],['liked','liked']]){const s=document.querySelector('[data-tube-page="'+page+'"] > span');if(s)s.innerHTML=svg(name)}
  label('#tube-back','back','Back to videos');
  label('#tube-share','share','Share');
  label('#tube-retry','reload','Reload player');
  const ext=document.querySelector('#tube-external');if(ext)ext.innerHTML='<span>Open on YouTube</span>'+svg('external');
  set('.tube-loading-logo',svg('play'));
  document.documentElement.classList.add('tube-v2');
  // Shorts: keep the action buttons right beside the video, bottom-aligned with it.
  const place=()=>{if(!document.body.classList.contains('tube-short-view'))return;const w=document.querySelector('.tube-player-wrap'),act=document.querySelector('.tube-short-actions');if(!w||!act)return;const r=w.getBoundingClientRect(),o=(act.offsetParent||document.body).getBoundingClientRect();act.style.setProperty('--sx',Math.round(r.right-o.left+16)+'px');act.style.setProperty('--sy',Math.round(r.bottom-o.top)+'px')};let raf=0;const soon=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(place)};addEventListener('resize',soon,{passive:true});addEventListener('scroll',soon,{passive:true,capture:true});new MutationObserver(soon).observe(document.body,{attributes:true,attributeFilter:['class'],childList:true,subtree:false});setInterval(()=>{if(document.body.classList.contains('tube-short-view'))place()},700);
  // Close the suggestions once a search is sent.
  const html=document.documentElement;document.getElementById('tube-search')?.addEventListener('submit',()=>{html.classList.add('tube-sug-closed');setTimeout(()=>document.getElementById('tube-query')?.blur(),0)});document.getElementById('tube-query')?.addEventListener('input',()=>html.classList.remove('tube-sug-closed'));document.addEventListener('click',e=>{if(e.target.closest('.tube-suggestion'))html.classList.add('tube-sug-closed')},true);
  // Search results get a list layout (big thumbnail left, details right).
  const heading=document.getElementById('tube-heading');const mark=()=>document.documentElement.classList.toggle('tube-results',/^Results for/.test(heading?.textContent||''));if(heading){new MutationObserver(mark).observe(heading,{childList:true,characterData:true,subtree:true});mark()}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
