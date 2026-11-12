import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommunityMusic,communityTrack} from '../server/music-community.mjs';
import {song} from '../Public/src/music-core.mjs';
import {isCommunityAudio,communityAudioURL} from '../Public/src/music-community.mjs';
const track={id:'aCjxP58Ydik',title:'Rock With You',artist:'Michael Jackson',duration:221,artwork:'https://i.ytimg.com/vi/aCjxP58Ydik/hqdefault.jpg'};
test('community search caches real tracks and preserves proxied artwork in saved queues',async()=>{
 let calls=0;const provider=createCommunityMusic({request:async url=>{calls++;assert.equal(new URL(url).origin,'https://321.tb2.net');return Response.json({items:[track],albums:[],artists:[]})}});
 const data=await provider.catalog('tb','Rock with You');await provider.catalog('tb','Rock with You');assert.equal(calls,1);
 const saved=song({...data.tracks[0],sources:data.tracks});assert.equal(saved.sources[0].provider,'TB Music');assert.match(saved.thumb,/op=community-art/);assert.equal(isCommunityAudio(communityAudioURL(saved)),true);
 assert.equal(isCommunityAudio('https://example.test/api/soundcloud?op=community-audio&source=tb&id='+track.id),false);
});
test('community audio bounds ranges and rejects non-audio responses and malformed IDs',async()=>{
 const provider=createCommunityMusic({request:async(url,options)=>{assert.equal(new URL(url).origin,'https://321.tb2.net');assert.equal(options.headers.Range,'bytes=0-1023');return new Response(null,{status:206,headers:{'Content-Type':'audio/mp4','Content-Range':'bytes 0-1023/3000000','Content-Length':'1024'}})}});
 const res={setHeader(){},end(){}};await provider.audio({method:'HEAD',headers:{range:'bytes=0-1023'}},res,'tb',track.id);assert.equal(res.statusCode,206);
 await assert.rejects(provider.audio({headers:{}},res,'tb','invalid'));
 const bad=createCommunityMusic({request:async()=>new Response('not audio')});await assert.rejects(bad.audio({headers:{range:'bytes=0-1023'}},res,'tb',track.id));
 assert.equal(communityTrack('tb',{...track,id:'invalid'}),null);await assert.rejects(provider.art({},res,'https://example.test/picture'));
});

test('Reading preserves recording variants and does not use preview audio',()=>{
 const row={id:123,title:'Example (Remix)',title_short:'Example',artist:{name:'Artist'},album:{id:22,title:'Album',cover_big:'https://cdn-images.dzcdn.net/images/cover/test/500x500.jpg'},preview:'https://example.test/preview.mp3'};
 const t=communityTrack('reading',row);assert.equal(t.title,'Example (Remix)');assert.equal(t.albumId,'reading:22');assert.equal(t.preview,undefined);
 assert.equal(communityTrack('reading',{...row,title:'Example (Single Version)'}).title,'Example');
});
