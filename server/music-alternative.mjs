import {requestMusicAsset} from './music-asset-request.mjs';
import {Readable} from 'node:stream';
const ORIGIN='https://vng.lol';
const numeric=value=>/^\d{1,20}$/.test(String(value||''));
const cover=value=>/^[A-Za-z0-9_+=/-]{1,1000}$/.test(value||'')?'/api/soundcloud?op=void-art&token='+encodeURIComponent(value):'';
const voidTrack=t=>numeric(t?.id)&&t.title&&t.artist?{id:'void:'+t.id,src:'void',provider:'Void',releaseDate:String(t.releaseDate||t.release_date||''),title:String(t.title).slice(0,200),artist:String(t.artist).slice(0,200),duration:Number(t.duration)||0,album:String(t.album||''),albumId:numeric(t.albumId)?'void:'+t.albumId:'',thumb:cover(t.art),playable:true}:null;
const voidAlbum=a=>numeric(a?.id)&&a.title&&a.artist?{id:'void:'+a.id,title:String(a.title).slice(0,200),artist:String(a.artist).slice(0,200),thumb:cover(a.art),kind:'album',provider:'Void',releaseDate:String(a.releaseDate||a.release_date||''),year:String(a.year||''),count:Number(a.trackCount)||0}:null;
const voidArtist=a=>numeric(a?.id)&&(a.name||a.title)?{id:'void:'+a.id,title:String(a.name||a.title).slice(0,200),kind:'artist',provider:'Void',thumb:cover(a.art),verified:false,followers:0}:null;
// Keep each progressive audio response below hosted function payload limits.
export function alternativeRange(value){const match=/^bytes=(\d+)-(\d*)$/.exec(value||'bytes=0-');if(!match)throw Error('Unsupported audio range.');const start=Number(match[1]),requested=match[2]?Number(match[2]):Infinity;if(!Number.isSafeInteger(start)||start<0||(requested!==Infinity&&!Number.isSafeInteger(requested))||requested<start)throw Error('Unsupported audio range.');return `bytes=${start}-${Math.min(start+1048575,requested)}`}
const clean=value=>String(value||'').replace(/[\[(]\s*prod(?:uced)?\.?[^\])]*[\])]/gi,'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(?:official (?:audio|video)|lyrics? video)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export function alternativeMatch(input,candidate){
 const artist=clean(input.artist),name=clean(input.title).replace(new RegExp('^'+artist+' '),'');
 const by=clean(candidate.artist),actual=clean(candidate.title).replace(new RegExp('^'+by+' '),'');
 const duration=Number(input.duration),length=Number(candidate.duration);
 return !!artist&&!!name&&by===artist&&actual===name&&Number.isFinite(duration)&&duration>0&&Number.isFinite(length)&&length>0&&Math.abs(length-duration)<=Math.max(6,Math.min(12,duration*.05))&&/^(?:\d{1,20}|[A-Za-z0-9_-]{11})$/.test(String(candidate.id));
}
export function createAlternativeMusic({request=fetch,now=Date.now}={}){
 const cache=new Map(),pending=new Map(),metadata=new Map();
 async function catalog(path,signal){
  const hit=metadata.get(path);if(hit?.expires>now())return hit.job;
  const job=request(new URL(path,ORIGIN),{headers:{Accept:'application/json'},redirect:'error',signal}).then(async response=>{if(!response.ok)throw Error('Alternative music is temporarily unavailable.');return response.json()});
  const entry={job,expires:now()+120000};metadata.set(path,entry);
  if(metadata.size>100)metadata.delete(metadata.keys().next().value);
  job.catch(()=>{if(metadata.get(path)===entry)metadata.delete(path)});return job;
 }
 async function search(query){
  const q=String(query||'').trim();if(!q||q.length>160)throw Error('Enter a music search up to 160 characters.');
  const url=new URL('/~a/api/search',ORIGIN);url.searchParams.set('q',q);
  const response=await request(url,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(7000)});if(!response.ok)throw Error('Voidify search is unavailable.');
  const data=await response.json();return {tracks:(Array.isArray(data.tracks)?data.tracks:[]).filter(t=>/^\d{1,20}$/.test(String(t.id))&&t.title&&t.artist).slice(0,40).map(t=>({id:String(t.id),title:String(t.title).slice(0,200),artist:String(t.artist).slice(0,200),album:String(t.album||'').slice(0,200),duration:Math.max(0,Number(t.duration)||0),art:/^[A-Za-z0-9_+=/-]{1,1000}$/.test(t.art||'')?t.art:''}))};
 }
 async function searchCatalog(query){
  const q=String(query||'').trim();if(!q||q.length>160)throw Error('Enter a music search up to 160 characters.');
  const data=await catalog('/~a/api/search?q='+encodeURIComponent(q),AbortSignal.timeout(7000));
  return {tracks:(data.tracks||[]).slice(0,80).map((t,index)=>{const track=voidTrack(t);return track?{...track,catalogRank:index}:null}).filter(Boolean),releases:(data.albums||[]).slice(0,60).map(voidAlbum).filter(Boolean),artists:(data.artists||[]).slice(0,20).map(voidArtist).filter(Boolean)};
 }
 async function artist(id){
  if(!numeric(id))throw Error('Invalid artist.');
  const data=await catalog('/~a/api/artist/'+id,AbortSignal.timeout(7000));
  const item=voidArtist({...data,id});if(!item)throw Error('This artist is unavailable.');
  return {artist:item,tracks:(data.topTracks||data.tracks||[]).slice(0,100).map(voidTrack).filter(Boolean),releases:(data.albums||[]).slice(0,100).map(voidAlbum).filter(Boolean)};
 }
 async function art(req,res,token){
  if(!/^[A-Za-z0-9_+=/-]{1,1000}$/.test(String(token||'')))throw Error('Invalid cover.');
  const url=new URL('/~a/img',ORIGIN);url.searchParams.set('u',token);
  const response=await request(url,{redirect:'error',signal:AbortSignal.timeout(7000)});if(!response.ok||!/^image\/(?:jpeg|png|webp|avif)/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw Error('Cover unavailable.');}
  res.setHeader('Content-Type',response.headers.get('content-type'));res.setHeader('Cache-Control','public, max-age=3600');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  if(req.method==='HEAD'){await response.body?.cancel();return res.end()}
  Readable.fromWeb(response.body).on('error',()=>res.destroy()).pipe(res);
 }
 async function find(title,artist,duration){
  const input={title:String(title||'').trim(),artist:String(artist||'').trim(),duration:Number(duration)};
  if(!input.title||!input.artist||input.title.length>200||input.artist.length>200||!Number.isFinite(input.duration)||input.duration<=0||input.duration>86400)throw Error('A title, artist and duration are required to match alternative audio.');
  const key=JSON.stringify(input),hit=cache.get(key);if(hit?.expires>now())return hit.data;if(pending.has(key))return pending.get(key);
  const job=(async()=>{
   const signal=AbortSignal.timeout(5000);
   const data=await catalog('/~a/api/search?q='+encodeURIComponent(input.artist+' '+input.title),signal);
   const choose=tracks=>(Array.isArray(tracks)?tracks:[]).filter(track=>alternativeMatch(input,track)).sort((a,b)=>Math.abs(Number(a.duration)-input.duration)-Math.abs(Number(b.duration)-input.duration))[0];
   let match=choose(data.tracks);
   if(!match){
    try{
     const artistData=await catalog('/~a/api/search?q='+encodeURIComponent(input.artist),signal);
     match=choose(artistData.tracks);
     if(!match){
      const albums=[...(Array.isArray(data.albums)?data.albums:[]),...(Array.isArray(artistData.albums)?artistData.albums:[])];
      const ids=[...new Set(albums.filter(album=>clean(album.artist)===clean(input.artist)&&/^\d{1,20}$/.test(String(album.id))).map(album=>String(album.id)))].slice(0,12);
      const results=await Promise.allSettled(ids.map(id=>catalog('/~a/api/album/'+id,signal)));
      match=choose(results.flatMap(result=>result.status==='fulfilled'&&Array.isArray(result.value.tracks)?result.value.tracks:[]));
     }
    }catch{/* An unavailable album index must not replace the selected recording. */}
   }
   const result=match?{found:true,provider:'Voidify',title:String(match.title),artist:String(match.artist),duration:Number(match.duration),album:String(match.album||''),albumId:/^\d{1,20}$/.test(String(match.albumId))?'void:'+match.albumId:'',thumb:/^[A-Za-z0-9_+=/-]{1,1000}$/.test(match.art||'')?'/api/soundcloud?op=void-art&token='+encodeURIComponent(match.art):'',url:'/api/soundcloud?op=alternate-audio&id='+match.id}:{found:false};
   if(cache.size>=80)cache.delete(cache.keys().next().value);cache.set(key,{data:result,expires:now()+(match?120000:30000)});return result;
  })().finally(()=>pending.delete(key));pending.set(key,job);return job;
 }
 async function audio(req,res,id){
  if(!/^\d{1,20}$/.test(String(id)))throw Error('Invalid alternative song.');
  let range;try{range=alternativeRange(req.headers?.range)}catch{res.statusCode=416;return res.end()}
  const headers={Range:range};
  // The deadline covers connection setup, not the lifetime of the song body.
  const response=await requestMusicAsset(request,new URL('/~a/stream/'+id,ORIGIN),{method:req.method,headers,res,timeout:20000});
  if(!response.ok||!/^audio\//i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw Error('The alternative audio stream is unavailable.');}
  const actualRange=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('content-range')||'');
  if(response.status===206&&(!actualRange||Number(actualRange[1])!==Number(range.slice(6).split('-')[0])||Number(actualRange[2])<Number(actualRange[1])||Number(actualRange[2])-Number(actualRange[1])+1>1048576)){await response.body?.cancel();throw Error('The alternative audio range is invalid.');}
  if(req.method!=='HEAD'&&response.status===200&&(!Number.isSafeInteger(Number(response.headers.get('content-length')))||!response.headers.get('content-length')||Number(response.headers.get('content-length'))>4194304)){await response.body?.cancel();throw Error('The audio provider did not support resumable playback.');}
  res.statusCode=response.status;res.setHeader('Content-Type',response.headers.get('content-type'));res.setHeader('Cache-Control','private, max-age=120');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  for(const name of ['content-length','content-range','accept-ranges'])if(response.headers.get(name))res.setHeader(name,response.headers.get(name));
  if(actualRange&&!response.headers.get('content-length'))res.setHeader('Content-Length',String(Number(actualRange[2])-Number(actualRange[1])+1));
  if(req.method==='HEAD'||!response.body){await response.body?.cancel();return res.end()}
  const stream=Readable.fromWeb(response.body);res.once?.('close',()=>stream.destroy());stream.on('error',()=>res.destroy()).pipe(res);
 }
 async function album(id){
  if(!/^\d{1,20}$/.test(String(id)))throw Error('Invalid album.');
  const data=await catalog('/~a/api/album/'+id,AbortSignal.timeout(7000));
  return {release:voidAlbum({...data,id,trackCount:data.trackCount||data.tracks?.length}),tracks:(data.tracks||[]).map(t=>voidTrack({...t,album:data.title,albumId:id})).filter(Boolean)};
 }
 return {find,audio,search,catalog:searchCatalog,artist,art,album};
}
