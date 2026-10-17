export function snapshotSeconds(value){const n=Number(value);if(!Number.isFinite(n)||n<10||n>86400)throw Error('Choose an interval from 10 seconds to 24 hours.');return Math.round(n)}
export function createSnapshotTimer({send,getBusy,isActive,onTick=()=>{},onError=()=>{},now=Date.now,schedule=setInterval,cancel=clearInterval}){
 let timer=null,due=0,interval=20,running=false,generation=0;
 function stop(){generation++;if(timer!==null)cancel(timer);timer=null;onTick('')}
 async function tick(){if(timer===null)return;if(!isActive()){stop();return}const remaining=Math.max(0,Math.ceil((due-now())/1000));onTick(running?'Answering snapshot…':remaining?'Next snapshot · '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'):getBusy()?'Waiting for current answer…':'Taking snapshot…');if(remaining||running||getBusy())return;const current=generation;running=true;try{await send();if(current===generation)due=now()+interval*1000}catch(error){if(current===generation){stop();onError(error)}}finally{running=false}}
 return {start(value){const seconds=snapshotSeconds(value);stop();interval=seconds;due=now()+seconds*1000;timer=schedule(tick,500);tick()},stop,get active(){return timer!==null}};
}
