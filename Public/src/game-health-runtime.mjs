import {classifyGameIssue,reserveGameRetry} from './game-health.mjs?v=20261020-health209';
import {readGameLoading,createLoadingWatch} from './game-loading-health.mjs?v=20261020-health210';

// Observe each accessible frame, including native emulators, without replacing engine APIs.
export function attachGameHealth(frame,{key,signal,onStatus=()=>{},reload=()=>location.reload(),storage=sessionStorage,interval=500}={}){
 const attached=new WeakSet(),loadingWatches=new WeakMap(),stops=[];let interacted=false,lastProgress=Date.now(),lastIssue='',retrying=false;
 const progress=()=>{lastProgress=Date.now();for(const doc of loadingDocs){loadingWatches.get(doc)?.progress()}};
 const loadingDocs=new Set();
 const report=issue=>{
  if(signal?.aborted||retrying)return;
  // Optional ads, telemetry and region probes can fail while gameplay is healthy.
  if(['connection','socket','asset'].includes(issue.kind)&&![...loadingDocs].some(doc=>readGameLoading(doc)?.error)&&!issue.confirmed)return;
  if(issue.kind===lastIssue)return;lastIssue=issue.kind;
  onStatus(interacted&&issue.retry?issue.message.replace(/Retrying (?:its )?startup…/i,'Use Retry game to reconnect.'):issue.message,issue.kind);
  if(issue.retry&&!interacted&&reserveGameRetry(storage,key)){retrying=true;const timer=setTimeout(()=>{if(!signal?.aborted)reload()},800);stops.push(()=>clearTimeout(timer))}
 };
 const watch=win=>{try{
  const doc=win.document;if(!doc?.documentElement||doc.URL==='about:blank')return;
  if(!attached.has(doc)){
   attached.add(doc);lastProgress=Date.now();
   loadingWatches.set(doc,createLoadingWatch());loadingDocs.add(doc);
   if(typeof win.PerformanceObserver==='function'){try{const observer=new win.PerformanceObserver(entries=>{if(entries.getEntries().some(entry=>entry.initiatorType!=='beacon'))progress()});observer.observe({type:'resource'});stops.push(()=>observer.disconnect())}catch{}}
   const listen=(target,event,fn,options)=>{target.addEventListener(event,fn,options);stops.push(()=>target.removeEventListener(event,fn,options))};
   listen(doc,'pointerdown',()=>{interacted=true},true);listen(doc,'keydown',()=>{interacted=true},true);
   listen(win,'error',event=>{if(event.error){const issue=classifyGameIssue(event.error);if(issue.kind!=='unknown')report(issue)}else if(event.target?.tagName==='SCRIPT'&&!event.target.async&&!event.target.defer)report({kind:'connection',retry:true,message:'A game script did not download. Retrying startup…'})},true);
   listen(win,'unhandledrejection',event=>{const issue=classifyGameIssue(event.reason);if(issue.kind!=='unknown')report(issue)});
   listen(doc,'webglcontextlost',event=>{event.preventDefault();onStatus('Graphics were interrupted. Waiting for the browser to restore them…','graphics');const timer=setTimeout(()=>report(classifyGameIssue('WebGL context lost')),5000);stops.push(()=>clearTimeout(timer));const restore=()=>{clearTimeout(timer);onStatus('Graphics restored.','restored')};event.target.addEventListener('webglcontextrestored',restore,{once:true});stops.push(()=>event.target.removeEventListener('webglcontextrestored',restore))},true);
   listen(doc,'load',progress,true);
   if(typeof win.WebSocket==='function'){
    const original=win.WebSocket;
    const monitored=new Proxy(original,{construct(Target,args){const socket=Reflect.construct(Target,args);let opened=false;
     socket.addEventListener('open',()=>{opened=true;lastProgress=Date.now()},{once:true});
     socket.addEventListener('close',event=>{if(event.code===1000)return;if(!opened)report(classifyGameIssue('WebSocket connection failed'));else report({kind:'socket',retry:false,message:'The game server disconnected. Use the game’s reconnect button or retry.'})},{once:true});
     return socket;
    }});
    win.WebSocket=monitored;stops.push(()=>{if(win.WebSocket===monitored)win.WebSocket=original});
   }
  }
  for(const child of doc.querySelectorAll('iframe'))if(child.contentWindow)watch(child.contentWindow);
  const loadingIssue=loadingWatches.get(doc)?.sample(readGameLoading(doc));
  if(loadingIssue){const detail=readGameLoading(doc);const known=classifyGameIssue(detail?.text);report(known.kind==='asset'||known.kind==='memory'||known.kind==='isolation'?known:loadingIssue)}
  const text=(doc.body?.textContent||'').slice(0,3001).trim();
  if(text.length<3000&&/^(?:Internal Service Worker Error:|Scramjet Error:)/.test(text))report({...classifyGameIssue('connection '+text),confirmed:true});
 }catch{}};
 const tick=()=>{if(signal?.aborted)return;if(document.hidden){progress();return}watch(frame.contentWindow);if(!interacted&&readGameLoading(frame.contentDocument)&&Date.now()-lastProgress>90000){lastProgress=Date.now();onStatus('The game is taking longer than expected. You can keep waiting or retry.','slow')}};
 const timer=setInterval(tick,interval);tick();
 document.addEventListener('visibilitychange',progress);
 const online=()=>{if(!interacted&&[...loadingDocs].some(doc=>readGameLoading(doc)))report({confirmed:true,kind:'connection',retry:true,message:'You’re back online. Reconnecting the game…'})};window.addEventListener('online',online);
 const stop=()=>{clearInterval(timer);document.removeEventListener('visibilitychange',progress);window.removeEventListener('online',online);stops.splice(0).forEach(fn=>fn());loadingDocs.clear()};signal?.addEventListener('abort',stop,{once:true});
 return {report,progress,stop};
}
