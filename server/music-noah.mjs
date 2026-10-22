import {Readable} from 'node:stream';
import {alternativeMatch,alternativeRange} from './music-alternative.mjs';

const ORIGIN='https://noahstutoring.academy';
const numeric=value=>/^\d{1,20}$/.test(String(value||''));
const text=value=>String(value||'').trim().slice(0,200);
const artwork=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(u.hostname==='resources.tidal.com'||u.hostname.endsWith('.sndcdn.com'))?u.href:''}catch{return ''}};
function contextId(kind,query,group){return 'noah:'+Buffer.from(JSON.stringify({kind,query,group})).toString('base64url')}
function readContext(value,kind){
 const token=String(value||'').replace(/^noah:/,'');
 if(!/^[A-Za-z0-9_-]{1,1400}$/.test(token))throw Error('Invalid Noah collection.');
 let data;try{data=JSON.parse(Buffer.from(token,'base64url').toString())}catch{throw Error('Invalid Noah collection.')}
 if(data.kind!==kind||typeof data.query!=='string'||!data.query.trim()||data.query.length>160||typeof data.group!=='string'||data.group.length>120)throw Error('Invalid Noah collection.');
 return data;
}
export function normalizeNoahTrack(row){
 if(!numeric(row?.id)||row.allowStreaming===false||row.presentation==='PREVIEW'||!row.title)return null;
 const artist=text((Array.isArray(row.artists)?row.artists:[]).slice(0,8).map(a=>a?.name).filter(Boolean).join(', ')||row.artist||row.artistName);
 const duration=Number(row.duration);
 if(!artist||!Number.isFinite(duration)||duration<=0||duration>86400)return null;
 // Noah's current album cards also include genres/uploader groupings. Only
 // explicit albums supply an album name; other groups become collections.
 const realAlbum=row.album?.type==='ALBUM'||row.album?.isAlbum===true;
 return {id:'noah:'+row.id,src:'noah',title:text(row.title),artist,duration,thumb:artwork(row.album?.cover||row.cover),album:realAlbum?text(row.album.title):'',albumId:'',isrc:/^[A-Z0-9]{12}$/i.test(row.isrc||'')?row.isrc:'',playable:true,provider:'Noah'};
}
export function createNoahMusic({request=fetch,now=Date.now}={}){
 const cache=new Map();
 async function json(path,ttl=90000){
  const hit=cache.get(path);if(hit?.expires>now())return hit.job;
  const job=(async()=>{const response=await request(new URL(path,ORIGIN),{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(8000)});if(!response.ok||!/^application\/json/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw Error('Noah music is temporarily unavailable.')}return response.json()})();
  const entry={job,expires:now()+ttl};cache.set(path,entry);if(cache.size>100)cache.delete(cache.keys().next().value);
  job.catch(()=>{if(cache.get(path)===entry)cache.delete(path)});return job;
 }
 async function rows(query){
  const q=String(query||'').trim();if(!q||q.length>160)throw Error('Enter a music search up to 160 characters.');
  const data=await json('/api/music/search/?s='+encodeURIComponent(q));
  if(!Array.isArray(data?.data?.items))throw Error('Noah returned an unexpected music catalog.');
  return data.data.items.slice(0,80).filter(row=>normalizeNoahTrack(row));
 }
 async function catalog(query){
  const q=String(query||'').trim(),items=await rows(q),tracks=items.map(normalizeNoahTrack),groups=new Map(),artists=new Map();
  for(const row of items){
   const t=normalizeNoahTrack(row),group=String(row.album?.id||'');
   if(/^[A-Za-z0-9_-]{1,120}$/.test(group)&&!groups.has(group)){
    const members=items.filter(x=>String(x.album?.id)===group);
    groups.set(group,{id:contextId('collection',q,group),title:text(row.album?.title)||t.artist+' tracks',artist:t.artist,thumb:t.thumb,kind:row.album?.isAlbum===true||row.album?.type==='ALBUM'?'album':'playlist',count:members.length,provider:'Noah',partial:true});
   }
   for(const a of (Array.isArray(row.artists)?row.artists:[]).slice(0,8)){const name=text(a?.name),id=String(a?.id||'');if(name&&numeric(id)&&!artists.has(id))artists.set(id,{id:contextId('artist',name.slice(0,160),id),title:name,kind:'artist',thumb:t.thumb,verified:false,followers:0,provider:'Noah'});}
  }
  return {tracks,releases:[...groups.values()].slice(0,20),artists:[...artists.values()].slice(0,12)};
 }
 async function collection(id){
  const ctx=readContext(id,'collection'),items=(await rows(ctx.query)).filter(row=>String(row.album?.id)===ctx.group);
  if(!items.length)throw Error('This Noah search collection is no longer available. Try searching again.');
  const data=await catalog(ctx.query),release=data.releases.find(x=>x.id===contextId('collection',ctx.query,ctx.group));
  return {release,tracks:items.map(normalizeNoahTrack),partial:true};
 }
 async function artist(id){
  const ctx=readContext(id,'artist'),items=(await rows(ctx.query)).filter(row=>(row.artists||[]).some(a=>String(a.id)===ctx.group));
  if(!items.length)throw Error('This Noah artist is unavailable. Try searching again.');
  const data=await catalog(ctx.query);
  return {artist:data.artists.find(x=>x.id===contextId('artist',ctx.query,ctx.group)),tracks:items.map(normalizeNoahTrack),releases:data.releases,partial:true};
 }
 async function find(title,artist,duration){
  const input={title:text(title),artist:text(artist),duration:Number(duration)};
  if(!input.title||!input.artist||!Number.isFinite(input.duration)||input.duration<=0||input.duration>86400)return {found:false};
  const candidates=await rows((input.artist+' '+input.title).slice(0,160));
  const match=candidates.map(normalizeNoahTrack).filter(t=>alternativeMatch(input,{...t,id:t.id.slice(5)})).sort((a,b)=>Math.abs(a.duration-input.duration)-Math.abs(b.duration-input.duration))[0];
  return match?{found:true,provider:'Noah',title:match.title,artist:match.artist,duration:match.duration,album:match.album,thumb:match.thumb,url:'/api/soundcloud?op=noah-audio&id='+match.id.slice(5)}:{found:false};
 }
 async function audio(req,res,id){
  if(!numeric(id))throw Error('Invalid Noah song.');
  let range;try{range=alternativeRange(req.headers?.range)}catch{res.statusCode=416;return res.end()}
  const data=await json('/api/music/stream?id='+id+'&quality=HIGH',45000);
  // Only a full, unprotected direct response from the documented public relay
  // is supported. Never follow arbitrary stream URLs or encrypted manifests.
  if(data.kind!=='direct'||data.presentation!=='FULL'||data.provider!=='soundcloud'||!new RegExp('^/api/music/file/'+id+'\\.(?:m4a|mp3)$').test(data.streamUrl||''))throw Error('Noah has no supported full audio for this song.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);timer.unref?.();res.once?.('close',()=>controller.abort());
  let response;try{response=await request(new URL(data.streamUrl,ORIGIN),{method:req.method,headers:{Range:range},redirect:'error',signal:controller.signal})}finally{clearTimeout(timer)}
  const actual=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('content-range')||''),[start,end]=range.slice(6).split('-').map(Number);
  if(response.status!==206||!/^audio\//i.test(response.headers.get('content-type')||'')||!actual||!actual.slice(1).every(v=>Number.isSafeInteger(Number(v)))||Number(actual[1])!==start||Number(actual[2])<start||Number(actual[2])>end||Number(actual[2])>=Number(actual[3])){await response.body?.cancel();throw Error('Noah could not provide resumable audio.');}
  res.statusCode=206;res.setHeader('Content-Type',response.headers.get('content-type'));res.setHeader('Content-Range',response.headers.get('content-range'));res.setHeader('Content-Length',String(Number(actual[2])-Number(actual[1])+1));res.setHeader('Accept-Ranges','bytes');res.setHeader('Cache-Control','private, max-age=60');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  if(req.method==='HEAD'||!response.body){await response.body?.cancel();return res.end()}
  const stream=Readable.fromWeb(response.body);res.once?.('close',()=>stream.destroy());stream.on('error',()=>res.destroy()).pipe(res);
 }
 async function art(req,res,value){
  const url=artwork(value);if(!url)throw Error('Unsupported Noah artwork.');
  const response=await request(url,{redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!response.ok||!/^image\/(?:jpeg|png|webp|avif)/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw Error('Artwork unavailable.');}
  res.setHeader('Content-Type',response.headers.get('content-type'));res.setHeader('Cache-Control','public, max-age=3600');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  if(req.method==='HEAD'||!response.body){await response.body?.cancel();return res.end()}
  Readable.fromWeb(response.body).on('error',()=>res.destroy()).pipe(res);
 }
 return {catalog,collection,artist,find,audio,art,search:async q=>({tracks:(await rows(q)).map(normalizeNoahTrack)})};
}
