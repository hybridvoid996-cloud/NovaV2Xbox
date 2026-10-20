import {waitForZombsEngine} from './zombs-engine-ready.mjs?v=20261020-socket206';
export function isZombsMatchSocket(url){try{const u=new URL(url);if(u.protocol!=='wss:'||u.port&&u.port!=='443'||u.hash||u.username||u.password)return false;const match=/^zombs-[a-f0-9]{6,32}-\d{1,3}\.eggs\.gg$/.test(u.hostname)&&u.pathname==='/'&&!u.search;const ping=/^pinger-(?:uswest|useast|europe|asia|oceania)\.eggs\.gg$/.test(u.hostname)&&u.pathname==='/'&&!u.search;const gateway=u.hostname==='mason-ipv4.zombsroyale.io'&&u.pathname==='/gateway/'&&u.searchParams.get('EIO')==='4'&&u.searchParams.get('transport')==='websocket'&&[...u.searchParams.keys()].length===2;return match||ping||gateway}catch{return false}}
export function connectZombsSocket(url,protocols,headers,onopen,onmessage,onclose,onerror,{WebSocketClass=WebSocket,origin=location.origin,engineReady=()=>typeof document==='undefined'?Promise.resolve():waitForZombsEngine()}={}){
 const bridge=new URL('/api/zombs-socket',origin);
 bridge.protocol=bridge.protocol==='https:'?'wss:':'ws:';
 bridge.searchParams.set('target',new URL(url).href);
 let socket,opened=false,ended=false,closing=false,retries=0,retryTimer;
 const cookie=headers.find(([name])=>name.toLowerCase()==='cookie')?.[1]||'';
 const finish=(code,reason)=>{if(ended)return;ended=true;onclose(code,reason)};
 const close=(code=1000,reason='')=>{
  if(ended||closing)return;
  closing=true;opened=false;clearTimeout(retryTimer);
  if(!socket){finish(code,reason);return}
  try{socket.close(code,reason)}catch{socket.close()}
 };
 // Finish compilation before starting the server's time-sensitive join challenge.
 const connect=()=>{
  if(ended||closing)return;
  socket=new WebSocketClass(bridge.href);
  socket.binaryType='arraybuffer';
  socket.onopen=()=>{if(!ended&&!closing)socket.send(JSON.stringify({type:'connect',cookie}))};
  socket.onmessage=event=>{
   if(ended||closing||socket.readyState!==1)return;
   if(!opened){
    try{if(JSON.parse(event.data).type!=='ready')throw Error()}
    catch{onerror('The Nova match relay could not connect.');close();return}
    opened=true;onopen('','');return
   }
   // Deliver in native event order, without holding join packets behind async work.
   onmessage(event.data)
  };
  socket.onerror=()=>{if(!ended&&!closing&&opened)onerror('The Nova match relay could not connect. Try another region.')};
  socket.onclose=event=>{
   if(!ended&&!closing&&!opened&&retries<1&&[1006,1011,1013].includes(event.code)){retries++;retryTimer=setTimeout(connect,150);return}
   if(!ended&&!closing&&!opened&&event.code!==1000)onerror('The Nova match relay could not connect. Try another region.');
   finish(event.code,event.reason)
  };
 };
 Promise.resolve().then(engineReady).then(connect).catch(error=>{if(ended||closing)return;onerror(error.message);close()});
 return [data=>{if(!ended&&!closing&&opened&&socket?.readyState===1)socket.send(data)},close]
}

// Wake the hosted relay while the menu loads, without opening a match socket.
export async function warmZombsRelay(request=fetch){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);
 try{await request('/api/zombs-socket?warm=1',{cache:'no-store',credentials:'omit',signal:abort.signal})}catch{}finally{clearTimeout(timer)}
}
