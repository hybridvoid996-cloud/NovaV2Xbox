import {createHash} from 'node:crypto';
import {normalizeCloudTitle} from './cloud-catalog.mjs';
export const LUNA_ORIGIN='https://luna.loan';
export function mergeLunaCatalog(existing,rows){
 const games=existing.filter(g=>!String(g.id).startsWith('luna-')||Object.keys(g.providers||{}).some(id=>id!=='luna')).map(g=>{const providers={...(g.providers||{astra:{url:g.url,name:g.name,sourceOccurrence:g.sourceOccurrence}})};delete providers.luna;return {...g,providers}});
 const seen=new Set();let shared=0,added=0;
 for(const row of rows){
  const sourceId=row.package_name,name=String(row.title||'').trim();
  if(typeof sourceId!=='string'||!/^[\w.-]+$/.test(sourceId)||!name||seen.has(sourceId))throw Error('Invalid or duplicate Luna game');seen.add(sourceId);
  if(row.status!==1)continue;
  const sourceArt=new URL(row.icon_url);if(sourceArt.protocol!=='https:')throw Error('Invalid Luna cover');
  const metadata={url:LUNA_ORIGIN+'/',name,sourceId,source:'Luna'};
  const keyed=games.filter(g=>Object.values(g.providers).some(p=>p.sourceId===sourceId));
  const matches=keyed.length?keyed:games.filter(g=>normalizeCloudTitle(g.name)===normalizeCloudTitle(name)&&!g.providers.luna);
  if(matches.length){for(const g of matches)g.providers.luna=metadata;shared++;continue}
  const id='luna-'+createHash('sha256').update(sourceId).digest('hex').slice(0,16);
  games.push({id,name,art:'cloud-covers/'+id+'.webp',sourceArt:sourceArt.href,url:metadata.url,kind:'cloud',providers:{luna:metadata}});added++;
 }
 if(new Set(games.map(g=>g.id)).size!==games.length)throw Error('Duplicate cloud identity');
 return {games,shared,added};
}
