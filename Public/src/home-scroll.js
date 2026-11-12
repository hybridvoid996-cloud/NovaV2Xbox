(() => {
  const bar=document.createElement('div');bar.className='home-scroll-track';
  const thumb=document.createElement('div');thumb.className='home-scroll-thumb';thumb.tabIndex=0;thumb.setAttribute('role','scrollbar');thumb.setAttribute('aria-label','Scroll Home');thumb.setAttribute('aria-orientation','vertical');thumb.setAttribute('aria-valuemin','0');thumb.setAttribute('aria-valuemax','100');
  bar.append(thumb);document.body.append(bar);
  const root=()=>document.scrollingElement;
  const max=()=>Math.max(0,root().scrollHeight-root().clientHeight);
  function paint(){const limit=max();bar.hidden=!limit||document.body.classList.contains('xbox-panel-open')||!!document.fullscreenElement;const ratio=limit?root().scrollTop/limit:0;thumb.style.top=ratio*Math.max(0,bar.clientHeight-thumb.offsetHeight)+'px';thumb.setAttribute('aria-valuenow',String(Math.round(ratio*100)));}
  let drag;
  thumb.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();drag={y:e.clientY,scroll:root().scrollTop};thumb.setPointerCapture(e.pointerId);});
  thumb.addEventListener('pointermove',e=>{if(!drag)return;root().scrollTop=drag.scroll+(e.clientY-drag.y)/Math.max(1,bar.clientHeight-thumb.offsetHeight)*max();});
  thumb.addEventListener('pointerup',()=>drag=null);thumb.addEventListener('lostpointercapture',()=>drag=null);
  thumb.addEventListener('keydown',e=>{const moves={ArrowDown:60,ArrowUp:-60,PageDown:innerHeight*.8,PageUp:-innerHeight*.8,Home:-max(),End:max()};if(e.key in moves){e.preventDefault();root().scrollTop+=moves[e.key];}});
  bar.addEventListener('pointerdown',e=>{if(e.target!==bar)return;root().scrollTop=(e.clientY-bar.getBoundingClientRect().top-thumb.offsetHeight/2)/Math.max(1,bar.clientHeight-thumb.offsetHeight)*max();});
  // One measurement per frame: scroll, resize and class changes can fire many times between paints.
  let queued=0;const schedule=()=>{if(!queued)queued=requestAnimationFrame(()=>{queued=0;paint()})};
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);addEventListener('fullscreenchange',schedule);new ResizeObserver(schedule).observe(document.body);new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});paint();
})();
