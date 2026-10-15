export function createMusicRecovery({reload,enabled=()=>true,canResume=()=>true,notice=()=>{},exhausted=()=>{},online=()=>true,now=Date.now,schedule=setTimeout,cancel=clearTimeout}){
 let media=null,key='',attempts=0,timer=null,reloading=false,position=0,intent=false,lastProgress=now(),lastTime=0,healthySince=0,stopped=false,done=false;
 const clear=()=>{if(timer!==null)cancel(timer);timer=null;};
 function reset(){clear();attempts=0;done=false;reloading=false;position=0;lastTime=0;healthySince=0;lastProgress=now();intent=!!media&&(!media.paused||!!media.error);}
 function failed(){
  if(stopped||!media||!key||!enabled()||done)return;
  position=Math.max(position,Number(media.currentTime)||0);healthySince=0;
  if(!online()){notice('Waiting for your connection to return…');return;}
  if(timer!==null||reloading)return;
  if(attempts>=3){done=true;notice('This song could not load after three retries.');exhausted();return;}
  const current=media,currentKey=key;timer=schedule(()=>{timer=null;if(stopped||media!==current||key!==currentKey||!enabled())return;if(!online()){notice('Waiting for your connection to return…');return;}attempts++;reloading=true;lastProgress=now();notice('Reconnecting song…');try{reload(current,currentKey);}catch{reloading=false;failed();}},[1000,3000,8000][attempts]);
 }
 function ready(){if(!enabled()||!reloading)return;reloading=false;try{if(position>0&&Number.isFinite(media.duration))media.currentTime=Math.min(position,Math.max(0,media.duration-.1));}catch{}lastProgress=now();if(intent&&canResume()){Promise.resolve().then(()=>media.play()).catch(error=>{if(error.name==='NotAllowedError'){intent=false;notice('Press Play to allow audio in your browser.');}else failed();});}}
 function progressed(){if(!enabled()||!media)return;const time=Number(media.currentTime)||0;if(Math.abs(time-lastTime)>.05){lastTime=time;position=time;lastProgress=now();if(!healthySince)healthySince=now();if(now()-healthySince>=10000){attempts=0;done=false;}}}
 function play(){if(!enabled())return;intent=true;if(done)attempts=0;done=false;lastProgress=now();if(media.error)failed();}
 function pause(){if(enabled()&&(!reloading||media?.readyState>0)&&!media?.error){intent=false;clear();}}
 function playing(){if(!enabled())return;reloading=false;clear();intent=true;lastProgress=now();}
 const events={play,pause,playing,loadedmetadata:ready,canplay:ready,timeupdate:progressed};
 function bind(next,nextKey){if(next===media&&nextKey===key)return;if(media)for(const [event,fn]of Object.entries(events))media.removeEventListener(event,fn);const changed=nextKey!==key;clear();media=next;key=nextKey||'';reloading=false;if(changed)reset();else{intent=!!media&&!media.paused;lastProgress=now();}if(media)for(const [event,fn]of Object.entries(events))media.addEventListener(event,fn);}
 function check(){if(stopped||!enabled()||!media||done)return;if(media.error){reloading=false;failed();return;}progressed();if(intent&&!media.ended&&now()-lastProgress>=15000){reloading=false;failed();}}
 function reconnect(){if(!enabled()||!media)return;done=false;attempts=0;reloading=false;clear();if(intent||media.error)failed();}
 return {bind,failed,check,reconnect,dispose(){stopped=true;clear();if(media)for(const [event,fn]of Object.entries(events))media.removeEventListener(event,fn);media=null;}};
}

export async function retryMusicRequest(request,url,options={}){
 for(let attempt=0;;attempt++){
  try{const response=await request(url,options);if(attempt>=2||![408,429,500,502,503,504].includes(response.status))return response;await response.body?.cancel();}
  catch(error){if(options.signal?.aborted||error.name==='AbortError'||attempt>=2)throw error;}
  await new Promise((resolve,reject)=>{if(options.signal?.aborted)return reject(options.signal.reason||new DOMException('Cancelled','AbortError'));const abort=()=>{clearTimeout(timer);reject(options.signal.reason||new DOMException('Cancelled','AbortError'));};const timer=setTimeout(()=>{options.signal?.removeEventListener('abort',abort);resolve();},[500,1500][attempt]);options.signal?.addEventListener('abort',abort,{once:true});});
 }
}
