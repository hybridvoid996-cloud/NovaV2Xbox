import {MUSIC_ORIGIN} from './music-search.mjs';
export function partyStreamUrl(track){return MUSIC_ORIGIN+'/_o/m/stream/'+encodeURIComponent(String(track.id));}
export function resetFailedPartySource(media,track,resolve=value=>value){
 if(!media||!track)return false;
 if(!media.error&&(media.currentSrc||media.getAttribute?.('src')||media.src))return false;
 media.crossOrigin='anonymous';media.src=resolve(partyStreamUrl(track));media.load();return true;
}
export function partyArtwork(track){
 const value=track?.thumb||track?.thumbnail||track?.art||track?.cover||'';
 if(typeof value==='string'&&value){try{const url=new URL(value,MUSIC_ORIGIN);if(url.protocol==='https:')return url.href;}catch{}}
 const id=String(track?.id||'').split(':').at(-1);return /^[A-Za-z0-9_-]{11}$/.test(id)?'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg':'';
}
