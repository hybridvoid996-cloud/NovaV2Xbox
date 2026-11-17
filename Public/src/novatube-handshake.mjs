const nativePostMessage=typeof window==='undefined'?null:window.postMessage;
export function postTubeMessage(frame,data,origin='*'){
 const target=frame.contentWindow;if(!target)return;
 const proxied=String(frame.getAttribute?.('src')||'').includes('/~/sj/p/');
 const payload=proxied?{$scramjet$messagetype:'window',$scramjet$origin:location.origin,$scramjet$data:JSON.stringify(data)}:JSON.stringify(data);
 if(nativePostMessage)nativePostMessage.call(target,payload,origin);else target.postMessage(payload,origin);
}
// Call only after verifying the exact player window and its allowed origin.
export function decodeTubeMessage(value){
 for(let i=0;i<5;i++){
  if(typeof value==='string'){try{value=JSON.parse(value)}catch{return null}}
  if(!value||typeof value!=='object')return null;
  if(value.$scramjet$messagetype==='window'&&Object.hasOwn(value,'$scramjet$data')){value=value.$scramjet$data;continue}
  return value;
 }
 return null;
}
export function normalizeTubeChannelTarget(value){
 let target=String(value||'').trim();
 if(/^https?:/.test(target)){try{const u=new URL(target);if(!['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(u.hostname))return '';target=u.pathname}catch{return ''}}
 target=target.replace(/^\/?channel\//,'').replace(/^\//,'').split(/[/?#]/)[0];
 return /^(UC[A-Za-z0-9_-]{22}|@[A-Za-z0-9._-]{1,40})$/.test(target)?target:'';
}
export function createTubeHandshake({frame,origin='*',schedule=setInterval,cancel=clearInterval}){
 let timer,stopped=false,responded=false;
 const send=()=>{if(stopped||responded)return;try{postTubeMessage(frame,{event:'listening',id:'nova-tube'},origin);for(const event of ['onError','onStateChange','onAutoplayBlocked'])postTubeMessage(frame,{event:'command',func:'addEventListener',args:[event]},origin)}catch{}};
 return {start(){if(stopped||responded)return;cancel(timer);send();timer=schedule(send,500)},accept(data){const info=data?.info;const valid=data?.event==='onReady'||data?.event==='onAutoplayBlocked'||data?.event==='onStateChange'&&[-1,0,1,2,3,5].includes(Number(info))||['infoDelivery','initialDelivery'].includes(data?.event)&&info&&typeof info==='object'&&(Number.isFinite(info.currentTime)||Number.isFinite(info.duration)||[-1,0,1,2,3,5].includes(info.playerState)||typeof info.videoData?.video_id==='string');if(!valid||responded||stopped)return false;responded=true;cancel(timer);return true},stop(){stopped=true;cancel(timer)}};
}
