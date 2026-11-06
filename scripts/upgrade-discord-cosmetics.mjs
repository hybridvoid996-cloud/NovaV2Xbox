import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../Public/profile-assets/',import.meta.url),path=new URL('catalog.json',root),catalog=JSON.parse(await readFile(path,'utf8'));
const cards=JSON.parse(await readFile(new URL('../docs/discord-shop-visible.json',import.meta.url),'utf8'));
const failures=[],queue=catalog.filter(x=>x.source==='Discord visible shop'&&x.kind==='banner');let upgraded=0,frames=0;
async function png(url){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('HTTP '+r.status);const b=Buffer.from(await r.arrayBuffer());if(b.length>20e6||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Unsupported PNG');return b;}
await mkdir(new URL('discord-live/',root),{recursive:true});
async function worker(){while(queue.length){const a=queue.shift();try{const url=a.sourceUrl.replace(/\/video$/,'/animated'),b=await png(url);const src='/profile-assets/discord-live/'+a.id+'.png';await writeFile(new URL('discord-live/'+a.id+'.png',root),b);a.src=src;a.sourceUrl=url;a.sha256=createHash('sha256').update(b).digest('hex');delete a.conversion;a.renderMode='original-apng-nameplate';upgraded++;}catch(e){failures.push({id:a.id,error:e.message})}}}
await Promise.all(Array.from({length:6},worker));
// Profile frames are imported by import-discord-layers.mjs using observed layer geometry.
await writeFile(path,JSON.stringify(catalog,null,2)+'\n');await writeFile(new URL('../docs/discord-hq-import.json',import.meta.url),JSON.stringify({upgraded,frames,failures,total:catalog.length},null,2));console.log(JSON.stringify({upgraded,frames,failures,total:catalog.length}));

