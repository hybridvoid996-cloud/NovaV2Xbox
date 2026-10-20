// Preserve native listener identity. Legacy engine feature tests otherwise see
// duplicate listeners and install broken old-browser input shims.
export function patchProxyEvents(source){
 if(source.includes('novaListenerCapture'))return source;
 const add='let r=t.args[1],i=a(r);t.args[1]=i;let n=e.eventcallbacks.get(t.this);(n||=[]).push({event:t.args[0],originalCallback:r,proxiedCallback:i}),e.eventcallbacks.set(t.this,n)';
 const remove='let i=r.findIndex(e=>e.event===t.args[0]&&e.originalCallback===t.args[1]);';
 if(!source.includes(add)||!source.includes(remove))throw Error('Proxy event hooks changed; review listener identity patch');
 return source.replace(add,'let r=t.args[1],n=e.eventcallbacks.get(t.this)||[],novaListenerCapture=typeof t.args[2]==="boolean"?t.args[2]:!!t.args[2]?.capture,existing=n.find(entry=>entry.event===t.args[0]&&entry.originalCallback===r&&entry.capture===novaListenerCapture);if(existing){t.args[1]=existing.proxiedCallback;return}let i=a(r);t.args[1]=i;n.push({event:t.args[0],originalCallback:r,proxiedCallback:i,capture:novaListenerCapture}),e.eventcallbacks.set(t.this,n)')
 .replace(remove,'let novaListenerCapture=typeof t.args[2]==="boolean"?t.args[2]:!!t.args[2]?.capture,i=r.findIndex(e=>e.event===t.args[0]&&e.originalCallback===t.args[1]&&e.capture===novaListenerCapture);');
}
