/** Freeze each visible episode to the exact series and season that supplied it. */
export function bindMovieEpisodes(item,season,data){
 if(item.type!=='tv')throw Error('Episode binding requires a TV series.');
 const wanted=Number(season);if(!Number.isSafeInteger(wanted)||wanted<0||wanted>=10000)throw Error('Invalid season.');
 for(const key of ['showId','seriesId','tv_id'])if(data[key]!=null&&String(data[key])!==String(item.id))throw Error('The provider returned episodes from another show.');
 for(const key of ['season','season_number'])if(data[key]!=null&&Number(data[key])!==wanted)throw Error('The provider returned another season.');
 const seen=new Set();return (data.episodes||[]).map(e=>{const number=Number(e.number??e.episode_number);if(!Number.isSafeInteger(number)||number<1||number>=10000||seen.has(number))return null;seen.add(number);if(e.season_number!=null&&Number(e.season_number)!==wanted)throw Error('An episode belongs to another season.');if(e.show_id!=null&&String(e.show_id)!==String(item.id))throw Error('An episode belongs to another show.');return {...e,number,still:e.still||e.still_path,airDate:e.airDate||e.air_date,_novaSelection:Object.freeze({id:String(item.id),type:'tv',season:wanted,episode:number})}}).filter(Boolean);
}
export function selectedMovieEpisode(item,season,episode){const selected=episode?._novaSelection;if(!selected||selected.id!==String(item.id)||selected.type!==item.type||selected.season!==Number(season)||selected.episode!==Number(episode.number))throw Error('This episode selection is stale. Choose the episode again.');return selected}
