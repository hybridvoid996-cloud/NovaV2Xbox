import {movieWallpaper} from './movie-wallpaper.mjs';

// A single frozen wallpaper layer avoids decoding a video while people type.
const backdrop=document.createElement('div');
backdrop.id='chat-wallpaper';
backdrop.setAttribute('aria-hidden','true');
document.body.prepend(backdrop);
let previous='';
function syncWallpaper(){
 const state=movieWallpaper();
 const key=JSON.stringify(state);
 if(key===previous)return;
 previous=key;
 backdrop.querySelector('video')?.pause();
 backdrop.replaceChildren();
 backdrop.style.background=state.gradient||'';
 if(state.gradient)return;
 const media=document.createElement(state.video?'video':'img');
 if(state.video){
  media.muted=true;media.playsInline=true;media.preload='metadata';
  media.addEventListener('loadeddata',()=>media.pause(),{once:true});
 }else{media.alt='';media.decoding='async'}
 media.src=state.source;
 backdrop.append(media);
}
syncWallpaper();
addEventListener('storage',syncWallpaper);
addEventListener('pageshow',syncWallpaper);
addEventListener('message',e=>{
 if(e.origin===location.origin&&e.data?.novaAction==='settingsChanged')syncWallpaper();
});
