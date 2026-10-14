/* Stop decorative work behind an active game/app without resetting its state. */
(()=>{
 const panel=document.getElementById('panel'),video=document.getElementById('bg-video');
 let lastVisible;
 const lightEffects=()=>{const saved=localStorage.getItem('nova_performance_mode');return saved==='true'||(saved!=='false'&&(window.innerWidth<=1500||(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory>0&&navigator.deviceMemory<=4)));};
 const staticWallpaper=()=>lightEffects()&&!!video?.poster;

 const backgroundVisible=()=>!document.hidden&&(!panel||panel.hidden)&&!document.querySelector?.('.os-window.os-maximized:not([hidden])');
 function update(){
  const visible=backgroundVisible();document.body.classList.toggle('nova-light-effects',lightEffects());document.body.classList.toggle('nova-content-active',!visible);
  if(visible!==lastVisible){lastVisible=visible;dispatchEvent(new CustomEvent('nova-background-visibility',{detail:{visible}}));}
  if(!video)return;
  if(!visible||staticWallpaper()||video.hidden||localStorage.getItem('nova_grad')||localStorage.getItem('nova_performance_mode')==='true'||localStorage.getItem('nova_reduce_motion')==='true')video.pause();
  video.style.visibility=staticWallpaper()?'hidden':'';
  if(visible&&!staticWallpaper()&&!video.hidden&&!localStorage.getItem('nova_grad')&&localStorage.getItem('nova_performance_mode')!=='true'&&localStorage.getItem('nova_reduce_motion')!=='true'&&video.paused)video.play().catch(()=>{});
 }
 window.NovaPerformance={backgroundVisible,update,staticWallpaper};
 if(panel)new MutationObserver(update).observe(panel,{attributes:true,attributeFilter:['hidden']});
 addEventListener('resize',update);video?.addEventListener('loadedmetadata',update);document.addEventListener('visibilitychange',update);addEventListener('nova-os-windows',update);addEventListener('storage',update);video?.addEventListener('play',()=>{if(!backgroundVisible()||staticWallpaper())video.pause()});update();
})();
