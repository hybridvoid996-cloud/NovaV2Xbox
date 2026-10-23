import {repairConstructBase} from '../../src/game-construct-compat.mjs?v=20261022-games265';

const base='https://cdn.jsdelivr.net/gh/web-ports/celeste@4f043a5ce121b74dc54ce56d74f213a2eeea6b4e/';
const bootstrap=document.createElement('section');
bootstrap.id='loading-screen';
const label=document.getElementById('loading-textt');
label.replaceWith(bootstrap);bootstrap.append(label);
const observer=new MutationObserver(()=>{
 const overlay=document.querySelector('canvascontainer > div');
 if(!overlay)return;
 overlay.querySelector('.material-symbols-rounded')?.remove();
 overlay.id='loading-screen';bootstrap.remove();observer.disconnect();
});
observer.observe(document.body,{childList:true,subtree:true});
addEventListener('pagehide',()=>observer.disconnect(),{once:true});

try{
 const bundle=new URL('bundle.js',base);
 let source;
 for(const url of [bundle.href,'https://raw.githubusercontent.com/web-ports/celeste/4f043a5ce121b74dc54ce56d74f213a2eeea6b4e/bundle.js']){
  try{
   const response=await fetch(url,{credentials:'omit'});
   if(!response.ok)continue;
   const text=await response.text();
   if(text.includes("import { dotnet } from './_framework/dotnet.js';")){source=text;break;}
  }catch{}
 }
 if(!source)throw Error('The startup script is unavailable. Please retry.');
 const repaired=await repairConstructBase(bundle,{status:200,headers:[],body:source},{gameId:623});
 const body=repaired.body.replace("from './_framework/dotnet.js'",'from '+JSON.stringify(new URL('_framework/dotnet.js',base).href))
  .replace('app.loadingSub = url;','app.loadingSub = "";')
  .replace('app.loadingText = "Error during load";','app.loadingText = "Failed to load game data";');
 const url=URL.createObjectURL(new Blob([body],{type:'text/javascript'}));
 try{await import(url)}finally{URL.revokeObjectURL(url)}
}catch(error){bootstrap.textContent='Failed to load Celeste: '+error.message;}
