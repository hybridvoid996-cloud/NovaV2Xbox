import {wiiFstSizes} from './wii-fst.mjs';
// Scope repairs to the inspected exports, not arbitrary scripts.
export async function repairObsidianGame(url,response,{gameId}={}){
 if(url.hostname!=='playobsidian.com'||response.status!==200)return response;
 const terraria=String(gameId)==='1041'&&url.pathname==='/cdn/assets/html/a498930d-5864-472b-ac6f-e1e41886c095/1.4.5.5/assets/index.js';
 const terrariaRuntime=String(gameId)==='1041'&&/^\/cdn\/assets\/html\/a498930d-5864-472b-ac6f-e1e41886c095\/1\.4\.5\.5\/_framework\/dotnet\.runtime\.[\w]+\.js$/.test(url.pathname);
 const wii=String(gameId)==='1047'&&url.pathname==='/cdn/assets/html/46975ef1-a576-49c2-b0ae-b740301204d2/1/rgh-worker.js';
 const wiiHost=String(gameId)==='1047'&&url.pathname==='/cdn/assets/html/46975ef1-a576-49c2-b0ae-b740301204d2/1/rgh-host.js';
 const minecraft=String(gameId)==='1044'&&url.pathname.startsWith('/cdn/assets/html/440c5a5c-4e43-4404-90dd-67d0c877fcf3/')&&url.pathname.endsWith('/servers.js');
 const minecraft26=String(gameId)==='1044'&&url.pathname.startsWith('/cdn/assets/html/440c5a5c-4e43-4404-90dd-67d0c877fcf3/')&&url.pathname.endsWith('/eaglercraft-26.2-zeus-skins.html');
 if(!terraria&&!terrariaRuntime&&!wii&&!wiiHost&&!minecraft&&!minecraft26)return response;
 const text=await new Response(response.body).text();
 if(terrariaRuntime){
  // Scramjet removes debugger statements. Preserve a statement body for the
  // runtime's conditional debugger hook, otherwise removal leaves `if(...)}`.
  const body=text.replaceAll('globalThis.dotnetDebugger)debugger}', 'globalThis.dotnetDebugger){debugger;}}');
  return {...response,body,headers:response.headers.filter(([name])=>!['content-encoding','content-length'].includes(name.toLowerCase()))};
 }
 if(wiiHost){
  const sourceBase=new URL('./',url).href;
  const repaired=text.replace('new URL(data.assetBase,location.href)',`new URL(data.assetBase,${JSON.stringify(sourceBase)})`)
   .replace("const localLauncher = ['localhost','127.0.0.1','[::1]'].includes(location.hostname);",'const localLauncher = false;')
   .replace("remoteBase || new URL('./', location.href).href",`remoteBase || ${JSON.stringify(sourceBase)}`)
   .replace('performance.now()-startAt>90000','false')
   .replace("if (m.type === 'log') log(m.text);", "if (m.type === 'log') { log(m.text); if(m.text.startsWith('[Nova Wii] Reading ') && !(window.__renderer?.stats?.xfbCopies>0)){ UI.progress(0,'Loading game files…',m.text.slice(11)); document.getElementById('barfill')?.parentElement?.setAttribute('hidden',''); } }");
  return {...response,body:repaired,headers:response.headers.filter(([name])=>!['content-encoding','content-length'].includes(name.toLowerCase()))};
 }
 if(wii){
  const fstInit=`if (!cfg.localFiles) { try { const response=await fetch(cfg.base+'game/sys/fst.bin'); if(!response.ok)throw Error('HTTP '+response.status); const sizes=(${wiiFstSizes.toString()})(new Uint8Array(await response.arrayBuffer())); for(const [path,size] of sizes)sizeCache.set(path,size); postMessage({type:'log',fd:1,text:'[Nova Wii] Indexed '+sizes.length/2+' game files'}); } catch(error){postMessage({type:'log',fd:2,text:'[Nova Wii] File index unavailable; checking files individually: '+String(error)});} }`;
  const repaired=text.replace("function fileUrl(path) { return cfg.base + path.split('/')", "function fileUrl(path) { if (!cfg.localFiles) { path = path.replace(/^game\\/part\\//, 'game/'); if (path === 'game/main.dol') path = 'game/sys/main.dol'; } return cfg.base + path.split('/')")
   .replace('inst = await WebAssembly.instantiate(module, imports());',fstInit+'\n    inst = await WebAssembly.instantiate(module, imports());')
   .replace('catch (e) { sizeCache.set(path, -1); return -1; }',"catch (e) { postMessage({type:'log',fd:2,text:'[Nova Wii] File check failed: '+path+' '+String(e)}); sizeCache.set(path, -1); return -1; }")
   .replace('const n = x.status === 200 ? Number(x.getResponseHeader(\'Content-Length\')) : -1;',"const n = x.status === 200 ? Number(x.getResponseHeader('Content-Length')) : -1; if(n<=0)postMessage({type:'log',fd:2,text:'[Nova Wii] File unavailable: '+fileUrl(path)+' HTTP '+x.status+' length '+n}); else postMessage({type:'log',fd:2,text:'[Nova Wii] Reading '+path+' ('+n+' bytes)'});")
   .replace('if(x.status!==206&&x.status!==200)return null;',"if(x.status!==206&&x.status!==200){postMessage({type:'log',fd:2,text:'[Nova Wii] Block unavailable: '+path+' HTTP '+x.status});return null;}")
   .replace('if(blk.length>4*BLOCK) return null;',"if(blk.length>4*BLOCK){postMessage({type:'log',fd:2,text:'[Nova Wii] Server ignored range: '+path});return null;}");
  return {...response,body:repaired,headers:response.headers.filter(([name])=>!['content-encoding','content-length'].includes(name.toLowerCase()))};
 }
 const repaired=minecraft26?text.replace('worldsDB: "worlds"','worldsDB: "nova-minecraft-26-worlds"').replace('resourcePacksDB: "resourcePacks"','resourcePacksDB: "nova-minecraft-26-resourcePacks"'):minecraft?text.replace('window.eaglercraftXOpts.servers = servers;', 'const opts = window.eaglercraftXOpts || window.eaglercraftXOptsHints; if (opts) opts.servers = servers;'):terraria?text.replace("eval('import(\"../_framework/dotnet.js\")')","import('../_framework/dotnet.js')"):text.replace("function fileUrl(path) { return cfg.base + path.split('/')", "function fileUrl(path) { if (!cfg.localFiles) { path = path.replace(/^game\\/part\\//, 'game/'); if (path === 'game/main.dol') path = 'game/sys/main.dol'; } return cfg.base + path.split('/')");
 return {...response,body:repaired,headers:response.headers.filter(([name])=>!['content-encoding','content-length'].includes(name.toLowerCase()))};
}
