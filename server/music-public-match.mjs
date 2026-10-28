const clean=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(?:official audio|official video|lyrics video|audio only)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export function publicRecordingMatch(input,candidate){
 const artist=clean(input.artist),title=clean(input.title),actual=clean(candidate.title),by=clean(candidate.artist);
 if(!artist||!title||candidate.id===input.id)return false;
 const variant=/\b(remix|cover|karaoke|instrumental|live|slowed|sped|nightcore|8d|edit|remaster)\b/g;
 if(JSON.stringify(title.match(variant)||[])!==JSON.stringify(actual.match(variant)||[]))return false;
 const names=[title,artist+' '+title,title+' '+artist];
 const sameTitle=names.includes(actual)||actual===title.replace(new RegExp('^'+artist+' '),'');
 const artistEvidence=by===artist||actual.startsWith(artist+' ')||actual.endsWith(' '+artist);
 return sameTitle&&artistEvidence&&candidate.duration>0&&input.duration>0&&Math.abs(candidate.duration-input.duration)<=Math.max(6,Math.min(12,input.duration*.05));
}
export async function findPublicRecording(service,input){
 const queries=[input.artist+' '+input.title,input.title+' '+input.artist];
 const seen=new Set();for(const q of [...new Set(queries.map(q=>q.slice(0,160)))]){
  const results=await service.search(q);for(const track of results.tracks||[]){if(seen.has(track.id)||!publicRecordingMatch(input,track))continue;seen.add(track.id);
   try{const stream=await service.stream(track.id);if(stream.mode!=='soundcloud'&&stream.url)return {...stream,found:true,provider:'sc'}}catch{}
   if(seen.size>=3)return {found:false};
  }
 }return {found:false};
}
