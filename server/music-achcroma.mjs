import {requestMusicAsset} from './music-asset-request.mjs';
import {Readable} from 'node:stream';
import {alternativeMatch,alternativeRange} from './music-alternative.mjs';
const ORIGIN='https://achcroma.voudouris.org';
const validTrack=id=>/^[A-Za-z0-9_-]{11}$/.test(String(id||''));
const text=v=>String(v||'').trim().slice(0,200);
const artwork=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['yt3.googleusercontent.com','i.ytimg.com','lh3.googleusercontent.com'].includes(u.hostname)?u.href:''}catch{return ''}};
export function normalizeAchcromaTrack(row){if(!validTrack(row?.id)||!row.title||!row.artist||!(Number(row.duration)>0&&Number(row.duration)<=86400))return null;const image=artwork(row.thumb);return {id:'ach:'+row.id,src:'ach',provider:'Achcroma',title:text(row.title),artist:text(row.artist),album:text(row.album),duration:Number(row.duration),thumb:image?'/api/soundcloud?op=ach-art&url='+encodeURIComponent(image):'',playable:true}}
export function parseAchcromaFeed(body){if(body.length>2000000)throw Error('Music catalog too large.');return body.split(/\r?\n/).filter(line=>line.startsWith('data:')).flatMap(line=>{try{const value=JSON.parse(line.slice(5).trim());return value&&typeof value==='object'?[value]:[]}catch{return []}})}
const context=(kind,query,group)=>'ach:'+Buffer.from(JSON.stringify({kind,query,group})).toString('base64url');
function readContext(id,kind){if(!/^ach:[A-Za-z0-9_-]{1,1400}$/.test(id||''))throw Error('Invalid music collection.');const c=JSON.parse(Buffer.from(id.slice(4),'base64url').toString());if(c.kind!==kind||typeof c.query!=='string'||!c.query.trim()||c.query.length>160||typeof c.group!=='string'||c.group.length>400)throw Error('Invalid music collection.');return c}
export function createAchcromaMusic({request=fetch,now=Date.now}={}){
 const cache=new Map();
 async function rows(query){const q=String(query||'').trim();if(!q||q.length>160)throw Error('Enter a music search up to 160 characters.');const hit=cache.get(q);if(hit?.expires>now())return hit.job;const job=(async()=>{const r=await request(new URL('/api/music/ytm/search?q='+encodeURIComponent(q)+'&limit=30',ORIGIN),{redirect:'error',signal:AbortSignal.timeout(4500),headers:{Accept:'text/event-stream'}});if(!r.ok)throw Error('Achcroma unavailable.');return parseAchcromaFeed(await r.text()).map(normalizeAchcromaTrack).filter(Boolean).slice(0,80)})();cache.set(q,{job,expires:now()+60000});if(cache.size>80)cache.delete(cache.keys().next().value);job.catch(()=>cache.delete(q));return job}
 async function catalog(query){const tracks=await rows(query),groups=new Map(),artists=new Map();for(const t of tracks){const group=t.artist+'|'+t.album;if(t.album&&!groups.has(group))groups.set(group,{id:context('collection',query,group),title:t.album,artist:t.artist,thumb:t.thumb,kind:'album',provider:'Achcroma',partial:true});if(!artists.has(t.artist))artists.set(t.artist,{id:context('artist',query,t.artist),title:t.artist,thumb:t.thumb,kind:'artist',provider:'Achcroma',verified:false})}return {tracks,releases:[...groups.values()],artists:[...artists.values()]}}
 async function collection(id){const c=readContext(id,'collection'),data=await catalog(c.query);return {release:data.releases.find(r=>r.id===id),tracks:data.tracks.filter(t=>t.artist+'|'+t.album===c.group),partial:true}}
 async function artist(id){const c=readContext(id,'artist'),data=await catalog(c.query);return {artist:data.artists.find(r=>r.id===id),tracks:data.tracks.filter(t=>t.artist===c.group),releases:data.releases.filter(t=>t.artist===c.group),partial:true}}
 async function find(title,artist,duration){const input={title:text(title),artist:text(artist),duration:Number(duration)};const tracks=await rows((input.artist+' '+input.title).slice(0,160));const match=tracks.find(t=>alternativeMatch(input,{...t,id:t.id.slice(4)}));return match?{found:true,provider:'Achcroma',title:match.title,artist:match.artist,duration:match.duration,thumb:match.thumb,url:'/api/soundcloud?op=ach-audio&id='+match.id.slice(4)}:{found:false}}
 async function audio(req,res,id){
  if(!validTrack(id))throw Error('Invalid Achcroma song.');
  let range;try{range=alternativeRange(req.headers?.range)}catch{res.statusCode=416;return res.end()}
  const response=await requestMusicAsset(request,new URL('/api/sp/audio/'+id,ORIGIN),{method:req.method,headers:{Range:range},res,timeout:8000});
  const actual=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('content-range')||''),[start,end]=range.slice(6).split('-').map(Number);
  if(response.status!==206||!/^audio\//i.test(response.headers.get('content-type')||'')||!actual||!actual.slice(1).every(v=>Number.isSafeInteger(Number(v)))||Number(actual[1])!==start||Number(actual[2])<start||Number(actual[2])>end||Number(actual[2])>=Number(actual[3])){await response.body?.cancel();throw Error('Achcroma could not provide resumable audio.');}
  res.statusCode=206;res.setHeader('Content-Type',response.headers.get('content-type'));res.setHeader('Content-Range',response.headers.get('content-range'));res.setHeader('Content-Length',String(Number(actual[2])-Number(actual[1])+1));res.setHeader('Accept-Ranges','bytes');res.setHeader('Cache-Control','private, max-age=60');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  if(req.method==='HEAD'||!response.body){await response.body?.cancel();return res.end()}
  const stream=Readable.fromWeb(response.body);res.once?.('close',()=>stream.destroy());stream.on('error',()=>res.destroy()).pipe(res);
 }
 async function art(req,res,value){
  const url=artwork(value);if(!url)throw Error('Unsupported Achcroma artwork.');
  const response=await request(url,{redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!response.ok||!/^image\/(?:jpeg|png|webp|avif)/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw Error('Artwork unavailable.');}
  res.setHeader('Content-Type',response.headers.get('content-type'));res.setHeader('Cache-Control','public, max-age=3600');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  if(req.method==='HEAD'||!response.body){await response.body?.cancel();return res.end()}
  Readable.fromWeb(response.body).on('error',()=>res.destroy()).pipe(res);
 }

 return {catalog,collection,artist,find,audio,art,search:async q=>({tracks:await rows(q)})};
}
