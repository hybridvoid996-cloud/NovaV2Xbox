import test from 'node:test';import assert from 'node:assert/strict';
import {playlistSource,parsePlaylistPage,readPlaylist} from '../server/music-playlist-import.mjs';
import {matchImportedTrack,matchPlaylist,fallbackRecording} from '../Public/src/nova-music-import.mjs';

test('Noah recordings retain identity, metadata and source when imported and saved',async()=>{
 const source={title:'Song',artist:'Artist',duration:120,thumb:'https://i1.sndcdn.com/cover.jpg'};
 const matched=fallbackRecording(source,{found:true,duration:121,url:'/api/soundcloud?op=noah-audio&id=123'});
 assert.equal(matched.id,'noah:123');assert.equal(matched.src,'noah');assert.equal(matched.thumb,source.thumb);
 assert.equal(matchImportedTrack(source,[matched]),matched);
 const rows=await matchPlaylist([source],{search:async()=>[matched]});assert.equal(rows[0].reason,'Noah');
 const {song}=await import('../Public/src/music-core.mjs');assert.equal(song(matched).id,'noah:123');assert.equal(song(matched).src,'noah');
 assert.equal(fallbackRecording(source,{found:true,url:'https://evil.test/media'}),null);
});
test('playlist URL validation permits only provider playlist paths',()=>{
 assert.equal(playlistSource('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=x').provider,'Spotify');
 assert.equal(playlistSource('https://soundcloud.com/a/sets/b').provider,'SoundCloud');
 assert.equal(playlistSource('https://music.apple.com/us/playlist/hits/pl.123').provider,'Apple Music');
 for(const link of ['http://soundcloud.com/a/sets/b','https://evil.test/playlist/123','https://soundcloud.com.evil.test/a/sets/b','https://user:pass@soundcloud.com/a/sets/b','https://open.spotify.com/track/37i9dQZF1DXcBWIGoYBM5M'])assert.throws(()=>playlistSource(link));
});
test('Spotify and Apple public metadata retain source order',()=>{
 const script=d=>'<script>'+JSON.stringify(d)+'</script>';
 const spotify=parsePlaylistPage(script({props:{pageProps:{state:{data:{entity:{type:'playlist',name:'Mix',trackList:[{entityType:'track',title:'Second',subtitle:'Artist',duration:120000},{entityType:'track',title:'First',subtitle:'Artist',duration:90000}]}}}}}}),'Spotify');assert.deepEqual(spotify.tracks.map(t=>t.title),['Second','First']);assert.equal(spotify.tracks[0].duration,120);
 const apple=parsePlaylistPage(script({data:[{data:{sections:[{itemKind:'containerDetailHeaderLockup',items:[{title:'Apple mix'}]},{itemKind:'trackLockup',items:[{title:'Song',subtitleLinks:[{title:'Artist'}]}]}]}}]}),'Apple Music');assert.equal(apple.tracks[0].artist,'Artist');assert.equal(apple.name,'Apple mix');
});
test('private or unreadable pages fail clearly and invalid links never fetch',async()=>{let calls=0;const request=async()=>{calls++;return new Response('blocked',{status:403})};await assert.rejects(readPlaylist('https://evil.test',{request}));assert.equal(calls,0);await assert.rejects(readPlaylist('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',{request}),/private/)});
test('matching skips unrelated recordings and preserves input order despite concurrent responses',async()=>{
 const sources=[{title:'First',artist:'Artist',duration:120},{title:'Missing',artist:'Artist'},{title:'Last',artist:'Artist',duration:100}];
 const song=(title,duration)=>({id:'sc:'+duration,title,artist:'Artist',duration});
 assert.equal(matchImportedTrack(sources[0],[song('First Remix',120),{...song('First',120),artist:'Other'}]),null);
 const rows=await matchPlaylist(sources,{search:async q=>{if(q.endsWith('First'))await new Promise(r=>setTimeout(r,10));return [song(q.split(' ').at(-1),q.endsWith('Last')?100:120)].filter(t=>t.title!=='Missing')}});
 assert.deepEqual(rows.map(r=>r.match?.title||null),['First',null,'Last']);
});
test('cancelled import cannot continue matching',async()=>{const controller=new AbortController();controller.abort();await assert.rejects(matchPlaylist([{title:'Song',artist:'Artist'}],{signal:controller.signal,search:async()=>[]}));});

test('SoundCloud links resolve directly and imports enforce the existing 200-song limit',async()=>{
 const result=await readPlaylist('https://soundcloud.com/artist/sets/mix',{request:async()=>{throw Error('Unexpected page fetch')},resolveSoundCloud:async url=>{assert.equal(url,'https://soundcloud.com/artist/sets/mix');return {name:'Mix',tracks:Array.from({length:205},(_,i)=>({id:'sc:'+i,title:'Song '+i,artist:'Artist'}))}}});
 assert.equal(result.tracks.length,200);assert.equal(result.partial,true);assert.equal(result.tracks[199].id,'sc:199');
});

test('featured artist formatting matches but remixes remain distinct, with Void as a second source',async()=>{
 const source={title:'Song (feat. Guest)',artist:'Artist, Guest',duration:120};const candidate={id:'sc:123',title:'Song (ft. Guest)',artist:'Artist',duration:122};assert.equal(matchImportedTrack(source,[candidate])?.id,'sc:123');assert.equal(matchImportedTrack(source,[{...candidate,title:'Song Remix (ft. Guest)'}]),null);
 const rows=await matchPlaylist([source],{search:async()=>[],alternative:async()=>({...candidate,id:'void:456'})});assert.equal(rows[0].match.id,'void:456');assert.equal(rows[0].reason,'Void');
});

test('saved Void artwork survives library normalization',async()=>{const {song}=await import('../Public/src/music-core.mjs');assert.equal(song({id:'void:123',title:'Song',thumb:'/api/soundcloud?op=void-art&token=safe_token'}).thumb,'/api/soundcloud?op=void-art&token=safe_token');assert.equal(song({id:'void:123',thumb:'/unsafe'}).thumb,'')});

test('album names and validated album identifiers survive saving',async()=>{const {song}=await import('../Public/src/music-core.mjs');assert.equal(song({id:'sc:1',album:'Take Care',albumId:'void:42'}).albumId,'void:42');assert.equal(song({id:'sc:1',albumId:'https://evil.test'}).albumId,'')});
