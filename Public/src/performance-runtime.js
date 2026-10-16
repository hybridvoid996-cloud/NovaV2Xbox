/* Stop decorative work behind an active game/app without resetting its state. */
(()=>{
 const panel=document.getElementById('panel'),video=document.getElementById('bg-video');
 let lastVisible;
 const lightEffects=()=>{const saved=localStorage.getItem('nova_performance_mode');return saved==='true'||(saved!=='false'&&(window.innerWidth<=1500||(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory>0&&navigator.deviceMemory<=4)));};
 const staticWallpaper=()=>localStorage.getItem('nova_performance_mode')==='true'||localStorage.getItem('nova_reduce_motion')==='true';

 const backgroundVisible=()=>{if(document.hidden||document.querySelector?.('.os-window.os-maximized:not([hidden])'))return false;if(!panel||panel.hidden)return true;if(panel.dataset.view==='search'){try{return !document.getElementById('system')?.contentDocument?.getElementById('newtab')?.hidden}catch{return false}}return false};
 function update(){
  const visible=backgroundVisible();document.body.classList.toggle('nova-light-effects',lightEffects());document.body.classList.toggle('nova-content-active',document.hidden||!!panel&&!panel.hidden);
  if(visible!==lastVisible){lastVisible=visible;dispatchEvent(new CustomEvent('nova-background-visibility',{detail:{visible}}));}
  if(!video)return;
  if(!visible||staticWallpaper()||video.hidden||localStorage.getItem('nova_grad')||localStorage.getItem('nova_performance_mode')==='true'||localStorage.getItem('nova_reduce_motion')==='true')video.pause();
  video.style.visibility='';
  if(staticWallpaper()&&video.readyState>=1&&video.readyState<2&&video.currentTime===0&&video.duration>0)video.currentTime=Math.min(.1,video.duration/2);
  if(visible&&!staticWallpaper()&&!video.hidden&&!localStorage.getItem('nova_grad')&&localStorage.getItem('nova_performance_mode')!=='true'&&localStorage.getItem('nova_reduce_motion')!=='true'&&video.paused)video.play().catch(()=>{});
 }
 addEventListener('message',event=>{if(event.origin===location.origin&&event.source===document.getElementById('system')?.contentWindow&&event.data?.novaAction==='searchBackgroundChanged')update()});
 window.NovaPerformance={backgroundVisible,update,staticWallpaper};
 if(panel)new MutationObserver(update).observe(panel,{attributes:true,attributeFilter:['hidden','data-view']});
 addEventListener('resize',update);video?.addEventListener('loadedmetadata',update);document.addEventListener('visibilitychange',update);addEventListener('nova-os-windows',update);addEventListener('storage',update);video?.addEventListener('play',()=>{if(!backgroundVisible()||staticWallpaper())video.pause()});update();
})();
