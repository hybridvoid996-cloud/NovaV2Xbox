export function createNativeBrotliDecoder(){
 const worker=new Worker(new URL('./native-brotli-worker.mjs',import.meta.url),{type:'module'}),pending=new Map();let id=0,closed=false;
 function fail(error){for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(error);}pending.clear();}
 worker.onmessage=event=>{const entry=pending.get(event.data.id);if(!entry)return;pending.delete(event.data.id);clearTimeout(entry.timer);event.data.error?entry.reject(Error(event.data.error)):entry.resolve(event.data.bytes);};
 worker.onerror=()=>{closed=true;worker.terminate();fail(Error('The game decompressor could not start. Refresh to retry.'));};
 addEventListener('pagehide',()=>{closed=true;worker.terminate();fail(Error('Game closed.'));},{once:true});
 return bytes=>new Promise((resolve,reject)=>{if(closed)return reject(Error('Game decompressor closed.'));const key=++id,timer=setTimeout(()=>{closed=true;worker.terminate();fail(Error('Game decompression took too long. Refresh to retry.'));},60000);pending.set(key,{resolve,reject,timer});worker.postMessage({id:key,bytes},[bytes.buffer]);});
}
