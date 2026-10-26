import {movieEmbedPath} from './movie-title-view.mjs?v=20261020-nova204';
export function moviePlaybackRoutes(item){
 const embed=movieEmbedPath(item);
 if(item.type==='anime')return ['https://framextv.xyz'+embed];
 if(!['movie','tv'].includes(item.type))throw Error('Unsupported title type');
 const first=item.type==='tv'?'/watch/show/'+embed.split('/').slice(3).join('/'):'/watch/'+item.id;
 return ['https://cno.to'+first,'https://framextv.xyz'+embed];
}
export function movieEntryFailed(target,status,entry){
 if(status<400)return false;
 try{const url=new URL(entry),request=new URL(target.href||target);return url.origin===request.origin&&url.pathname===request.pathname}catch{return false}
}
