export async function mergeGameParts(parts,fetchPart){
 const blobs=new Array(parts.length);let next=0;
 await Promise.all(Array.from({length:Math.min(3,parts.length)},async()=>{
  while(next<parts.length){const i=next++;blobs[i]=await fetchPart(parts[i]);}
 }));
 const wasm=typeof parts[0]==='string'&&/\.wasm\.part\d+$/.test(parts[0]);
 return new Blob(blobs,{type:wasm?'application/wasm':'application/octet-stream'});
}

const layout=`<style id="nova-goi-viewport">
html,body{width:100%;height:100%;margin:0!important;overflow:hidden;background:#111}
#unity-container,#unity-container.unity-desktop,#unity-container.unity-mobile{position:fixed!important;inset:0!important;left:0!important;top:0!important;width:100vw!important;height:100dvh!important;transform:none!important;margin:0!important}
#unity-canvas{position:absolute;inset:0;width:100%!important;height:100%!important;display:block;outline:0}
#loading-text{position:fixed!important;z-index:10;top:50%;left:50%;transform:translate(-50%,-50%);width:min(430px,calc(100vw - 40px));margin:0!important;padding:28px 22px;border:1px solid #ffffff26;border-radius:22px;background:linear-gradient(140deg,#ffffff12,#ffffff03),#101010ce;box-shadow:inset 0 1px #ffffff16,0 20px 70px #0005;backdrop-filter:blur(16px);color:#d4d4d4!important;font:500 clamp(12px,2vw,15px)/1.65 system-ui,sans-serif!important;text-align:center;overflow-wrap:anywhere}
#loading-text:before{content:'GETTING OVER IT';display:block;color:#fff;font-size:18px;font-weight:650;letter-spacing:2px;margin-bottom:12px}
#loading-text:after{content:'Downloading game files · first launch is large';display:block;color:#999;font-size:11px;margin-top:12px}
#unity-loading-bar{z-index:11;top:calc(50% + 108px)!important}
#unity-logo{display:none!important}
#unity-progress-bar-empty{height:3px;width:180px;background:#ffffff20;border-radius:8px;overflow:hidden;margin:0}
#unity-progress-bar-full{height:100%;margin:0;background:#fff;border-radius:inherit;transition:width .2s}
</style>`;

export async function repairGettingOverIt(url,response,{gameId}={}){
 const root='https://playobsidian.com/cdn/assets/html/c75db71a-ed5a-4ed9-9cf2-5c73fb513c79/1.7/';
 if(String(gameId)!=='557'||response.status!==200)return response;
 const target=url.origin+url.pathname;
 if(target===root+'Build/GettingOverIt.framework.js'){
  const text=await new Response(response.body).text();
  return {...response,body:text.replace('window.open(str,"_blank","")','try{window.open(str,"_blank","")}catch(error){console.warn("The external link could not open; the game can continue.")}'),headers:response.headers.filter(([name])=>!['content-length','content-encoding'].includes(name.toLowerCase()))};
 }
 if(target!==root+'index.html')return response;
 let text=await new Response(response.body).text();
 text=text.replace('</head>',layout+'</head>');
 text=text.replace('<div id="unity-container"','<div data-nova-responsive="true" id="unity-container"');
 // Blob parts can be assembled without copying every part into another large
 // Uint8Array. Keep the original order while limiting simultaneous downloads.
 text=text.replace(/let fullBuffer = new Uint8Array\(received\);[\s\S]*?return fullBuffer.buffer;/,'return new Blob(chunks);');
 text=text.replace('const response = await fetch(url);',"const response = await fetch(url); if(!response.ok)throw Error('Game file could not load (HTTP '+response.status+'). Reload to retry.');");
 text=text.replace('const buffers = await Promise.all(parts.map(fetchWithProgress));',`const buffers = await (${mergeGameParts.toString()})(parts,fetchWithProgress);`);
 text=text.replace('return URL.createObjectURL(new Blob(buffers));','return URL.createObjectURL(buffers);');
 text=text.replace('var container = document.querySelector("#unity-container");','loadingText.textContent = "Preparing the game engine…";\n            var container = document.querySelector("#unity-container");');
 text=text.replace('progressBarFull.style.width = 100 * progress + "%";','progressBarFull.style.width = 100 * progress + "%"; loadingText.textContent = "Starting game… " + Math.round(progress * 100) + "%";');
 text=text.replace(/\}\)\(\);\s*<\/script>/,"})().catch(error => { loadingText.textContent = error.message || 'The game could not load. Reload to retry.'; });\n    </script>");
 return {...response,body:text,headers:response.headers.filter(([name])=>!['content-length','content-encoding'].includes(name.toLowerCase()))};
}
