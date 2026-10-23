// Self contained so the same watchdog can run inside a proxied player frame.
export function createMovieStallRecovery({now=Date.now,exhausted=()=>{}}={}){
 const states=new WeakMap();
 return function check(video){
  let state=states.get(video);
  if(!state){state={time:video.currentTime,at:now(),attempts:0,healthy:now()};states.set(video,state);return}
  const time=Number(video.currentTime)||0;
  if(video.paused||video.ended||video.seeking){state.at=now();state.time=time;return}
  if(Math.abs(time-state.time)>.1){state.time=time;state.at=now();if(now()-state.healthy>30000)state.attempts=0;return}
  state.healthy=now();
  if(now()-state.at<12000||state.attempts>=3)return;
  state.at=now();state.attempts++;
  if(state.attempts===3){exhausted(video);return}
  // Retry the current position first: this lets an existing HLS engine recover.
  try{video.currentTime=time;Promise.resolve(video.play()).catch(()=>{})}catch{}
  // Native file streams can reconnect without changing title or provider.
  if(state.attempts===2&&/^https?:/.test(video.currentSrc||'')&&!/\.m3u8(?:\?|$)/i.test(video.currentSrc)){
   const resume=()=>{try{video.currentTime=time;Promise.resolve(video.play()).catch(()=>{})}catch{}};
   video.addEventListener('loadedmetadata',resume,{once:true});video.load();
  }
 };
}
