import {movieEmbedPath} from './movie-title-view.mjs?v=20261114-movies1';
export function moviePlaybackRoutes(item){
 const embed=movieEmbedPath(item);
 if(item.type==='anime')return ['https://framextv.xyz'+embed,...animeProviderRoutes(item),...mappedAnimeRoutes(item)];
 if(!['movie','tv'].includes(item.type))throw Error('Unsupported title type');
 const first=item.type==='tv'?'/watch/show/'+embed.split('/').slice(3).join('/'):'/watch/'+item.id;
 const cinejoy='https://cinejoy.pk'+(item.type==='tv'?'/watch/tv/'+embed.split('/').slice(3).join('/'):'/watch/movie/'+item.id);
 const primary=item.playbackSource==='cinejoy'?[cinejoy,'https://cno.to'+first,'https://framextv.xyz'+embed]:['https://cno.to'+first,'https://framextv.xyz'+embed,cinejoy];
 return [...primary,...achcromaBackupRoutes(item),...abstractMovieRoutes(item),...movyPlaybackRoutes(item),...shuttlePlaybackRoutes(item)];
}
export function achcromaBackupRoutes(item){
 if(!['movie','tv'].includes(item.type))return [];
 const path=movieEmbedPath(item),parts=path.split('/'),id=parts[3];
 return [item.type==='movie'?'https://cinesrc.st/embed/movie/'+id+'?autonext=false&subtitles=auto&subtitlelang=English':'https://cinesrc.st/embed/tv/'+id+'?s='+parts[4]+'&e='+parts[5]+'&autonext=false&subtitles=auto&subtitlelang=English','https://player.vidzee.wtf'+path,'https://vidsrc.su'+path];
}
export function isAchcromaBackup(value){try{return ['player.vidzee.wtf','vidsrc.su','cinesrc.st','vidlink.pro','www.movy.sx','shuttletv.pk'].includes(new URL(value).hostname)}catch{return false}}
export function orderMovieRoutes(routes,prefer){return [...prefer(routes.filter(url=>!isAchcromaBackup(url))),...routes.filter(isAchcromaBackup)]}
function mappedAnimeRoutes(item){const map=item.playbackBackup;if(!map||!/^\d{1,9}$/.test(String(map.id)))return [];if(map.type==='movie')return [...achcromaBackupRoutes({type:'movie',id:map.id}),...movyPlaybackRoutes({type:'movie',id:map.id})];if(map.type!=='tv'||!Array.isArray(map.segments)||map.segments.length>100)return [];let episode=Math.max(1,Math.floor(Number(item.episode)||1));for(const part of map.segments){if(!Number.isSafeInteger(part.count)||part.count<1||!Number.isSafeInteger(part.season)||part.season<1)return [];if(episode<=part.count)return [...achcromaBackupRoutes({type:'tv',id:map.id,season:part.season,episode}),...movyPlaybackRoutes({type:'tv',id:map.id,season:part.season,episode})];episode-=part.count}return []}
export function movieEntryFailed(target,status,entry){
 if(status<400)return false;
 try{const url=new URL(entry),request=new URL(target.href||target);return url.origin===request.origin&&url.pathname===request.pathname}catch{return false}
}

export function movyPlaybackRoutes(item){const parts=movieEmbedPath(item).split('/');if(!['movie','tv'].includes(item.type))return [];return ['https://www.movy.sx/'+(item.type==='movie'?'movie/'+parts[3]:'tv/'+parts.slice(3).join('/'))+'?play=true'];}

export function abstractMovieRoutes(item){if(!['movie','tv'].includes(item.type))return [];const parts=movieEmbedPath(item).split('/');return ['https://vidlink.pro/'+(item.type==='movie'?'movie/'+parts[3]:'tv/'+parts.slice(3).join('/'))+'?autoplay=true&title=true&poster=true&nextbutton=false'];}

export function shuttlePlaybackRoutes(item){if(!['movie','tv'].includes(item.type))return [];const parts=movieEmbedPath(item).split('/');return ['https://shuttletv.pk/watch/'+parts[3]+(item.type==='tv'?'?s='+parts[4]+'&e='+parts[5]:'')];}

export function animeProviderRoutes(item){const episode=Number(item.episode)||1;if(!Number.isInteger(episode)||episode<1||episode>9999)return [];return (Array.isArray(item.animePlayers)?item.animePlayers:[]).flatMap(p=>{if(String(p.id)!==String(item.id))return [];if(p.provider==='anipm'&&/^\/ani\/[a-z0-9][a-z0-9-]{1,160}$/i.test(p.path))return ['https://ani.pm'+p.path+'?ep='+episode+'&lang='+(item.audio==='dub'?'dub':'sub')];if(p.provider==='hianime'&&/^\/watch-[a-z0-9-]+-episode-\{episode\}-[a-z0-9]+$/i.test(p.path))return ['https://hianime.ms'+p.path.replace('{episode}',String(episode))+'?lang='+(item.audio==='dub'?'dub':'sub')];return []})}
