import {findPublicRecording} from './music-public-match.mjs';
const bounded=(work,ms)=>{let timer;return Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Music catalog timed out.')),ms);timer.unref?.()})]).finally(()=>clearTimeout(timer))};

import {mergeMusicCatalog,rankMusicCatalog,normalizeMusicQuery} from './music-catalog.mjs';
export {mergeMusicCatalog,rankMusicCatalog} from './music-catalog.mjs';

export function createMusicProviderHandler({primary,service,alternative,noah,achcroma}){
 const cache=new Map();
 async function unified(query,mode='catalog'){
  const q=normalizeMusicQuery(query).slice(0,160),key=mode+':'+q.toLowerCase(),hit=cache.get(key);
  if(hit?.expires>Date.now())return hit.job;
  const entry={expires:Date.now()+45000};
  entry.job=(async()=>{
   const primaryMode=mode==='catalog'?'catalog':mode==='import-search'?'importSearch':'search';
   const secondaryMode=mode==='catalog'?'catalog':'search';
   const results=await Promise.allSettled([
    bounded(Promise.resolve().then(()=>service[primaryMode](q)),4500),
    bounded(Promise.resolve().then(()=>noah[secondaryMode](q)),4500),
    bounded(Promise.resolve().then(()=>alternative.catalog?alternative.catalog(q):alternative.search(q).then(data=>({tracks:(data.tracks||[]).map(t=>({...t,id:'void:'+t.id,src:'void',thumb:t.art?'/api/soundcloud?op=void-art&token='+encodeURIComponent(t.art):'',playable:true}))}))),4500)
    ,...(achcroma?[bounded(Promise.resolve().then(()=>achcroma[secondaryMode](q)),4500)]:[])
   ]);
   if(results.every(result=>result.status==='rejected'))throw Error('Music search is temporarily unavailable. Please retry.');
   if(results.some(result=>result.status==='rejected'))entry.expires=Date.now()+10000;
   return {...rankMusicCatalog(results.reduce((catalog,result)=>result.status==='fulfilled'?mergeMusicCatalog(catalog,result.value):catalog,{}),q),catalogSources:results.flatMap((r,i)=>r.status==='fulfilled'?[['SoundCloud','Noah','Void','Achcroma'][i]]:[])};
  })();cache.set(key,entry);if(cache.size>80)cache.delete(cache.keys().next().value);entry.job.catch(()=>{if(cache.get(key)===entry)cache.delete(key)});return entry.job;
 }
 return async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method))return primary(req,res);
  const params=new URL(req.url,'http://nova.local').searchParams,op=params.get('op')||'search';
  const reply=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data))};
  try{
   if(achcroma&&/^ach-(search|collection|artist|audio|art)$/.test(op)){const action=op.slice(4);if(action==='audio')return await achcroma.audio(req,res,params.get('id'));if(action==='art')return await achcroma.art(req,res,params.get('url'));return reply(200,await achcroma[action==='search'?'catalog':action](params.get(action==='search'?'q':'id')))}
   if(op==='noah-search')return reply(200,await noah.catalog(params.get('q')));
   if(op==='noah-collection')return reply(200,await noah.collection(params.get('id')));
   if(op==='noah-artist')return reply(200,await noah.artist(params.get('id')));
   if(op==='noah-audio')return await noah.audio(req,res,params.get('id'));
   if(op==='noah-art')return await noah.art(req,res,params.get('url'));
   if(op==='suggest'){
    const q=params.get('q');if(!q?.trim()||q.length>160)return reply(400,{error:'Enter a music search up to 160 characters.'});
    try{const data=await bounded(unified(q),2000);return reply(200,{queries:[q,...data.tracks.slice(0,3).map(t=>t.title.slice(0,160))],artists:data.artists.slice(0,2),releases:data.releases.slice(0,2)})}catch{return reply(200,{queries:[q],artists:[],releases:[]})}
   }
   if(['catalog','search','import-search'].includes(op)){
    const q=params.get('q');if(!q?.trim()||q.length>160)return reply(400,{error:'Enter a music search up to 160 characters.'});
    return reply(200,await unified(q,op));
   }
   if(['collection','artist'].includes(op)){
    const id=String(params.get('id')||'');let data;
    if(id.startsWith('ach:')&&achcroma)data=await achcroma[op](id);
    else if(id.startsWith('noah:'))data=await noah[op](id);
    else if(id.startsWith('void:'))data=await alternative[op==='collection'?'album':'artist'](id.slice(5));
    else data=await service[op](id);
    if(op==='artist'&&data.artist?.title){try{const extra=await unified(data.artist.title);const merged=mergeMusicCatalog(data,extra);data={...data,...merged,artist:{...data.artist,verified:data.artist.verified||merged.artists.some(a=>a.title.toLowerCase()===data.artist.title.toLowerCase()&&a.verified)}}}catch{}}
    return reply(200,data);
   }
   if(op==='fallback'){
    const title=params.get('title'),artist=params.get('artist'),duration=Number(params.get('duration'));
    if(!title?.trim()||!artist?.trim()||title.length>200||artist.length>200||!Number.isFinite(duration)||duration<=0||duration>86400)return reply(400,{error:'A title, artist and duration are required to match alternative audio.'});
    const exclude=new Set((params.get('exclude')||'').split(','));
    const providers=[...(achcroma&&!exclude.has('ach')?[()=>achcroma.find(title,artist,duration)]:[]),...(!exclude.has('void')?[()=>alternative.find(title,artist,duration)]:[]),...(!exclude.has('noah')?[()=>noah.find(title,artist,duration)]:[])];
    const attempts=providers.map(async find=>{const data=await bounded(Promise.resolve().then(find),4500);if(!data.found)throw Error('No matching recording.');return data});
    let found=await Promise.any(attempts).catch(()=>({found:false}));if(!found.found&&!exclude.has('sc')&&service.search&&service.stream)found=await bounded(findPublicRecording(service,{title,artist,duration,id:params.get('id')}),5000).catch(()=>({found:false}));
    return reply(200,found);
   }
   if(op==='album-info'&&/^noah:\d{1,20}$/.test(params.get('id')||'')){
    const match=await alternative.find(params.get('title'),params.get('artist'),Number(params.get('duration')));
    return reply(200,{album:match.album||'',albumId:match.albumId||''});
   }
   return primary(req,res);
  }catch(error){if(res.headersSent)return res.destroy();return reply(502,{error:error.message||'Music could not connect. Please retry.'})}
 };
}
