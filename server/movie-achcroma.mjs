export const ACHCROMA='https://achcroma.voudouris.org';
const art=value=>typeof value==='string'&&/^\/[A-Za-z0-9_.-]+$/.test(value)?'https://image.tmdb.org/t/p/original'+value:typeof value==='string'&&/^https:\/\/image\.tmdb\.org\/t\/p\//.test(value)?value:'';
export function achcromaItem(raw){if(!raw||!/^\d{1,9}$/.test(String(raw.id))||!['movie','tv'].includes(raw.media))return null;return {id:String(raw.id),type:raw.media,title:String(raw.title||'Untitled').slice(0,300),year:String(raw.year||''),rating:Number(raw.rating)||0,overview:String(raw.overview||'').slice(0,15000),poster:art(raw.poster),backdrop:art(raw.backdrop),genres:Array.isArray(raw.genres)?raw.genres.filter(v=>typeof v==='string').slice(0,30):[],runtime:Number(raw.runtime)||0,isAnime:raw.anime===true,metadataSource:'achcroma'}}
const items=rows=>(Array.isArray(rows)?rows:[]).map(achcromaItem).filter(Boolean);
export function normalizeAchcroma(op,raw,type='movie'){
 if(op==='search')return {results:items(raw.results)};
 if(op==='achcromaList')return {results:items(raw.items),page:Number(raw.page)||1,totalPages:Math.min(50,Number(raw.total_pages)||1)};
 if(op==='season')return {episodes:(raw.episodes||[]).map(e=>({number:Number(e.number),name:String(e.name||''),overview:String(e.overview||''),still:art(e.still),runtime:Number(e.runtime)||0,airDate:e.air_date||'',rating:Number(e.rating)||0})).filter(e=>Number.isSafeInteger(e.number)&&e.number>=1)};
 if(op==='details'){const item=achcromaItem(raw);if(!item)throw Error('Title unavailable');return {...item,tagline:String(raw.tagline||''),cast:(raw.cast||[]).slice(0,30).map(c=>({name:String(c.name||''),character:String(c.character||''),photo:art(c.photo)})),seasons:(raw.seasons||[]).map(s=>({...s,episodeCount:Number(s.episodes)||0,poster:art(s.poster)})),trailer:/^[\w-]{11}$/.test(raw.trailer||'')?{site:'YouTube',key:raw.trailer,name:'Official trailer'}:undefined,recommendations:items(raw.recommendations)}}
 if(!Array.isArray(raw.rows))throw Error('Achcroma catalog unavailable');
 const rails={},suffix=type==='anime'?'anime':type==='tv'?'tv':'movies',add=(key,list)=>{rails[key]||={results:[]};const seen=new Set(rails[key].results.map(item=>item.type+':'+item.id));for(const item of items(list))if(!seen.has(item.type+':'+item.id)){seen.add(item.type+':'+item.id);rails[key].results.push(item)}};
 add('popular_'+suffix,raw.top10);add('trending_'+suffix,raw.hero);
 for(const row of raw.rows){const title=String(row.title||'').toLowerCase();let key=title.includes('trending')?'trending_'+suffix:title.includes('top rated')?'top_rated_'+suffix:title.includes('cinema')?'new_releases':title.includes('air')?'airing_'+suffix:title.includes('popular')?'popular_'+suffix:'achcroma_'+suffix+'_'+String(row.index||0);add(key,row.items)}
 if(!Object.values(rails).some(row=>row.results.length))throw Error('Achcroma returned no titles');return {hero:items(raw.hero)[0],rails};
}
export function createAchcromaCatalog(request=fetch){const cache=new Map();async function read(path){const old=cache.get(path);if(old&&old.until>Date.now())return old.promise;const promise=request(ACHCROMA+'/api/movies'+path,{signal:AbortSignal.timeout(5500),redirect:'error'}).then(async r=>{if(!r.ok)throw Error('Achcroma unavailable');return r.json()}).catch(e=>{cache.delete(path);throw e});cache.set(path,{until:Date.now()+180000,promise});if(cache.size>150)cache.delete(cache.keys().next().value);return promise}
 return async(op,p)=>{const type=p.get('type')||'movie',id=p.get('id')||'',season=p.get('season')||'1';
  if(['details','season'].includes(op)&&(!/^\d{1,9}$/.test(id)||!['movie','tv'].includes(type)||!/^\d{1,3}$/.test(season)))throw Error('Invalid title identifier');
  if(op==='details')return normalizeAchcroma(op,await read('/title/'+type+'/'+id));
  if(op==='season')return normalizeAchcroma(op,await read('/season/'+id+'/'+season));
  if(op==='search')return normalizeAchcroma(op,await read('/search?'+new URLSearchParams({type:'all',q:p.get('q')||''})));
  if(op==='achcromaList'){const page=p.get('page')||'1';if(!['movie','tv','anime'].includes(type)||!/^\d{1,2}$/.test(page)||+page<1||+page>50)throw Error('Choose a catalog page from 1 to 50');return normalizeAchcroma(op,await read('/list?'+new URLSearchParams({type,row:'1',page,sort:'popular'})),type)}
  const kinds=op==='home'?['movie','tv','anime']:[op==='anime'?'anime':type];const results=await Promise.allSettled(kinds.map(async kind=>normalizeAchcroma('home',await read('/home?type='+kind),kind)));const catalogs=results.filter(v=>v.status==='fulfilled').map(v=>v.value);if(!catalogs.length)throw Error('Achcroma catalog unavailable');return {hero:catalogs[0].hero,rails:Object.assign({},...catalogs.map(c=>c.rails))};
 };
}
