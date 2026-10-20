import {readGameLoading} from './game-loading-health.mjs?v=20261020-health210';

// A document load event is not engine readiness. Wait out visible game loaders.
export function watchGameLaunch(frame,{signal,onReady,onProgress=()=>{},interval=200}={}){
 let stopped=false;
 const scan=(doc,depth=0)=>{
  if(!doc?.body||doc.URL==='about:blank'||depth>5)return {waiting:true};
  const loading=readGameLoading(doc);
  if(loading){const percent=loading.text.match(/\b(\d+(?:\.\d+)?)\s*%/);return {waiting:true,text:loading.text||'Loading game files…',percent:!loading.error&&percent?Math.min(99,Number(percent[1])):undefined}}
  for(const child of doc.querySelectorAll('iframe')){
   const rect=child.getBoundingClientRect();if(rect.width<160||rect.height<90)continue;
   try{const state=scan(child.contentDocument,depth+1);if(state.waiting)return state}catch{}
  }
  return {waiting:doc.readyState!=='complete'};
 };
 const tick=()=>{if(stopped||signal?.aborted)return;try{const state=scan(frame.contentDocument);if(state.waiting){onProgress(state);return}stop();onReady()}catch{onProgress({waiting:true,text:'Waiting for the game provider…'})}};
 const stop=()=>{stopped=true;clearInterval(timer);signal?.removeEventListener('abort',stop)};
 const timer=setInterval(tick,interval);signal?.addEventListener('abort',stop,{once:true});tick();return stop;
}
