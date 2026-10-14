import {createHmac} from 'node:crypto';
export const PUBLIC_VOICE_ROOMS=['server-vc-1','server-vc-2'];
// Small calls stay bounded; larger rooms require an SFU instead of a growing mesh.
export const roomCapacity=room=>PUBLIC_VOICE_ROOMS.includes(room)?6:2;
export function voiceIceConfig(env,uid,now=Date.now()){
 const iceServers=[{urls:'stun:stun.l.google.com:19302'}];
 const supplied=String(env.NOVA_TURN_URL||'').split(/[,\s]+/).filter(Boolean);
 const urls=[...new Set(supplied.filter(url=>/^turns?:([a-zA-Z0-9.-]+|\[[a-fA-F0-9:]+\])(?::([0-9]{1,5}))?(?:\?transport=(?:tcp|udp))?$/.test(url)).filter(url=>{const match=url.match(/\]?:([0-9]+)(?:\?|$)/);return !match||Number(match[1])>0&&Number(match[1])<=65535;}))].slice(0,12);
 let username=env.NOVA_TURN_USERNAME,credential=env.NOVA_TURN_CREDENTIAL;
 if(env.NOVA_TURN_SECRET){username=Math.floor(now/1000+6*3600)+':'+uid;credential=createHmac('sha1',env.NOVA_TURN_SECRET).update(username).digest('base64');}
 if(urls.length&&username&&credential)iceServers.push({urls,username,credential});
 const relayTLSConfigured=iceServers.some(s=>[].concat(s.urls).some(u=>/^turns:.*:443(?:\?transport=tcp)?$/.test(u)));
 return {relayTLSConfigured,iceServers,relayConfigured:iceServers.length>1,relayTls:iceServers.some(s=>[].concat(s.urls).some(u=>u.startsWith('turns:')))};
}
