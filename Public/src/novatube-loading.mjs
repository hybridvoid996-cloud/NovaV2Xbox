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
