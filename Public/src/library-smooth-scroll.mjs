/** Mouse-wheel easing only. Touch and precise trackpad scrolling remain native. */
export function mountLibraryScroll(host,{reduced=()=>false}={}){
 let frame=0,target=0,last=0,ownScroll=false;
 const stop=()=>{cancelAnimationFrame(frame);frame=0;last=0;target=host.scrollTop};
 const limit=()=>Math.max(0,host.scrollHeight-host.clientHeight);
 const tick=time=>{if(host.hidden||document.hidden||reduced()){stop();return}const dt=last?Math.min(40,time-last):16.7;last=time;target=Math.max(0,Math.min(limit(),target));const gap=target-host.scrollTop;ownScroll=true;host.scrollTop=Math.abs(gap)<.7?target:host.scrollTop+gap*(1-Math.exp(-dt/65));ownScroll=false;if(Math.abs(target-host.scrollTop)>.7)frame=requestAnimationFrame(tick);else{frame=0;last=0}};
 const wheel=e=>{
  if(e.ctrlKey||e.shiftKey||reduced()||matchMedia('(prefers-reduced-motion:reduce)').matches||!e.cancelable||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
  // Small/fractional deltas already carry the trackpad's own momentum.
  if(e.deltaMode===0&&(Math.abs(e.deltaY)<40||!Number.isInteger(e.deltaY)))return;
  for(let el=e.target instanceof Element?e.target:null;el&&el!==host;el=el.parentElement){if(el.matches('input,textarea,select,[contenteditable=true]'))return;const style=getComputedStyle(el);if(/auto|scroll/.test(style.overflowY)&&el.scrollHeight>el.clientHeight+1)return;if(/auto|scroll/.test(style.overflowX)&&el.scrollWidth>el.clientWidth+1)return}
  const delta=e.deltaY*(e.deltaMode===1?18:e.deltaMode===2?host.clientHeight:1);if(!delta||!limit())return;
  e.preventDefault();if(!frame)target=host.scrollTop;target=Math.max(0,Math.min(limit(),target+delta));if(!frame)frame=requestAnimationFrame(tick);
 };
 host.addEventListener('wheel',wheel,{passive:false});host.addEventListener('pointerdown',stop,{passive:true});host.addEventListener('keydown',stop);document.addEventListener('visibilitychange',stop);addEventListener('pagehide',stop);
 return stop;
}
