export function movieWallpaper(storage=localStorage,scope=window){
 try{
  const gradient=JSON.parse(storage.getItem('nova_grad')||'null');
  if(gradient&&[gradient.c1,gradient.c2,gradient.c3].every(c=>/^#[a-f\d]{6}$/i.test(c))&&/^(?:\d+deg|to (?:right|left|top|bottom)(?: (?:right|left|top|bottom))?)$/.test(gradient.dir))return {gradient:`linear-gradient(${gradient.dir},${gradient.c1},${gradient.c2},${gradient.c3})`};
 }catch{}
 const saved=storage.getItem('nova_wallpaper_upload')||storage.getItem('nova_wallpaper')||'/backgrounds/blue-lake-minecraft.1920x1080.mp4';
 let source=scope.NovaWallpaperSource?.(saved)||saved;try{const old=new URL(source,scope.location?.href||'https://nova.invalid');if(old.hostname==='novaoffical.com'&&old.pathname.startsWith('/backgrounds/'))source=old.pathname}catch{}
 const video=scope.NovaWallpaperIsVideo?.(source)||/\.(mp4|webm|mov)(?:[?#]|$)|^data:video\//i.test(source);
 const poster=video?scope.NovaWallpaperPoster?.(source):'';
 return {source:poster||source,video:video&&!poster};
}

export function mountMovieWallpaper(){
 const layer=document.createElement('div');layer.id='movie-wallpaper';layer.setAttribute('aria-hidden','true');document.body.prepend(layer);
 let last='';
 const sync=()=>{const state=movieWallpaper(),key=JSON.stringify(state);if(key===last)return;last=key;layer.querySelector('video')?.pause();layer.replaceChildren();layer.style.background=state.gradient||'';if(state.gradient)return;
  const media=document.createElement(state.video?'video':'img');
  if(state.video){media.muted=true;media.playsInline=true;media.preload='auto';media.addEventListener('loadeddata',()=>media.pause(),{once:true})}else{media.alt='';media.decoding='async'}
  media.src=state.source;layer.append(media);
 };
 sync();addEventListener('storage',sync);const timer=setInterval(sync,3000);
 addEventListener('pagehide',()=>{clearInterval(timer);removeEventListener('storage',sync);layer.querySelector('video')?.pause()},{once:true});
 return sync;
}
