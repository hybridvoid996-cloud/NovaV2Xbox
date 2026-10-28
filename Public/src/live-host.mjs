// The highest same-origin Nova page owns broadcasts, including wrapped Home pages.
export function ownsLiveHost(win){
 if(win.__novaLiveActive)return false;let current=win;
 for(let depth=0;depth<12;depth++){
  let parent;try{parent=current.parent;if(!parent||parent===current)break;
   if(parent.__novaLiveActive||[...(parent.document?.scripts||[])].some(s=>/\/live-announcements\.js(?:\?|$)/.test(s.src||'')))return false;
  }catch{break}current=parent;
 }return true;
}
