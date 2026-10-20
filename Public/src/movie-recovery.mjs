// Retry only initial playback. Once media is ready, never interrupt a paused or playing film.
export function createMovieRecovery({launch,onState,timeout=25000,maxStartup=60000,maxAttempts=3,schedule=setTimeout,cancel=clearTimeout}){
 let generation=0,attempt=0,timer,limit,cleanup;
 function clear(){cancel(timer);cancel(limit);timer=limit=undefined;cleanup?.();cleanup=undefined}
 function stop(){generation++;clear()}
 function run(){
  const token=++generation;clear();attempt++;let phase='loading',interactive=false;
  const current=()=>token===generation&&phase!=='failed';
  function fail(allowReady=false){if(!current()||phase!=='loading'&&!(allowReady&&phase==='ready'))return;phase='failed';cancel(timer);cancel(limit);cleanup?.();cleanup=undefined;
   if(attempt>=maxAttempts){onState('error',attempt);return}
   onState('reconnecting',attempt+1);timer=schedule(()=>{if(token===generation)run()},1000*attempt);
  }
  const ready=()=>{if(!current()||phase!=='loading')return;phase='ready';cancel(timer);cancel(limit);onState('ready',attempt)};
  const hold=()=>{if(!current()||phase!=='loading')return;interactive=true;cancel(timer);cancel(limit);onState('interactive',attempt)};
  const progress=()=>{if(!current()||phase!=='loading'||interactive)return;cancel(timer);timer=schedule(fail,timeout)};
  onState('loading',attempt);progress();limit=schedule(fail,maxStartup);
  Promise.resolve().then(()=>launch({attempt,current,ready,progress,hold,fail,lost:()=>fail(true)})).then(dispose=>{if(!current()){dispose?.();return}cleanup=dispose}).catch(()=>fail());
 }
 return {start(){stop();attempt=0;run()},stop};
}
