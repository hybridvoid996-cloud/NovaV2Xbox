const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(?:official audio|official video)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const baseTitle=value=>normalize(String(value||'').replace(/\s*[([](?:feat\.?|ft\.?|with)\s+[^)\]]+[)\]]/gi,''));
export function fallbackRecording(source,found){
 const match=String(found?.url||'').match(/^\/api\/soundcloud\?op=(alternate-audio|noah-audio)&id=(\d{1,20})$/);
 if(!found?.found||!match)return null;
 const src=match[1]==='noah-audio'?'noah':'void';
 return {...source,id:src+':'+match[2],src,duration:found.duration||source.duration,album:found.album||source.album||'',albumId:found.albumId||'',thumb:found.thumb||source.thumb||'',playable:true};
}
export function matchImportedTrack(source,candidates){
 const title=baseTitle(source.title),artists=String(source.artist||'').split(/,| & | feat\.? | ft\.? /i).map(normalize).filter(Boolean);
 return candidates.filter(t=>t.playable!==false&&/^(?:sc|void|noah):\d{1,20}$/.test(t.id)&&baseTitle(t.title)===title&&artists.length&&artists.every(a=>(' '+normalize(t.artist+' '+t.title)+' ').includes(' '+a+' '))&&(!source.duration||Math.abs(Number(t.duration)-source.duration)<=Math.max(6,source.duration*.05))).sort((a,b)=>Math.abs((a.duration||0)-(source.duration||0))-Math.abs((b.duration||0)-(source.duration||0)))[0]||null;
}
export async function matchPlaylist(tracks,{search,alternative,signal,onProgress=()=>{}}){
 const rows=new Array(tracks.length);let next=0,done=0;
 async function worker(){while(next<tracks.length){signal?.throwIfAborted();const index=next++,source=tracks[index];let match=null,reason='No close match';try{if(/^sc:\d{1,20}$/.test(source.id))match=source;else match=matchImportedTrack(source,await search((source.artist+' '+source.title).slice(0,160),signal))}catch(error){if(signal?.aborted)throw error;reason='Search unavailable'}if(!match){try{const primary=String(source.artist).split(',')[0];match=matchImportedTrack(source,await search((primary+' '+source.title.replace(/\s*[([](?:feat\.?|ft\.?|with)\s+[^)\]]+[)\]]/gi,'')).slice(0,160),signal))}catch(error){if(signal?.aborted)throw error}}if(!match&&alternative){try{match=await alternative(source,signal)}catch(error){if(signal?.aborted)throw error}}signal?.throwIfAborted();rows[index]={source,match,reason:match?(match.id.startsWith('noah:')?'Noah':match.id.startsWith('void:')?'Void':'SoundCloud'):reason};onProgress(++done,tracks.length)}}
 await Promise.all(Array.from({length:Math.min(3,tracks.length)},worker));return rows;
}
