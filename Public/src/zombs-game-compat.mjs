import {engineReadyScript} from './zombs-engine-ready.mjs?v=20261020-socket206';
// Narrow compatibility fixes for the two official Zombs clients.
export async function zombsGameResponse(target,response){
 if(response.status!==200)return response;
 if(target.origin==='https://zombs.io'&&target.pathname==='/'){const source=typeof response.body==='string'?response.body:await new Response(response.body).text();return {...response,body:source.replace(/<head([^>]*)>/i,match=>match+engineReadyScript),headers:response.headers.filter(([name])=>!['content-length','content-encoding'].includes(name.toLowerCase()))}}

 if(target.origin==='https://zombs.io'&&target.pathname.endsWith('.wasm'))return {...response,headers:[...response.headers.filter(([name])=>name.toLowerCase()!=='content-type'),['content-type','application/wasm']]};
 if(target.origin!=='https://zombsroyale.io'||target.pathname!=='/asset/app.js')return response;
 const source=await new Response(response.body).text();
 const body=source.replace("platform.name.toLowerCase()","String(platform.name||'unknown').toLowerCase()").replace('window.createUnityInstance(this.canvasElem,instanceConfig,','instanceConfig.devicePixelRatio=1;window.createUnityInstance(this.canvasElem,instanceConfig,');
 return {...response,body,headers:response.headers.filter(([name])=>!['content-length','content-encoding'].includes(name.toLowerCase()))};
}
export function attachZombsGraphics(doc){
 const control=doc.querySelector('.hud-intro-canvas'),win=doc.defaultView;
 if(!control||!win||doc.documentElement.dataset.novaZombsGraphics)return;
 doc.documentElement.dataset.novaZombsGraphics='ready';
 let saved;try{saved=win.localStorage.getItem('nova-zombs-graphics')}catch{}
 let supportsGL=true;try{const probe=doc.createElement('canvas');const gl=probe.getContext('webgl')||probe.getContext('experimental-webgl');supportsGL=!!gl;gl?.getExtension('WEBGL_lose_context')?.loseContext()}catch{supportsGL=false}
 if(!control.checked&&(saved!=='gpu'||!supportsGL)){control.checked=true;control.dispatchEvent(new win.Event('change',{bubbles:true}))}
 control.addEventListener('change',()=>{try{win.localStorage.setItem('nova-zombs-graphics',control.checked?'compatible':'gpu')}catch{}});
 doc.addEventListener('webglcontextlost',event=>{event.preventDefault();if(doc.getElementById('nova-zombs-recovery'))return;const box=doc.createElement('section');box.id='nova-zombs-recovery';box.setAttribute('role','alert');box.style.cssText='position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;gap:16px;text-align:center;background:#111e;color:white;font:16px system-ui';const message=doc.createElement('p'),retry=doc.createElement('button');message.textContent='The graphics connection stopped. Try compatible graphics to continue.';retry.textContent='Reload with compatible graphics';retry.style.cssText='padding:14px 20px;border:1px solid #fff5;border-radius:10px;background:#324b1c;color:white;cursor:pointer';retry.onclick=()=>{try{win.localStorage.setItem('nova-zombs-graphics','compatible')}catch{}win.location.reload()};box.append(message,retry);doc.body.append(box)},true);
}

export function attachRoyaleGraphics(doc){if(!doc?.defaultView||doc.documentElement.dataset.novaRoyaleGraphics)return;doc.documentElement.dataset.novaRoyaleGraphics='ready';doc.addEventListener('webglcontextlost',event=>{event.preventDefault();if(doc.getElementById('nova-royale-recovery'))return;const box=doc.createElement('section');box.id='nova-royale-recovery';box.setAttribute('role','alert');box.style.cssText='position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;gap:16px;padding:30px;text-align:center;background:#111e;color:white;font:16px system-ui';const text=doc.createElement('p'),button=doc.createElement('button');text.textContent='The game lost its graphics connection. Reload to reconnect with compatible rendering.';button.textContent='Reload Zombs Royale';button.style.cssText='padding:14px 20px;border:1px solid #fff5;border-radius:10px;background:#324b1c;color:white;cursor:pointer';button.onclick=()=>doc.defaultView.location.reload();box.append(text,button);doc.body.append(box)},true)}
