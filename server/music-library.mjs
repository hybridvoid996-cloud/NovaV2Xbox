import {song,key,validId,MAX_SONGS} from './music-core.mjs';
import {moveSong} from './music-order.mjs';
function addSongs(existing,values,time){if(!Array.isArray(values)||values.length>MAX_SONGS)throw Error('Choose up to 200 songs.');const list=Object.values(existing||{}),seen=new Set(list.map(key));for(const value of values){const t=song(value);if(seen.has(key(t)))continue;if(list.length>=MAX_SONGS)throw Error('Playlist is full (200 songs).');seen.add(key(t));list.push({...t,addedAt:time})}return list;}
export function updateMusicLibrary(value,b,time){const lib=structuredClone(value||{liked:[],playlists:{}});lib.liked=Object.values(lib.liked||{});lib.playlists||={};const action=b.action;
 if(action==='like'){const t=song(b.song);if(b.liked===false)lib.liked=lib.liked.filter(x=>key(x)!==key(t));else if(!lib.liked.some(x=>key(x)===key(t))){if(lib.liked.length>=MAX_SONGS)throw Error('Liked Songs is full (200 songs).');lib.liked.push({...t,addedAt:time})}return lib;}
 if(action==='reorderSong'){if(b.collection==='liked')lib.liked=moveSong(lib.liked,b.songKey,b.beforeKey);else if(b.collection==='playlist'){if(!validId(b.id)||!Object.hasOwn(lib.playlists,b.id))throw Error('Playlist not found.');lib.playlists[b.id].songs=moveSong(lib.playlists[b.id].songs,b.songKey,b.beforeKey)}else throw Error('Choose Liked Songs or a playlist.');return lib;}
 if(action==='createPlaylist'){if(Object.keys(lib.playlists).length>=40)throw Error('You can create up to 40 playlists.');const name=String(b.name||'').trim().slice(0,80);if(!name)throw Error('Give your playlist a name.');lib.playlists[b.id]={id:b.id,name,description:String(b.description||'').trim().slice(0,240),pinned:false,songs:addSongs([],b.songs||[],time),createdAt:time};return lib;}
 if(!validId(b.id)||!Object.hasOwn(lib.playlists,b.id))throw Error('Playlist not found.');const p=lib.playlists[b.id];p.id=b.id;
 if(action==='deletePlaylist')delete lib.playlists[b.id];
 else if(action==='renamePlaylist'){const name=String(b.name||'').trim().slice(0,80);if(!name)throw Error('Give your playlist a name.');p.name=name;if(b.description!==undefined)p.description=String(b.description||'').trim().slice(0,240);}
 else if(action==='pinPlaylist')p.pinned=b.pinned===true;
 else if(action==='playlistSong'){const t=song(b.song);p.songs=b.remove===true?Object.values(p.songs||{}).filter(x=>key(x)!==key(t)):addSongs(p.songs,[t],time);}
 else if(action==='playlistSongs')p.songs=addSongs(p.songs,b.songs,time);
 else throw Error('Unknown library action.');return lib;
}
