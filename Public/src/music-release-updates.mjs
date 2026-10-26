const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function musicReleaseTime(item){
 const value=item?.releaseDate||item?.publishedAt;
 // A year alone cannot tell us whether an album dropped recently.
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}/.test(value))return 0;
 const time=Date.parse(value);if(!item.releaseDate&&/^\d{4}$/.test(String(item.year||''))&&String(item.year)!==value.slice(0,4))return 0;return Number.isFinite(time)?time:0;
}
export function isNewMusicRelease(item,now=Date.now()){const time=musicReleaseTime(item);return time>0&&time<=now&&now-time<=30*86400000}
export const musicReleaseKey=item=>[item.kind==='album'?'album':'song',normalize(item.artist),normalize(item.title)].join(':');
export function recentArtistReleases(catalogs,artists,now=Date.now()){
 const names=new Set(artists.map(normalize)),items=new Map();
 for(const catalog of catalogs)for(const item of [...(catalog.releases||[]).filter(r=>r.kind==='album'),...(catalog.tracks||[]).map(t=>({...t,kind:'song'}))]){
  if(!String(item.artist||'').split(/,\s*/).some(name=>names.has(normalize(name)))||!isNewMusicRelease(item,now))continue;
  const key=musicReleaseKey(item);if(!items.has(key))items.set(key,{...item,key});
 }
 return [...items.values()].sort((a,b)=>musicReleaseTime(b)-musicReleaseTime(a)).slice(0,30);
}
export function createMusicReleaseUpdates({storage,request=fetch,user='guest',now=Date.now,onChange=()=>{}}){
 const key='nova_music_release_updates:'+user;let seen=new Set(),items=[],checked=new Map(),pending=new Map(),generation=0,disposed=false,abort=new AbortController();
 try{seen=new Set(JSON.parse(storage.getItem(key)||'[]').filter(v=>typeof v==='string').slice(-200))}catch{}
 const notify=()=>onChange({items,unread:items.filter(item=>!seen.has(item.key)).length});
 return {
  async refresh(tracks){
   if(disposed)return;const version=++generation;
   const artists=[...new Map(tracks.flatMap(t=>String(t.artist||'').split(/,\s*/)).map(name=>name.trim()).filter(Boolean).map(name=>[normalize(name),name])).values()].slice(0,4);
   await Promise.allSettled(artists.map(artist=>{if(pending.has(artist))return pending.get(artist);const old=checked.get(artist);if(old&&now()-old.at<15*60000)return;const job=(async()=>{try{const response=await request('/api/soundcloud?op=catalog&q='+encodeURIComponent(artist),{signal:AbortSignal.any([abort.signal,AbortSignal.timeout(6500)])});if(!response.ok)throw Error('Unavailable');const data=await response.json();if(!disposed)checked.set(artist,{at:now(),data})}catch{/* Keep the last successful releases while offline. */}})().finally(()=>pending.delete(artist));pending.set(artist,job);return job}));
   if(disposed||version!==generation)return;while(checked.size>24)checked.delete(checked.keys().next().value);items=recentArtistReleases(artists.map(a=>checked.get(a)?.data||{}),artists,now());notify();
  },
  read(){items.forEach(item=>seen.add(item.key));try{storage.setItem(key,JSON.stringify([...seen].slice(-200)))}catch{}notify();return items},
  get items(){return items},
  dispose(){disposed=true;abort.abort();checked.clear()}
 };
}
