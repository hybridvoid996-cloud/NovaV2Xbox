export function patchProxyXHR(source){
 const old='!e.getFlag("syncxhr")';
 if(!source.includes(old))throw Error('Proxy synchronous XHR implementation changed; review the compatibility patch.');
 const worker='let s=t.this[i];if(!s||s[2])return;';
 if(source.split(worker).length!==2)throw Error('Proxy XHR send hook changed; review native worker requests.');
 // Workers already support synchronous native XHR. The window-only shared
 // buffer bridge in this release has no initialized helper worker; applying
 // it to game workers leaves status=0. open() still rewrites their URL.
 return source.replace(old,'!e.flagEnabled("syncxhr")').replace(worker,worker+'if(!e.global.document)return;');
}
