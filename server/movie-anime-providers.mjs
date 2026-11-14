// Public anime catalog adapters. IDs are verified AniList IDs, never site-local IDs.
const ANI='https://ani.pm',HI='https://hianime.ms';
const idOK=value=>/^\d{1,8}$/.test(String(value))&&Number(value)>0;
const text=value=>String(value||'').replace(/<[^>]*>/g,'').trim();
export function animeArtwork(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error();if(u.origin===ANI&&((u.pathname==='/api/anime/cover'&&/^key=[a-f0-9]{64}$/.test(u.searchParams.toString()))||/^\/img\/covers\/[\w.-]+$/.test(u.pathname)))return u;if(u.origin===HI&&/^\/images\/(?:poster|backdrop)\/[\w.-]+$/.test(u.pathname))return u}catch{}throw Error('Unsupported anime artwork')}
const art=value=>{try{return animeArtwork(new URL(value,ANI).href).href}catch{return ''}};
export function providerAnimeItem(row){
 if(!row||!idOK(row.anilistId)||!text(row.title)||row.isAdult||(Array.isArray(row.genres)&&row.genres.some(g=>/hentai|erotica/i.test(g))))return null;
 return {id:String(row.anilistId),type:'anime',title:text(row.title),year:row.year||'',poster:art(row.poster),backdrop:art(row.banner||row.heroBackdrop),overview:text(row.synopsis),rating:row.score||undefined,genres:Array.isArray(row.genres)?row.genres:[],episodes:Number(row.episodeCount)||0,runtime:parseInt(row.duration)||undefined,status:row.status};
}
export function normalizeAnimeFeed(payload){
 const feed=payload?.feed||{},pick=(pattern)=>{const entry=Object.entries(feed).find(([key])=>pattern.test(key));return {results:(entry?.[1]?.items||[]).map(providerAnimeItem).filter(Boolean)}};
 const rails={popular_anime:pick(/top-watched\?range=week/),trending_anime:pick(/browse\?sort=trending/),airing_anime:pick(/catalog\?sort=newest/)};
 if(!Object.values(rails).some(r=>r.results.length))throw Error('Anime provider returned no identified titles');return {rails,source:'ani.pm'};
}
export function hianimeIdentity(html,id){
 if(!idOK(id)||!new RegExp('https://anilist\\.co/anime/'+id+'(?:["/])').test(html))return null;
 const match=html.match(/href="(?:https:\/\/hianime\.ms)?(\/watch-[a-z0-9-]+-episode-1-[a-z0-9]+)"/i);if(!match)return null;
 return {provider:'hianime',id:String(id),path:match[1].replace('-episode-1-','-episode-{episode}-')};
}
export function createAnimeProviders(request=fetch){
 const cache=new Map();
 const read=async(url,json=true)=>{const r=await request(url,{headers:{Accept:json?'application/json':'text/html'},signal:AbortSignal.timeout(3500),redirect:'error'});if(!r.ok)throw Error('Anime provider unavailable');return json?r.json():r.text()};
 const memo=(key,fn)=>{let value=cache.get(key);if(!value||value.until<Date.now()){const promise=Promise.resolve().then(fn).catch(e=>{cache.delete(key);throw e});value={promise,until:Date.now()+300000};cache.set(key,value);if(cache.size>100)cache.delete(cache.keys().next().value)}return value.promise};
 async function hianime(id,title){return memo('hi:'+id,async()=>{const html=await read(HI+'/search?q='+encodeURIComponent(title),false);const paths=[...new Set([...html.matchAll(/href="(?:https:\/\/hianime\.ms)?(\/details\/[a-z0-9-]+)"/gi)].map(m=>m[1]))].slice(0,4);if(!paths.length)return null;const rows=await Promise.all(paths.map(async path=>{try{return hianimeIdentity(await read(HI+path,false),id)}catch{return null}}));return rows.find(Boolean)||null})}
 return {
  catalog:()=>memo('catalog',async()=>normalizeAnimeFeed(await read(ANI+'/api/anime/home-feed?content=3'))),
  search:q=>memo('search:'+q,async()=>({results:((await read(ANI+'/api/anime/search?q='+encodeURIComponent(q))).items||[]).map(providerAnimeItem).filter(Boolean)})),
  details:id=>memo('detail:'+id,async()=>{if(!idOK(id))throw Error('Invalid anime ID');const m=await read(ANI+'/api/anime/ani/'+id+'?phase=core');if(String(m.anilistId)!==String(id))throw Error('Anime provider returned a different title');const row=providerAnimeItem(m);if(!row)throw Error('Anime title unavailable');const route=String(m.routeId||'');const players=/^[a-z0-9][a-z0-9-]{1,160}$/i.test(route)?[{provider:'anipm',id:String(id),path:'/ani/'+route}]:[];
   let timer;const hi=await Promise.race([hianime(id,row.title).catch(()=>null),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),1400)})]).finally(()=>clearTimeout(timer));if(hi)players.push(hi);
   const episodeItems=(m.episodes||[]).filter(e=>Number.isInteger(e.number)&&e.number>0).map(e=>({number:e.number,name:text(e.title)||'Episode '+e.number,still:art(e.thumbnail),overview:text(e.description)}));
   return {...row,episodeItems,seasons:row.episodes?[{id:String(id),number:1,name:'Episodes',episodeCount:row.episodes}]:[],animePlayers:players,source:'ani.pm'};
  })
 };
}
