import {readFile,writeFile,access} from 'node:fs/promises';
export function pngPoster(bytes){const chunks=[bytes.subarray(0,8)];for(let o=8;o+12<=bytes.length;){const size=bytes.readUInt32BE(o),end=o+12+size;if(end>bytes.length)throw Error('Truncated PNG');const type=bytes.toString('ascii',o+4,o+8);if(!['acTL','fcTL','fdAT'].includes(type))chunks.push(bytes.subarray(o,end));o=end;if(type==='IEND')break;}return Buffer.concat(chunks);}
const root=new URL('../Public/',import.meta.url),catalogURL=new URL('profile-assets/catalog.json',root),catalog=JSON.parse(await readFile(catalogURL,'utf8'));let created=0;
for(const a of catalog.filter(a=>a.layers?.length)){const path=a.src.replace(/\.png$/,'-thumb.png'),target=new URL(path.slice(1),root);try{await access(target)}catch{await writeFile(target,pngPoster(await readFile(new URL(a.src.slice(1),root))));created++;}a.thumbnail=path;}
await writeFile(catalogURL,JSON.stringify(catalog,null,2)+'\n');console.log({created});
