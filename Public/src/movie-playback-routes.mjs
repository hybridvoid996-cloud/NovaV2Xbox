import {movieEmbedPath} from './movie-title-view.mjs?v=20261027-achcroma326';
export function moviePlaybackRoutes(item){
 const embed=movieEmbedPath(item);
 if(item.type==='anime')return ['https://framextv.xyz'+embed,...mappedAnimeRoutes(item)];
 if(!['movie','tv'].includes(item.type))throw Error('Unsupported title type');
 const first=item.type==='tv'?'/watch/show/'+embed.split('/').slice(3).join('/'):'/watch/'+item.id;
 const cinejoy='https://cinejoy.pk'+(item.type==='tv'?'/watch/tv/'+embed.split('/').slice(3).join('/'):'/watch/movie/'+item.id);
 const primary=item.playbackSource==='cinejoy'?[cinejoy,'https://cno.to'+first,'https://framextv.xyz'+embed]:['https://cno.to'+first,'https://framextv.xyz'+embed,cinejoy];
 return [...primary,...achcromaBackupRoutes(item)];
}
export function achcromaBackupRoutes(item){
 if(!['movie','tv'].includes(item.type))return [];
 const path=movieEmbedPath(item),parts=path.split('/'),id=parts[3];
 return ['https://player.vidzee.wtf'+path,'https://vidsrc.su'+path,item.type==='movie'?'https://cinesrc.st/embed/movie/'+id:'https://cinesrc.st/embed/tv/'+id+'?s='+parts[4]+'&e='+parts[5]];
}
export function isAchcromaBackup(value){try{return ['player.vidzee.wtf','vidsrc.su','cinesrc.st'].includes(new URL(value).hostname)}catch{return false}}
export function orderMovieRoutes(routes,prefer){return [...prefer(routes.filter(url=>!isAchcromaBackup(url))),...routes.filter(isAchcromaBackup)]}
function mappedAnimeRoutes(item){const map=item.playbackBackup;if(!map||!/^\d{1,9}$/.test(String(map.id)))return [];if(map.type==='movie')return achcromaBackupRoutes({type:'movie',id:map.id});if(map.type!=='tv'||!Array.isArray(map.segments)||map.segments.length>100)return [];let episode=Math.max(1,Math.floor(Number(item.episode)||1));for(const part of map.segments){if(!Number.isSafeInteger(part.count)||part.count<1||!Number.isSafeInteger(part.season)||part.season<1)return [];if(episode<=part.count)return achcromaBackupRoutes({type:'tv',id:map.id,season:part.season,episode});episode-=part.count}return []}
export function movieEntryFailed(target,status,entry){
 if(status<400)return false;
 try{const url=new URL(entry),request=new URL(target.href||target);return url.origin===request.origin&&url.pathname===request.pathname}catch{return false}
}
