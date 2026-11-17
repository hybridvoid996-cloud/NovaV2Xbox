// A buffering notification is not playback progress. Repeated notifications
// must not keep extending the deadline for a stalled player.
export function createTubeLoadingGuard({isCurrent=()=>true,setLoading,onTimeout,timeout=15000,schedule=setTimeout,cancel=clearTimeout}){
 let timer,waiting=false,stopped=false;
 const clear=()=>{if(timer!==undefined)cancel(timer);timer=undefined;waiting=false};
 return {
  wait({overlay=false}={}){
   if(stopped||!isCurrent())return;
   setLoading(overlay);
   if(waiting)return;
   waiting=true;
   timer=schedule(()=>{
    clear();
    if(stopped||!isCurrent())return;
    setLoading(false);
    onTimeout();
   },timeout);
  },
  reveal(){if(!stopped&&isCurrent())setLoading(false)},
  ready(){clear();if(!stopped&&isCurrent())setLoading(false)},
  stop(){stopped=true;clear()}
 };
}

// YouTube's onReady/unstarted notifications only mean its API loaded. They
// must not cancel recovery while the actual video remains black/unstarted.
export function observeTubePlayback(guard,data,lastTime=0){
 const delivery=['infoDelivery','initialDelivery'].includes(data?.event);
 const time=delivery&&Number.isFinite(data.info?.currentTime)?data.info.currentTime:lastTime;
 const state=data?.event==='onStateChange'?Number(data.info):delivery&&data.info?.playerState!=null?Number(data.info.playerState):NaN;
 const progress=time>lastTime,blocked=data?.event==='onAutoplayBlocked';
 if(blocked||progress||[0,1,2].includes(state))guard?.ready();
 else if(state===3)guard?.wait();
 else if(data?.event==='onReady'||delivery||[-1,5].includes(state))guard?.reveal();
 return {state,time,progress,blocked};
}
