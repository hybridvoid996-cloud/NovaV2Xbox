const clean=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(?:official audio|official video)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export const normalizeMusicQuery=value=>String(value||'').trim().replace(/\bu\b/gi,'you').replace(/\s+/g,' ');
const sourceName=id=>String(id).startsWith('void:')?'Void':String(id).startsWith('noah:')?'Noah':'SoundCloud';
const sources=item=>item.sources?.length?item.sources:[{id:item.id,provider:item.provider||sourceName(item.id)}];
const combinedSources=(a,b)=>[...new Map([...sources(a),...sources(b)].map(source=>[source.id,{...source}])).values()];
const title=t=>{const name=clean(t.title),artist=clean(t.artist);return artist&&name.startsWith(artist+' ')?name.slice(artist.length+1):name};
function sameRecording(a,b){
 if(a.id===b.id)return true;
 if(/^sc:/.test(a.id)&&b.id==='noah:'+a.id.slice(3)||/^sc:/.test(b.id)&&a.id==='noah:'+b.id.slice(3))return true;
 if(!clean(a.artist)||clean(a.artist)!==clean(b.artist)||title(a)!==title(b))return false;
 if(a.isrc&&b.isrc&&a.isrc.toUpperCase()===b.isrc.toUpperCase())return true;
 return a.duration>0&&b.duration>0&&Math.abs(a.duration-b.duration)<=3;
}
const covers=(...items)=>[...new Set(items.flatMap(item=>[item.thumb,...(Array.isArray(item.thumbs)?item.thumbs:[])]).filter(value=>typeof value==='string'&&value))].slice(0,6);
const knownDate=(...items)=>items.map(item=>item.releaseDate).find(value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}/.test(value))||'';
const priority=t=>String(t.id).startsWith('void:')?3:String(t.id).startsWith('noah:')?2:1;
export function mergeMusicCatalog(primary={},extra={}){
 const tracks=[];
 for(const row of [...(primary.tracks||[]),...(extra.tracks||[])]){
  const index=tracks.findIndex(t=>sameRecording(t,row));
  if(index<0){tracks.push({...row,thumbs:covers(row),sources:sources(row).map(s=>({...s}))});continue}
  const old=tracks[index],preferred=priority(row)>priority(old)?row:old,other=preferred===row?old:row;
  tracks[index]={...other,...preferred,album:preferred.album||other.album||'',albumId:preferred.albumId||other.albumId||'',thumb:preferred.thumb||other.thumb||'',thumbs:covers(preferred,other),releaseDate:knownDate(preferred,other),publishedAt:preferred.publishedAt||other.publishedAt||'',sources:combinedSources(old,row)};
  // Keep the native SoundCloud identity for identical Noah/SoundCloud IDs.
  if(/^sc:/.test(old.id)&&row.id==='noah:'+old.id.slice(3))tracks[index].id=old.id;
 }
 function mergeCards(key,match){const items=[];for(const row of [...(primary[key]||[]),...(extra[key]||[])]){const index=items.findIndex(item=>item.id===row.id||match(item,row));if(index<0){items.push({...row,thumbs:covers(row),sources:sources(row).map(s=>({...s}))});continue}const old=items[index];const prefer=key==='releases'&&row.kind==='album'&&priority(row)>priority(old);items[index]={...old,...(prefer?row:{}),thumb:(prefer?row.thumb:old.thumb)||row.thumb||'',thumbs:covers(prefer?row:old,prefer?old:row),releaseDate:knownDate(old,row),publishedAt:old.publishedAt||row.publishedAt||'',verified:!!(old.verified||row.verified),sources:combinedSources(old,row)};}return items}
 const artists=mergeCards('artists',(a,b)=>!!clean(a.title)&&clean(a.title)===clean(b.title));
 const releases=mergeCards('releases',(a,b)=>a.kind===b.kind&&a.kind==='album'&&!!clean(a.artist)&&clean(a.artist)===clean(b.artist)&&clean(a.title)===clean(b.title));
 for(const release of releases){const members=tracks.filter(t=>t.albumId===release.id||t.album&&clean(t.album)===clean(release.title)&&clean(t.artist)===clean(release.artist));release.thumbs=covers(release,...members);release.thumb ||= release.thumbs[0]||''}
 return {tracks,artists,releases};
}
export function rankMusicCatalog(catalog,query){
 const wanted=new Set(clean(normalizeMusicQuery(query)).split(' ').filter(word=>word&&word!=='by'));
 const variants=new Set(['remix','cover','covers','slowed','sped','acapella','tribute','karaoke','live']);
 const score=track=>{const tokens=new Set(clean(track.title+' '+track.artist).split(' '));const hits=[...wanted].filter(word=>tokens.has(word)).length;const extras=[...tokens].filter(word=>!wanted.has(word));const titleExtras=title(track).split(' ').filter(word=>!wanted.has(word));const catalogOrder=Number.isFinite(track.catalogRank)?(0.3-Math.min(80,track.catalogRank)*0.003):0;return hits*10/Math.max(1,wanted.size)-titleExtras.length*.08-extras.filter(word=>variants.has(word)).length*3+catalogOrder};
 return {...catalog,tracks:[...(catalog.tracks||[])].sort((a,b)=>score(b)-score(a))};
}
