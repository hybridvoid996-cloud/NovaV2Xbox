const title=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
// Only map an exact title/year and a compatible episode layout. Never guess by ID.
export async function resolveAnimeBackup(anime,source){
 const count=Number(anime.episodes);if(!title(anime.title)||!anime.year||!Number.isSafeInteger(count)||count<1)return null;
 const search=await source('search',new URLSearchParams({q:anime.title})),matches=(search.results||[]).filter(row=>row.isAnime&&(count>1?row.type==='tv':true)&&title(row.title)===title(anime.title)&&String(row.year)===String(anime.year));if(matches.length!==1)return null;
 const match=matches[0];if(match.type==='movie')return count===1?{type:'movie',id:match.id}:null;
 const detail=await source('details',new URLSearchParams({id:String(match.id),type:'tv'}));let segments=(detail.seasons||[]).filter(s=>s.number>=1&&s.episodeCount>0).map(s=>({season:Number(s.number),count:Number(s.episodeCount)})).sort((a,b)=>a.season-b.season);
 if(segments[0]?.season===1&&segments[0].count===count)segments=segments.slice(0,1);else if(segments.reduce((sum,s)=>sum+s.count,0)!==count)return null;
 return segments.length?{type:'tv',id:match.id,segments}:null;
}
