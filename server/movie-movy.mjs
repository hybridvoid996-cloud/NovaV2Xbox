const ORIGIN='https://www.movy.sx';
export function movyArtwork(value){
 if(typeof value!=='string')return '';
 const match=value.match(/^\/img\/(?:original|w\d+)\/([A-Za-z0-9_-]+\.(?:jpg|png|webp))(?:\/[^/?]+)?$/);
 return match?'https://image.tmdb.org/t/p/original/'+match[1]:'';
}
export function movyItem(raw){
 const id=String(raw?.tmdbId??raw?.id??''),type=raw?.mediaType;
 if(!/^\d{1,9}$/.test(id)||!['movie','tv'].includes(type))return null;
 return {id,type,title:String(raw.title||'Untitled').slice(0,300),year:String(raw.year||raw.release_date?.slice(0,4)||''),rating:Number(raw.score??raw.rating)||0,overview:String(raw.desc||raw.description||'').slice(0,15000),poster:movyArtwork(raw.poster),backdrop:movyArtwork(raw.background||raw.image),logo:movyArtwork(raw.logo||raw.billboard?.logoUrl),genres:(raw.categories||[]).filter(x=>typeof x==='string').slice(0,30),runtime:Number(raw.duration||raw.billboard?.runtime)||0,metadataSource:'movy'};
}
export function readMovyPage(html){
 const match=html.match(/<script\b[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
 if(!match||match[1].length>6000000)throw Error('Movy catalog format unavailable');
 const page=JSON.parse(match[1]).props?.pageProps;if(!page)throw Error('Movy catalog unavailable');return page;
}
export function normalizeMovyHome(page){
 const rails={},seen=new Set(),all=[];
 for(const section of [...(page.defaultSections||[]),...(page.trendingSections||[]),...(page.streamingSections||[]),{name:'airing_tv',movies:page.upcomingTv},{name:'recent_4k',movies:page.recent4k}]){
  const rows=(Array.isArray(section.movies)?section.movies:[]).map(movyItem).filter(Boolean);
  for(const item of rows){const key=item.type+':'+item.id;if(!seen.has(key)){seen.add(key);all.push(item)}}
  for(const type of ['movie','tv']){const results=rows.filter(x=>x.type===type);if(results.length)rails['movy_'+String(section.name).replace(/[^a-z0-9]/gi,'_')+'_'+type]={results};}
 }
 if(!all.length)throw Error('Movy returned no titles');return {hero:all[0],rails,results:all};
}
export function createMovyCatalog(request=fetch){
 const cache=new Map();async function read(path){const old=cache.get(path);if(old&&old.until>Date.now())return old.promise;
  const promise=request(ORIGIN+path,{signal:AbortSignal.timeout(5500),redirect:'error'}).then(async r=>{if(!r.ok)throw Error('Movy unavailable');const html=await r.text();if(html.length>8000000)throw Error('Movy response too large');return readMovyPage(html)}).catch(e=>{cache.delete(path);throw e});cache.set(path,{promise,until:Date.now()+180000});if(cache.size>80)cache.delete(cache.keys().next().value);return promise;}
 return async(op,p)=>{
  const type=p.get('type')||'movie',id=p.get('id')||'';
  if(op==='details'){
   if(!['movie','tv'].includes(type)||!/^\d{1,9}$/.test(id))throw Error('Unsupported Movy identifier');
   const page=await read('/'+type+'/'+id),raw=page.details,item=movyItem(raw);
   if(!item||item.id!==id||item.type!==type)throw Error('Movy title did not match');
   return {...item,cast:(raw.actors||[]).slice(0,30).map(a=>({name:String(a.name||''),character:String(a.label||''),photo:movyArtwork(a.avatar)})),seasons:(raw.seasons||[]).map(s=>({number:s.season_number,name:s.name,episodeCount:s.episode_count,poster:/^\/[A-Za-z0-9_.-]+$/.test(s.poster_path||'')?'https://image.tmdb.org/t/p/original'+s.poster_path:''})),trailer:/^[\w-]{11}$/.test(raw.trailerId||'')?{site:'YouTube',key:raw.trailerId,name:'Official trailer'}:undefined,recommendations:(raw.recommendations||[]).map(movyItem).filter(Boolean)};
  }
  if(!['home','browse','search'].includes(op))throw Error('Movy operation unavailable');
  const home=normalizeMovyHome(await read('/'));
  if(op==='search'){const q=(p.get('q')||'').trim().toLowerCase();if(!q||q.length>120)throw Error('Invalid search');return {results:home.results.filter(i=>i.title.toLowerCase().includes(q))};}
  if(op==='browse')return {hero:home.results.find(i=>i.type===type),rails:Object.fromEntries(Object.entries(home.rails).map(([k,v])=>[k,{results:v.results.filter(i=>i.type===type)}]).filter(([,v])=>v.results.length))};
  return {hero:home.hero,rails:home.rails};
 };
}
