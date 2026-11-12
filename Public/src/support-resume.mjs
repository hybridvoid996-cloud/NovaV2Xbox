import {supportRequest} from './account-support-client.mjs';
// A room capability stays on this origin; never put it in a URL.
try {
 const room=JSON.parse(localStorage.getItem('nova-support-room-v1')||'null');
 if(/^[a-f0-9]{48}$/.test(room?.room||'')&&/^[a-f0-9]{48}$/.test(room?.secret||'')){
  const result=await supportRequest('poll',room);
  if(['waiting','active','approved'].includes(result.status))location.replace('/support.html');
  else localStorage.removeItem('nova-support-room-v1');
 }
}catch(e){if([403,410].includes(e.status))localStorage.removeItem('nova-support-room-v1');/* Sign-in remains usable if support is offline. */}
