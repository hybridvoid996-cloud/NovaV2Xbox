export function waitForMusicSource(media,previousSource='',{timeout=12000,interval=100}={}){
 return new Promise((resolve,reject)=>{const start=Date.now();const poll=()=>{const source=media.currentSrc||media.src||'';if(source&&source!==previousSource&&media.readyState>0&&!media.error){clearInterval(timer);resolve();}else if(Date.now()-start>=timeout){clearInterval(timer);reject(Error('The next song is taking too long to load. Use Re-sync to retry.'));}};const timer=setInterval(poll,interval);poll();});
}
