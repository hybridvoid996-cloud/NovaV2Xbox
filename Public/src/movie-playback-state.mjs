import {isMovieProviderError} from './movie-provider-error.mjs?v=20261027-movie336';
// Provider players can live several frames below the watch page.
export function readMoviePlayback(frame){
 const visited=new Set();let best=null,providerError=false;
 function scan(doc,depth){
  if(!doc||visited.has(doc)||depth>6)return;visited.add(doc);
  try{
   if(isMovieProviderError(doc.body?.innerText||'',doc.title||''))providerError=true;
   for(const video of doc.querySelectorAll('video')){
    const rect=video.getBoundingClientRect(),style=doc.defaultView.getComputedStyle(video);
    if(rect.width<160||rect.height<90||style.display==='none'||style.visibility==='hidden')continue;
    const area=rect.width*rect.height;
    if(!best||area>best.area)best={area,ready:video.readyState>=2,currentTime:video.currentTime,duration:video.duration,ended:video.ended,error:!!video.error};
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
 return best?.ready&&!best.error?best:providerError?{...best,ready:false,error:true,providerError:true}:best;
}
