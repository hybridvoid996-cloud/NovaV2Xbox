import test from 'node:test';
import assert from 'node:assert/strict';
import {matchImportedTrack} from '../Public/src/nova-music-import.mjs';

test('imported songs can match every Nova source',()=>{
 const source={title:'Headlines',artist:'Drake',duration:236};
 for(const id of ['abs:55','ach:abcdefghijk','void:3','noah:4'])assert.equal(matchImportedTrack(source,[{id,title:'Headlines',artist:'Drake',duration:236}])?.id,id);
});
test('with a Spotify key, imports page through the whole playlist',async()=>{
 const {readPlaylist}=await import('../server/music-playlist-import.mjs');
 const page=(n,next)=>({items:Array.from({length:n},(_,i)=>({track:{type:'track',name:'Song '+i+(next?'a':'b'),duration_ms:180000,artists:[{name:'Artist'}],album:{images:[{url:'https://i.scdn.co/x.jpg'}]}}})),next});
 const request=async(url)=>{
  if(url.startsWith('https://accounts.spotify.com/'))return Response.json({access_token:'t',expires_in:3600});
  if(url.includes('/tracks?limit=100&fields'))return Response.json(page(100,'https://api.spotify.com/v1/playlists/p/tracks?offset=100'));
  if(url.includes('offset=100'))return Response.json(page(50,null));
  return Response.json({name:'Big mix',tracks:{total:150}});
 };
 const data=await readPlaylist('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',{request,env:{SPOTIFY_CLIENT_ID:'a',SPOTIFY_CLIENT_SECRET:'b'}});
 assert.equal(data.name,'Big mix');assert.equal(data.tracks.length,150);assert.equal(data.partial,false);
});
