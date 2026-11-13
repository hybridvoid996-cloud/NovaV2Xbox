import {normalizeCloudTitle} from './cloud-catalog.mjs';
export function mergeOpiumCatalog(existing,rows){
 const games=structuredClone(existing);let shared=0,added=0;const seen=new Set();
 for(const row of rows){if(!/^[a-z]{2}\d+$/i.test(row.key)||!row.name?.trim()||seen.has(row.key))throw Error('Invalid Opium game identity');seen.add(row.key);const art=new URL(row.cover||row.image);if(art.protocol!=='https:')throw Error('Invalid game cover');
 const provider={url:'/opium-cloud.html?game='+encodeURIComponent(row.key),name:row.name,sourceId:row.key,nativeEmbed:true,source:'Opium'};
 const keyed=games.filter(g=>g.id===row.key||Object.values(g.providers||{}).some(p=>p.sourceId===row.key));
 const matches=keyed.length?keyed:games.filter(g=>normalizeCloudTitle(g.name)===normalizeCloudTitle(row.name));
 if(matches.length){for(const g of matches){g.providers||={astra:{url:g.url,name:g.name,sourceOccurrence:g.sourceOccurrence}};g.providers.opium=provider}shared++}
 else{const id='opium-'+row.key;games.push({id,name:row.name,art:'cloud-covers/'+id+'.webp',sourceArt:art.href,url:provider.url,kind:'cloud',providers:{opium:provider}});added++}
 }
 if(new Set(games.map(g=>g.id)).size!==games.length)throw Error('Duplicate cloud IDs');return{games,shared,added};
}
