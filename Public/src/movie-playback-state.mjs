import {isMovieProviderError} from './movie-provider-error.mjs?v=20261114-movies1';
// Provider players can live several frames below the watch page.
export function readMoviePlayback(frame,session=''){
 const visited=new Set();let best=null,providerError=false,interactive=false,awaitingUser=false,userPlay=false;
 function scan(doc,depth){
  if(!doc||visited.has(doc)||depth>6)return;visited.add(doc);
  try{
   const bridge=doc.documentElement?.dataset;
   if(session&&bridge?.novaMovieToken===session&&Math.abs(Date.now()-Number(bridge.novaMovieHeartbeat))<15000){
    const action=bridge.novaMovieAction;
    if(action==='novaMovieInteractive'){interactive=true;awaitingUser=bridge.novaMovieAwaitingUser==='true'}
    if(action==='novaMovieUserPlay')userPlay=true;
    if(action==='novaMovieError'||action==='novaMovieStalled')providerError=true;
    if(action==='novaMovieReady'||action==='novaMovieTime'&&Number(bridge.novaMovieTime)>0){if(!best||best.rank<1)best={rank:1,area:0,ready:true,error:false,currentTime:Number(bridge.novaMovieTime)||0,duration:Number(bridge.novaMovieDuration)||undefined}}
   }
   if(isMovieProviderError(doc.body?.innerText||'',doc.title||''))providerError=true;
   for(const video of doc.querySelectorAll('video')){
    const rect=video.getBoundingClientRect(),style=doc.defaultView.getComputedStyle(video);
    if(rect.width<160||rect.height<90||style.display==='none'||style.visibility==='hidden')continue;
    const area=rect.width*rect.height,rank=!video.error&&video.readyState>=2?2:0;
    if(!best||rank>best.rank||rank===best.rank&&area>best.area)best={rank,area,ready:video.readyState>=2,currentTime:video.currentTime,duration:video.duration,ended:video.ended,error:!!video.error};
   }
   for(const child of doc.querySelectorAll('iframe')){
    const rect=child.getBoundingClientRect(),style=doc.defaultView.getComputedStyle(child);
    if(rect.width<160||rect.height<90||style.display==='none'||style.visibility==='hidden')continue;
    try{scan(child.contentDocument,depth+1)}catch{}
   }
  }catch{}
 }
 try{scan(frame.contentDocument,0)}catch{}
 // An unrelated broken frame must never replace a healthy movie.
 return best?.ready&&!best.error?best:providerError?{...best,ready:false,error:true,providerError:true}:best||interactive||userPlay?{...best,interactive,awaitingUser,userPlay}:null;
}
