export function relayOptions(iceServers=[]){
 const turn=iceServers.flatMap(server=>{const urls=[].concat(server.urls||[]).filter(url=>/^turns?:/.test(url));return urls.length?[{...server,urls}]:[]});
 const tls=turn.flatMap(server=>{const urls=server.urls.filter(url=>/^turns:.*:443(?:\?transport=tcp)?$/.test(url));return urls.length?[{...server,urls}]:[]});
 return {iceServers:tls.length?tls:turn,iceTransportPolicy:'relay'};
}
export async function retryVoiceRelay({peer,offerer,iceServers,signal,alive}){
 if(peer.pc.connectionState==='connected'){peer.retryPending=false;return 'ignored';}
 if(!alive()||peer.restarting||peer.restarts>=2)return 'ignored';
 const config=relayOptions(iceServers);if(!config.iceServers.length)return 'unavailable';
 if(offerer&&peer.pc.signalingState!=='stable'){peer.retryPending=true;return 'pending';}
 peer.retryPending=false;peer.restarting=true;peer.restarts++;
 try{
  peer.pc.setConfiguration(config);
  if(offerer){const offer=await peer.pc.createOffer({iceRestart:true});if(!alive())return 'ignored';await peer.pc.setLocalDescription(offer);if(!alive())return 'ignored';await signal({type:'offer',sdp:peer.pc.localDescription.sdp});}
  else await signal({type:'restart'});
  return alive()?'started':'ignored';
 }finally{peer.restarting=false;}
}
export function voicePollDelay(peers){return peers.length&&peers.every(peer=>peer.pc.connectionState==='connected')?2000:1000;}

// Older backends may omit relay flags; derive them from usable ICE entries.
export function normalizeVoiceConfig(config={}){const iceServers=(Array.isArray(config.iceServers)?config.iceServers:[]).flatMap(server=>{const urls=[].concat(server.urls||[]).filter(u=>typeof u==='string'&&(/^stuns?:/.test(u)||/^turns?:/.test(u)&&!!server.username&&!!server.credential));return urls.length?[{...server,urls}]:[]});const turn=iceServers.flatMap(server=>server.urls.filter(u=>/^turns?:/.test(u)));return {...config,iceServers,relayConfigured:turn.length>0,relayTLSConfigured:turn.some(u=>/^turns:.*:443(?:\?transport=tcp)?$/.test(u))}}
