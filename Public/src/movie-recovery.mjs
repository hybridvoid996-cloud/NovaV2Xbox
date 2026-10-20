// Retry only initial playback. Once media is ready, never interrupt a paused or playing film.
export function createMovieRecovery({launch,onState,timeout=25000,maxAttempts=3,schedule=setTimeout,cancel=clearTimeout}){
 let generation=0,attempt=0,timer,cleanup;
 function clear(){cancel(timer);timer=undefined;cleanup?.();cleanup=undefined}
 function stop(){generation++;clear()}
 function run(){
  const token=++generation;clear();attempt++;let phase='loading';
  const current=()=>token===generation&&phase!=='failed';
  function fail(allowReady=false){if(!current()||phase!=='loading'&&!(allowReady&&phase==='ready'))return;phase='failed';cancel(timer);cleanup?.();cleanup=undefined;
   if(attempt>=maxAttempts){onState('error',attempt);return}
   onState('reconnecting',attempt+1);timer=schedule(()=>{if(token===generation)run()},1000*attempt);
  }
  const ready=()=>{if(!current()||phase!=='loading')return;phase='ready';cancel(timer);onState('ready',attempt)};
  onState('loading',attempt);timer=schedule(fail,timeout);
  Promise.resolve().then(()=>launch({attempt,current,ready,fail,lost:()=>fail(true)})).then(dispose=>{if(!current()){dispose?.();return}cleanup=dispose}).catch(()=>fail());
 }
 return {start(){stop();attempt=0;run()},stop};
}
