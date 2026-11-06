const files=new Set(['EaglercraftX_1.8_u53_Offline_Signed.html','EaglercraftX_1.8_WASM-GC_Offline_Download.html','Eaglercraft_1.12_Offline_en_US.html','Eaglercraft_1.12.2_WASM_Offline_Download.html','eaglercraft-26.2-zeus-skins.html']);
export const minecraftVersions={
 '18':{name:'Minecraft 1.8.8',engine:'Standard',file:'EaglercraftX_1.8_u53_Offline_Signed.html'},
 '18-wasm':{name:'Minecraft 1.8.8',engine:'WASM-GC',file:'EaglercraftX_1.8_WASM-GC_Offline_Download.html'},
 '112':{name:'Minecraft 1.12.2',engine:'Standard',file:'Eaglercraft_1.12_Offline_en_US.html'},
 '112-wasm':{name:'Minecraft 1.12.2',engine:'WASM-GC',file:'Eaglercraft_1.12.2_WASM_Offline_Download.html'},
 '262':{name:'Minecraft 26.2',engine:'WASM-GC',file:'eaglercraft-26.2-zeus-skins.html'}
};
export function chooseMinecraft({source,preferred,signal,onCancel}){
 if(Object.hasOwn(minecraftVersions,preferred||''))return Promise.resolve(minecraftLaunchURL(minecraftVersions[preferred].file,source));
 return new Promise((resolve,reject)=>{
  const pane=document.createElement('section');pane.setAttribute('aria-label','Choose Minecraft version');pane.style.cssText='position:fixed;inset:0;z-index:8000;display:grid;place-items:center;background:#08090bd9;backdrop-filter:blur(14px);padding:20px;color:#eee;font:14px system-ui;overflow:auto';
  const card=document.createElement('div');card.style.cssText='width:min(640px,100%);padding:28px;border:1px solid #ffffff26;border-radius:24px;background:linear-gradient(140deg,#ffffff0e,#111116dd);box-shadow:0 30px 80px #0007';
  const heading=document.createElement('h1');heading.textContent='Choose your Minecraft';const info=document.createElement('p');info.textContent='Choose a version and engine. Each starts a fresh Nova proxy connection.';info.style.color='#a8a8b3';card.append(heading,info);
  for(const [key,version] of Object.entries(minecraftVersions)){const button=document.createElement('button');button.type='button';button.textContent=version.name+' · '+version.engine;button.dataset.minecraftVersion=key;button.style.cssText='display:block;width:100%;padding:15px 18px;margin:10px 0;text-align:left;border:1px solid #ffffff25;border-radius:13px;background:#ffffff08;color:inherit;font:inherit;cursor:pointer';button.onclick=()=>{const target=minecraftLaunchURL(version.file,source);if(!target)return;pane.remove();resolve(target)};card.append(button)}
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Back to library';cancel.style.cssText='margin-top:12px;background:none;border:0;color:#aaa;cursor:pointer;padding:10px 0';cancel.onclick=()=>onCancel?.();card.append(cancel);pane.append(card);document.body.append(pane);signal?.addEventListener('abort',()=>{pane.remove();reject(Error('Game launch cancelled'))},{once:true});
 });
}
export function minecraftLaunchURL(file,source){
 const url=new URL(source);if(url.origin!=='https://playobsidian.com'||!url.pathname.startsWith('/cdn/assets/html/440c5a5c-4e43-4404-90dd-67d0c877fcf3/')||!files.has(file))return null;
 return new URL(file,url).href;
}
export function attachMinecraftLauncher(doc,{source,navigate,signal}){
 if(!doc.getElementById('wasm-toggle')||doc.documentElement.dataset.novaMinecraftLauncher)return;
 doc.documentElement.dataset.novaMinecraftLauncher='true';
 doc.addEventListener('click',event=>{const button=event.target.closest?.('#play-18,#play-112,#play-262');if(!button||button.disabled)return;const target=minecraftLaunchURL(button.dataset.url,source);if(!target)return;event.preventDefault();event.stopImmediatePropagation();navigate(target)},{capture:true,signal});
}

const root='https://playobsidian.com/cdn/assets/html/440c5a5c-4e43-4404-90dd-67d0c877fcf3/26.2%20+%201.12.2%20+%201.8.8/';
export function minecraftInlineReplacement(url,gameId){
 if(url.origin!=='https://nova-content.invalid')return null;
 const entries={'181':['/content/games/181-f.html','18'],'182':['/content/games/182-f.html','112']};const entry=entries[String(gameId)];
 return entry&&url.pathname===entry[0]?new URL(minecraftVersions[entry[1]].file,root).href:null;
}
export function prepareMinecraftInline(html,source){
 const base=new URL('.',source).href;return html.replace(/<head([^>]*)>/i, '<head$1><base href="'+base+'">').replace(/<script[^>]+src=["'][^"']*servers\.js["'][^>]*><\/script>/gi,'').replace(/setServers\(\);/g,'');
}
