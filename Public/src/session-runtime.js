/* Cooperative suspension for retained player documents. No polling or save resets. */
(()=>{
 const states=new WeakMap();
 function install(win){
  try{if(states.has(win.document))return states.get(win.document);const doc=win.document;
   const native={timeout:win.setTimeout.bind(win),clear:win.clearTimeout.bind(win),raf:win.requestAnimationFrame.bind(win),cancel:win.cancelAnimationFrame.bind(win)};
   doc.documentElement.dataset.novaSessionState='active';const pauseStyle=doc.createElement?.('style');if(pauseStyle){pauseStyle.textContent='html[data-nova-session-state="paused"] *,html[data-nova-session-state="paused"] *::before,html[data-nova-session-state="paused"] *::after{animation-play-state:paused!important}';(doc.head||doc.documentElement).appendChild(pauseStyle)}let paused=false;const timers=new Map(),frames=new Map(),media=new Set(),contexts=new Set(),runningContexts=new Set(),animations=new Set();
   const now=win.performance.now.bind(win.performance);let suspendedTime=0,pauseStarted=0;
   // Preserve the simulation clock so returning does not produce a huge frame delta.
   try{Object.defineProperty(win.performance,'now',{configurable:true,value:()=>now()-suspendedTime-(paused?now()-pauseStarted:0)})}catch{}
   function arm(task){task.started=now();task.native=native.timeout(()=>{task.native=null;if(paused)return;if(!task.repeat)timers.delete(task.id);else{task.remaining=task.delay;arm(task)}typeof task.fn==='function'?task.fn.apply(win,task.args):win.eval(String(task.fn))},task.remaining)}
   function schedule(fn,delay,args,repeat){const number=Number(delay),ms=Number.isFinite(number)?Math.min(2147483647,Math.max(repeat?1:0,number)):0;const task={id:null,fn,args,delay:ms,remaining:ms,repeat,native:null};if(!paused){arm(task);task.id=task.native}else{task.id=native.timeout(()=>{},2147483647);native.clear(task.id)}timers.set(task.id,task);return task.id}
   win.setTimeout=(fn,delay,...args)=>schedule(fn,delay,args,false);win.setInterval=(fn,delay,...args)=>schedule(fn,delay,args,true);
   const clear=key=>{const task=timers.get(key);if(task){if(task.native!==null)native.clear(task.native);timers.delete(key)}else native.clear(key)};win.clearTimeout=win.clearInterval=clear;
   function armFrame(task){task.native=native.raf(time=>{task.native=null;if(paused)return;frames.delete(task.id);task.fn(time-suspendedTime)})}
   win.requestAnimationFrame=fn=>{const task={id:null,fn,native:null};if(!paused){armFrame(task);task.id=task.native}else{task.id=native.raf(()=>{});native.cancel(task.id)}frames.set(task.id,task);return task.id};win.cancelAnimationFrame=key=>{const task=frames.get(key);if(task){if(task.native!==null)native.cancel(task.native);frames.delete(key)}else native.cancel(key)};
   for(const name of ['AudioContext','webkitAudioContext']){const Constructor=win[name];if(typeof Constructor!=='function')continue;try{win[name]=new Proxy(Constructor,{construct(target,args,newTarget){const context=Reflect.construct(target,args,newTarget);contexts.add(context);if(paused&&context.state==='running'){runningContexts.add(context);context.suspend().catch(()=>{})}return context}})}catch{}}
   const mediaPlay=win.HTMLMediaElement?.prototype.play;
   if(mediaPlay)win.HTMLMediaElement.prototype.play=function(...args){if(paused){media.add(this);return Promise.resolve()}return mediaPlay.apply(this,args)};
   const audioResume=win.BaseAudioContext?.prototype.resume||win.AudioContext?.prototype.resume;
   // Keep audio engines that try to restart themselves asleep until this view returns.
   if(audioResume&&win.AudioContext?.prototype)try{win.AudioContext.prototype.resume=function(...args){contexts.add(this);if(paused){runningContexts.add(this);return Promise.resolve()}return audioResume.apply(this,args)}}catch{}
   const hidden=Object.getOwnPropertyDescriptor(win.Document.prototype,'hidden')?.get,visibility=Object.getOwnPropertyDescriptor(win.Document.prototype,'visibilityState')?.get;
   try{Object.defineProperty(doc,'hidden',{configurable:true,get:()=>paused||!!hidden?.call(doc)});Object.defineProperty(doc,'visibilityState',{configurable:true,get:()=>paused?'hidden':visibility?.call(doc)||'visible'})}catch{}
   function setSuspended(value){if(paused===value)return;if(value)pauseStarted=now();else suspendedTime+=now()-pauseStarted;paused=value;doc.documentElement.dataset.novaSessionState=paused?'paused':'active';
    if(paused){for(const task of timers.values())if(task.native!==null){native.clear(task.native);task.native=null;task.remaining=Math.max(0,task.remaining-(now()-task.started))}for(const task of frames.values())if(task.native!==null){native.cancel(task.native);task.native=null}for(const el of doc.querySelectorAll('audio,video'))if(!el.paused&&!el.ended){media.add(el);el.pause()}for(const context of contexts)if(context.state==='running'){runningContexts.add(context);context.suspend().then(()=>{if(!paused&&context.state!=='closed')audioResume?.call(context).catch(()=>{})}).catch(()=>{})}for(const animation of doc.getAnimations?.()||[])if(animation.playState==='running'){animations.add(animation);animation.pause()}}
    else{for(const task of timers.values())if(task.native===null)arm(task);for(const task of frames.values())if(task.native===null)armFrame(task);for(const el of media)if(el.isConnected)mediaPlay?.call(el).catch(()=>{});media.clear();for(const context of runningContexts)if(context.state!=='closed')audioResume?.call(context).catch(()=>{});runningContexts.clear();for(const animation of animations)try{animation.play()}catch{}animations.clear()}
    doc.dispatchEvent(new win.Event('visibilitychange'));win.dispatchEvent(new win.Event(paused?'blur':'focus'));win.dispatchEvent(new win.CustomEvent('nova-session-state',{detail:{paused}}));
   }
   const state={setSuspended,get paused(){return paused}};states.set(doc,state);
   doc.addEventListener('play',event=>{if(paused&&event.target.pause){media.add(event.target);event.target.pause()}},true);
   doc.addEventListener('load',event=>{if(event.target.tagName==='IFRAME')try{tree(event.target.contentWindow,paused)}catch{}},true);
   return state;
  }catch{return null}
 }
 function tree(win,paused,visited=new Set()){if(!win||visited.has(win))return;visited.add(win);try{install(win)?.setSuspended(paused);for(const frame of win.document.querySelectorAll('iframe'))tree(frame.contentWindow,paused||!!frame.hidden,visited)}catch{}}
 window.NovaSessionRuntime={install,tree};
 // Player is the control boundary; the Home interface and Nova Music stay independent.
 if(/\/(?:player|search|novatube|novamovies)\.html$/.test(location.pathname)){const state=install(window);window.NovaSessionRuntime.attachChild=child=>tree(child,!!state?.paused||[...document.querySelectorAll('iframe')].some(frame=>frame.contentWindow===child&&frame.hidden));window.NovaSessionRuntime.setSuspended=value=>tree(window,!!value)}
})();
