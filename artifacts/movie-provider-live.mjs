import {createAnimeProviders} from '../server/movie-anime-providers.mjs';
const api=createAnimeProviders();
for(const [name,run] of [['catalog',()=>api.catalog()],['search',()=>api.search('One Piece')],['details',()=>api.details('21')]]){
 const at=Date.now();try{const d=await run();console.log(JSON.stringify({name,ms:Date.now()-at,rows:d.results?.length,rails:d.rails&&Object.fromEntries(Object.entries(d.rails).map(([k,v])=>[k,v.results.length])),id:d.id,players:d.animePlayers,episodes:d.episodeItems?.length}))}catch(e){console.log(name,e.message)}
}
for(const url of ['https://hianime.ms/watch-one-piece-episode-4-1a877?lang=dub','https://ani.pm/ani/one-piece-21-knnjzt?ep=4&lang=sub']){try{const r=await fetch(url,{signal:AbortSignal.timeout(8000)}),html=await r.text();const cfg=html.match(/data-hk-watch='([^']+)'/);console.log(JSON.stringify({url,status:r.status,config:cfg?.[1]?.slice(0,150)}))}catch(e){console.log(e.message)}}
