const bounded=(work,ms)=>{let timer;return Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Music catalog timed out.')),ms);timer.unref?.()})]).finally(()=>clearTimeout(timer))};

export function mergeMusicCatalog(primary={},extra={}){
 const tracks=(primary.tracks||[]).map(t=>({...t})),seen=new Set(tracks.map(t=>t.id));
 for(const row of extra.tracks||[]){
  const original=tracks.find(t=>t.id==='sc:'+row.id?.replace(/^noah:/,''));
  if(original){original.album ||= row.album;original.thumb ||= row.thumb;continue;}
  if(!seen.has(row.id)){tracks.push(row);seen.add(row.id)}
 }
 const artists=[...(primary.artists||[])],names=new Set(artists.map(a=>a.title.toLowerCase()));
 for(const artist of extra.artists||[])if(!names.has(artist.title.toLowerCase())){artists.push(artist);names.add(artist.title.toLowerCase())}
 return {tracks,artists,releases:[...(primary.releases||[]),...(extra.releases||[])]};
}

export function createMusicProviderHandler({primary,service,alternative,noah}){
 return async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method))return primary(req,res);
  const params=new URL(req.url,'http://nova.local').searchParams,op=params.get('op')||'search';
  const reply=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data))};
  try{
   if(op==='noah-search')return reply(200,await noah.catalog(params.get('q')));
   if(op==='noah-collection')return reply(200,await noah.collection(params.get('id')));
   if(op==='noah-artist')return reply(200,await noah.artist(params.get('id')));
   if(op==='noah-audio')return await noah.audio(req,res,params.get('id'));
   if(op==='noah-art')return await noah.art(req,res,params.get('url'));
   if(op==='suggest'){
    const q=params.get('q');if(!q?.trim()||q.length>160)return reply(400,{error:'Enter a music search up to 160 characters.'});
    try{return reply(200,await bounded(service.suggest(q),2000))}
    catch{const data=await noah.catalog(q);return reply(200,{queries:[q,...data.tracks.slice(0,3).map(t=>t.title.slice(0,160))],artists:data.artists.slice(0,2),releases:data.releases.slice(0,2)})}
   }
   if(op==='catalog'){
    const q=params.get('q');if(!q?.trim()||q.length>160)return reply(400,{error:'Enter a music search up to 160 characters.'});
    const results=await Promise.allSettled([bounded(service.catalog(q),6000),bounded(noah.catalog(q),3500)]);
    if(results.every(x=>x.status==='rejected'))throw Error('Music search is temporarily unavailable. Please retry.');
    return reply(200,mergeMusicCatalog(results[0].status==='fulfilled'?results[0].value:{},results[1].status==='fulfilled'?results[1].value:{}));
   }
   if(op==='search'||op==='import-search'){
    const q=params.get('q');if(!q?.trim()||q.length>160)return reply(400,{error:'Enter a music search up to 160 characters.'});
    try{return reply(200,await bounded(op==='search'?service.search(q):service.importSearch(q),6000))}
    catch{return reply(200,await noah.search(q))}
   }
   if(op==='fallback'){
    const title=params.get('title'),artist=params.get('artist'),duration=Number(params.get('duration'));
    if(!title?.trim()||!artist?.trim()||title.length>200||artist.length>200||!Number.isFinite(duration)||duration<=0||duration>86400)return reply(400,{error:'A title, artist and duration are required to match alternative audio.'});
    const exclude=new Set((params.get('exclude')||'').split(','));
    const providers=[...(!exclude.has('void')?[()=>alternative.find(title,artist,duration)]:[]),...(!exclude.has('noah')?[()=>noah.find(title,artist,duration)]:[])];
    const attempts=providers.map(async find=>{const data=await find();if(!data.found)throw Error('No matching recording.');return data});
    const found=await Promise.any(attempts).catch(()=>({found:false}));
    return reply(200,found);
   }
   if(op==='album-info'&&/^noah:\d{1,20}$/.test(params.get('id')||'')){
    const match=await alternative.find(params.get('title'),params.get('artist'),Number(params.get('duration')));
    return reply(200,{album:match.album||'',albumId:match.albumId||''});
   }
   // Noah search IDs never go to SoundCloud's numeric artist/playlist routes.
   if(['collection','artist'].includes(op)&&String(params.get('id')).startsWith('noah:'))return reply(400,{error:'Use the Noah collection request.'});
   return primary(req,res);
  }catch(error){if(res.headersSent)return res.destroy();return reply(502,{error:error.message||'Music could not connect. Please retry.'})}
 };
}
