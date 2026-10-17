const validId=/^[A-Za-z0-9._-]+$/;
export function playlistSource(value){
 let u;try{u=new URL(value)}catch{throw Error('Paste a public SoundCloud, Spotify or Apple Music playlist link.')} 
 if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Use an HTTPS playlist link.');
 const parts=u.pathname.split('/').filter(Boolean);
 if(u.hostname==='open.spotify.com'){
  if(parts[0]?.startsWith('intl-'))parts.shift();if(parts[0]==='embed')parts.shift();
  if(parts.length===2&&parts[0]==='playlist'&&/^[A-Za-z0-9]{22}$/.test(parts[1]))return {provider:'Spotify',url:'https://open.spotify.com/embed/playlist/'+parts[1]};
 }
 if(u.hostname==='music.apple.com'&&parts.length===4&&/^[a-z]{2}$/.test(parts[0])&&parts[1]==='playlist'&&validId.test(parts[2])&&/^pl\.[A-Za-z0-9.-]+$/.test(parts[3]))return {provider:'Apple Music',url:'https://music.apple.com/'+parts.join('/')};
 if(['soundcloud.com','www.soundcloud.com'].includes(u.hostname)&&parts.length===3&&parts[1]==='sets'&&parts.every(p=>validId.test(p)))return {provider:'SoundCloud',url:'https://soundcloud.com/'+parts.join('/')};
 throw Error('Use a full public playlist link from SoundCloud, Spotify or Apple Music.');
}
export function parsePlaylistPage(html,provider){
 const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m=>{try{return [JSON.parse(m[1])]}catch{return []}});
 if(provider==='Spotify'){
  const entity=scripts.find(d=>d.props?.pageProps?.state?.data?.entity)?.props.pageProps.state.data.entity;
  if(entity?.type==='playlist'&&Array.isArray(entity.trackList))return {name:entity.name||entity.title,tracks:entity.trackList.filter(t=>t.entityType==='track').map(t=>({title:t.title,artist:t.subtitle,duration:Number(t.duration)/1000,thumb:entity.coverArt?.sources?.[0]?.url||''})),partial:true};
 }
 if(provider==='Apple Music'){
  const data=scripts.find(d=>Array.isArray(d.data)&&d.data[0]?.data?.sections)?.data[0].data;
  if(data){const schema=scripts.find(d=>d['@type']==='MusicPlaylist');const durations=new Map((schema?.track||[]).map(t=>{const m=String(t.duration||'').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);return [t.name,m?Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0):0]}));const sections=data.sections,header=sections.find(s=>s.itemKind==='containerDetailHeaderLockup')?.items?.[0];return {name:header?.title||'Imported playlist',tracks:sections.filter(s=>s.itemKind==='trackLockup').flatMap(s=>(s.items||[]).map(t=>({title:t.title,artist:(t.subtitleLinks||[]).map(a=>a.title).join(', '),duration:durations.get(t.title)||0,thumb:String(t.artwork?.dictionary?.url||'').replace('{w}','160').replace('{h}','160').replace('{f}','jpg')}))),partial:true}}
 }
 throw Error('This public playlist could not be read. It may be private or unavailable.');
}
export async function readPlaylist(value,{request=fetch,resolveSoundCloud}={}){
 const source=playlistSource(value);let data;
 if(source.provider==='SoundCloud')data=await resolveSoundCloud(source.url);
 else{
  const response=await request(source.url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'text/html'}});
  if(!response.ok)throw Error('The playlist is private or temporarily unavailable.');
  let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.length;if(size>4000000)throw Error('This playlist page is too large.');chunks.push(Buffer.from(chunk))}
  data=parsePlaylistPage(Buffer.concat(chunks).toString('utf8'),source.provider);
 }
 const tracks=(data.tracks||[]).filter(t=>t.title&&t.artist);if(!tracks.length)throw Error('No readable songs were found in this playlist.');
 return {provider:source.provider,name:String(data.name||'Imported playlist').slice(0,80),tracks:tracks.slice(0,200),partial:!!data.partial||tracks.length>200,total:tracks.length};
}
