import {createHmac} from 'node:crypto';
export function remoteRelay({env=process.env,uid='status',expires=Date.now()+3600000,mode='auto'}={}){
 // Remote desktops have their own credentials and never consume voice's relay.
 env={NOVA_TURN_URL:env.NOVA_COMPUTER_TURN_URL,NOVA_TURN_USERNAME:env.NOVA_COMPUTER_TURN_USERNAME,NOVA_TURN_CREDENTIAL:env.NOVA_COMPUTER_TURN_CREDENTIAL,NOVA_TURN_SECRET:env.NOVA_COMPUTER_TURN_SECRET};
 const fallback=env.NOVA_TURN_USERNAME&&env.NOVA_TURN_CREDENTIAL&&!env.NOVA_TURN_SECRET?'turn:free.expressturn.com:3478,turn:free.expressturn.com:3478?transport=tcp':'';
 let configuredURLs;try{const parsed=JSON.parse(env.NOVA_TURN_URL||'null');if(Array.isArray(parsed))configuredURLs=parsed.filter(url=>typeof url==='string')}catch{}
 const supplied=(configuredURLs||String(env.NOVA_TURN_URL||'').split(/[,\s]+/)).map(url=>url.replace(/^["']|["']$/g,'')).flatMap(url=>{if(/^[a-zA-Z0-9.-]+:[0-9]{1,5}$/.test(url))return ['turn:'+url,'turn:'+url+'?transport=tcp'];if(url==='turn:free.expressturn.com:3478')return [url,url+'?transport=tcp'];return [url]});
 const urls=[...new Set(supplied.filter(url=>/^turns?:([a-zA-Z0-9.-]+|\[[a-fA-F0-9:]+\])(?::([0-9]{1,5}))?(?:\?transport=(?:udp|tcp))?$/.test(url)))].slice(0,12).filter(url=>{const m=url.match(/\]?:([0-9]+)(?:\?|$)/);return !m||Number(m[1])>0&&Number(m[1])<=65535});
 const tls=urls.filter(url=>/^turns:/.test(url)&&/:443(?:\?transport=tcp)?$/.test(url));
 let username=env.NOVA_TURN_USERNAME,credential=env.NOVA_TURN_CREDENTIAL;
 if(env.NOVA_TURN_SECRET){username=Math.floor(expires/1000+60)+':'+uid;credential=createHmac('sha1',env.NOVA_TURN_SECRET).update(username).digest('base64')}
 const configured=!!(urls.length&&username&&credential),tlsConfigured=configured&&tls.length>0;
 const selected=mode==='relay'&&tls.length?tls:urls;
 const iceServers=mode==='relay'?[]:[{urls:'stun:stun.l.google.com:19302'}];
 if(configured&&selected.length)iceServers.push({urls:selected,username,credential});
 return {iceServers,relayConfigured:configured,relayTLSConfigured:tlsConfigured,iceTransportPolicy:mode==='relay'?'relay':'all'};
}
