/* Apply once to the outer Nova workspace; nested apps inherit it without double scaling. */
(()=>{if(window.NovaDesktopDisplay)return;window.NovaDesktopDisplay={};
 const script=document.currentScript,base=new URL('.',script.src);let scheduled=false;
 import(new URL('desktop-display.mjs',base)).then(({displayPreferences,displayLayout,displayDefaults})=>{
  const root=document.documentElement;let svg,transfer;
  function ownsView(){try{return parent===window||parent.__novaBlankHost===true&&!parent.NovaDesktopDisplay}catch{return true}}
  function apply(){scheduled=false;if(!ownsView())return;let raw={};try{for(const key of Object.keys(displayDefaults))raw[key]=localStorage.getItem(key==='fov'?'nova_fov':'nova_display_'+key)??displayDefaults[key]}catch{}
   const p=displayPreferences(raw),layout=displayLayout(p,innerWidth,innerHeight);root.style.zoom=String(layout.zoom);
   const colored=p.brightness!==100||p.contrast!==100||p.gamma!==1||p.vibrance!==100||p.hue!==0;
   if(colored&&!svg){const ns='http://www.w3.org/2000/svg';svg=document.createElementNS(ns,'svg');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.style.cssText='position:absolute;pointer-events:none';const filter=document.createElementNS(ns,'filter');filter.id='nova-desktop-gamma';filter.setAttribute('color-interpolation-filters','sRGB');transfer=document.createElementNS(ns,'feComponentTransfer');for(const channel of ['R','G','B']){const fn=document.createElementNS(ns,'feFunc'+channel);fn.setAttribute('type','gamma');fn.setAttribute('amplitude','1');fn.setAttribute('offset','0');transfer.append(fn)}filter.append(transfer);svg.append(filter);document.body.append(svg)}
   if(transfer)for(const fn of transfer.children)fn.setAttribute('exponent',String(1/p.gamma));
   root.style.filter=colored?`${p.gamma!==1?'url(#nova-desktop-gamma) ':''}brightness(${p.brightness}%) contrast(${p.contrast}%) saturate(${p.vibrance}%) hue-rotate(${p.hue}deg)` :'';
   root.dataset.novaDesktopView=`${layout.width}x${layout.height}`;
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(apply)}}
  window.NovaDesktopDisplay.sync=schedule;addEventListener('resize',schedule);addEventListener('storage',schedule);addEventListener('nova-display-changed',schedule);addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.novaAction==='settingsChanged')schedule()});if(document.body)apply();else addEventListener('DOMContentLoaded',apply,{once:true});
 }).catch(error=>console.warn('Nova display settings unavailable:',error));
})();
