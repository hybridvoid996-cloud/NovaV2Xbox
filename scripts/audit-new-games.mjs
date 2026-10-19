import fs from 'node:fs/promises';import vm from 'node:vm';
const root=new URL('../Public/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('content/noah-import/manifest.json',root)));let out=[];
for(const g of manifest.games){let s=await fs.readFile(new URL('content/noah-import/games/'+g.id+'.html',root),'utf8');let scripts=[],issues=[],base=s.match(/<base\b[^>]*href\s*=\s*["']([^"']+)/i)?.[1]||g.source;
for(const m of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){const src=m[1].match(/\bsrc\s*=\s*["']([^"']+)/i)?.[1],type=m[1].match(/\btype\s*=\s*["']([^"']+)/i)?.[1];if(src){try{scripts.push(new URL(src,base).href)}catch{issues.push('Invalid script '+src)}}else if(m[2].trim()&&(!type||type==='text/javascript')){try{new vm.Script(m[2])}catch(e){issues.push(e.message)}}}
out.push({id:g.id,name:g.title,base,issues,scripts});}
await fs.mkdir('docs/game-audit',{recursive:true});await fs.writeFile('docs/game-audit/new-static.json',JSON.stringify(out,null,2));console.log(out.filter(g=>g.issues.length));console.log('External scripts:',out.reduce((n,g)=>n+g.scripts.length,0));
if(process.argv.includes('--static'))process.exit(0);
const urls=[...new Set(out.flatMap(g=>g.scripts).filter(u=>/^https?:/.test(u)))];let results=[],cursor=0;
await Promise.all(Array.from({length:6},async()=>{while(cursor<urls.length){let url=urls[cursor++];try{let r=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{Range:'bytes=0-2047'}});let reader=r.body?.getReader(),chunk=await reader?.read();await reader?.cancel();results.push({url,status:r.status,type:r.headers.get('content-type'),sample:new TextDecoder().decode(chunk?.value?.slice(0,160)||new Uint8Array())});}catch(e){results.push({url,error:e.message})}}}));
await fs.writeFile('docs/game-audit/new-scripts.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.filter(x=>x.error||x.status>=400||/text\/html/.test(x.type)),null,2));
