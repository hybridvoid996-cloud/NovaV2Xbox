import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
const root=new URL('../Public/profile-assets/',import.meta.url);
const manifest=new URL('../docs/discord-shop-visible.json',import.meta.url);
const cards=JSON.parse(await readFile(manifest,'utf8'));
// Keep only public cosmetic assets, never profile photos from the signed-in previews.
for(const card of cards)card.media=card.media.filter(u=>/^https:\/\/cdn\.discordapp\.com\/(media\/v1\/collectibles-shop\/|assets\/content\/)/.test(u));
await writeFile(manifest,JSON.stringify(cards,null,2)+'\n');
const catalog=JSON.parse(await readFile(new URL('catalog.json',root),'utf8'));
const known=new Set(catalog.map(x=>x.kind+'|'+x.name.toLowerCase()));
const ids=new Set(catalog.map(x=>x.id));
const ffmpeg=process.env.NOVA_COSMETIC_FFMPEG||join(process.env.TEMP,'nova-cosmetic-tools/node_modules/ffmpeg-static/ffmpeg.exe');
const dir=new URL('discord-live/',root);await mkdir(dir,{recursive:true});
const report={at:new Date().toISOString(),inspected:cards.length,added:0,duplicates:0,unsupported:[],failures:[]};
const queue=cards.filter(c=>/: (Avatar Decoration|Nameplate)$/.test(c.label));
for(const c of cards.filter(c=>!queue.includes(c)))report.unsupported.push({label:c.label,reason:'Requires full effect-layer or profile-frame renderer; preview art is not an animated wearable.'});
async function download(url){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('HTTP '+r.status);const b=Buffer.from(await r.arrayBuffer());if(b.length>16*1024*1024)throw Error('Asset exceeds 16 MB');return b;}
async function worker(){while(queue.length){const c=queue.shift(),type=c.label.split(': ').at(-1),kind=type==='Nameplate'?'banner':'decoration',name=c.label.slice(0,-type.length-2),key=kind+'|'+name.toLowerCase();if(known.has(key)){report.duplicates++;continue;}known.add(key);try{const source=c.media.find(u=>u.includes('/collectibles-shop/'));if(!source)throw Error('No public cosmetic source');const match=source.match(/collectibles-shop\/(\d+)\/(static|animated|video)$/);if(!match)throw Error('Unsupported asset path');const id='discord-live-'+kind+'-'+match[1];if(ids.has(id)){report.duplicates++;continue;}
const url=kind==='decoration'?source.replace(/\/(static|animated)$/,'/animated'):source;
const bytes=await download(url),stem=new URL(id,dir),path=decodeURIComponent(stem.pathname).replace(/^\/([A-Z]:)/,'$1');let src,thumb;
if(kind==='decoration'){if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Decoration is not PNG');await writeFile(path+'.png',bytes);src='/profile-assets/discord-live/'+id+'.png';thumb=src;const still=await download(source.replace(/\/animated$/,'/static'));await writeFile(path+'-thumb.png',still);thumb=src.replace('.png','-thumb.png');}
else{await writeFile(path+'.webm',bytes);execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',path+'.webm','-vf','fps=15,scale=600:-1:flags=lanczos','-c:v','libwebp_anim','-q:v','70','-loop','0','-an',path+'.webp'],{timeout:60000,windowsHide:true});execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',path+'.webm','-frames:v','1',path+'-thumb.png'],{timeout:30000,windowsHide:true});src='/profile-assets/discord-live/'+id+'.webp';thumb='/profile-assets/discord-live/'+id+'-thumb.png';}
catalog.push({id,name,kind,src,thumbnail:thumb,rarity:kind==='banner'?'epic':'uncommon',collection:c.collection.replace(/^Category: /,''),source:'Discord visible shop',sourceType:type,sourceUrl:url,sha256:createHash('sha256').update(bytes).digest('hex'),...(kind==='banner'?{renderMode:'animated-nameplate',conversion:'Animated WebP, 15 fps, 600 px wide'}:{})});ids.add(id);report.added++;if(report.added%50===0)console.log('Imported '+report.added);}
catch(e){known.delete(key);report.failures.push({label:c.label,error:e.message});}}}
await Promise.all(Array.from({length:4},worker));await writeFile(new URL('catalog.json',root),JSON.stringify(catalog,null,2)+'\n');report.total=catalog.length;await writeFile(new URL('../docs/discord-live-import.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({added:report.added,duplicates:report.duplicates,unsupported:report.unsupported.length,failures:report.failures.length,total:catalog.length}));
