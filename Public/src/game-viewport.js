/* Fit desktop Unity templates without restarting or resizing WebGL buffers. */
const novaViewportBindings=new WeakMap();
window.NovaGameViewport={attach(doc){
 if(novaViewportBindings.has(doc)){novaViewportBindings.get(doc)();return}
 const win=doc.defaultView;let pending=0,base;
 function fit(){pending=0;const legacy=doc.getElementById('gameContainer'),container=doc.getElementById('unity-container')||legacy,canvas=doc.getElementById('unity-canvas')||container?.querySelector('canvas');if(!container||!canvas)return;observer.disconnect();if(doc.fullscreenElement){canvas.style.removeProperty('width');canvas.style.removeProperty('height');return;}
  if(legacy){for(const node of [doc.documentElement,doc.body,doc.querySelector('.webgl-content'),legacy].filter(Boolean)){for(const [key,value]of Object.entries({margin:'0',padding:'0',width:'100%',height:'100%',overflow:'hidden'}))node.style.setProperty(key,value,'important')}for(const node of [doc.querySelector('.webgl-content'),legacy].filter(Boolean)){for(const [key,value]of Object.entries({position:'fixed',inset:'0',top:'0',left:'0',transform:'none'}))node.style.setProperty(key,value,'important')}canvas.style.setProperty('width','100%','important');canvas.style.setProperty('height','100%','important');canvas.style.setProperty('display','block','important');return;}
  if(!base||base.canvas!==canvas){const css=win.getComputedStyle(canvas);base={canvas,width:parseFloat(css.width)||canvas.width||1280,height:parseFloat(css.height)||canvas.height||720}}
  const footer=doc.getElementById('unity-footer'),footerHeight=footer?Math.max(0,footer.getBoundingClientRect().height/(Number(container.dataset.novaFitScale)||1)):0;
  const width=win.innerWidth,height=win.innerHeight,scale=Math.min(width/base.width,height/(base.height+footerHeight));if(!Number.isFinite(scale)||scale<=0)return;
  doc.documentElement.style.setProperty('overflow','hidden','important');doc.body.style.setProperty('overflow','hidden','important');doc.body.style.setProperty('margin','0','important');
  const styles={position:'fixed',left:'50%',top:'50%',width:base.width+'px',height:(base.height+footerHeight)+'px',margin:'0',transform:'translate(-50%, -50%) scale('+scale+')','transform-origin':'center center'};
  for(const [key,value]of Object.entries(styles))container.style.setProperty(key,value,'important');
  canvas.style.setProperty('width',base.width+'px','important');canvas.style.setProperty('height',base.height+'px','important');canvas.style.setProperty('display','block','important');container.dataset.novaFitScale=String(scale);
 }
 function schedule(){if(!pending)pending=win.requestAnimationFrame(fit)}
 novaViewportBindings.set(doc,schedule);
 const observer=new win.MutationObserver(schedule);observer.observe(doc.body,{childList:true,subtree:true});win.addEventListener('resize',schedule);doc.addEventListener('fullscreenchange',schedule);schedule();
 win.addEventListener('pagehide',()=>{novaViewportBindings.delete(doc);observer.disconnect();if(pending)win.cancelAnimationFrame(pending);win.removeEventListener('resize',schedule)},{once:true});
}};
