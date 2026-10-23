import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeMusicCatalog,normalizeMusicQuery} from '../server/music-catalog.mjs';
import {createAlternativeMusic} from '../server/music-alternative.mjs';
import {createMusicProviderHandler} from '../server/music-providers.mjs';
import {song} from '../Public/src/music-core.mjs';
const track={title:'Rock with You',artist:'Michael Jackson',duration:219};
test('one recording retains three playback sources and album metadata without merging edits',()=>{
 const original={tracks:[{...track,id:'sc:1',title:'Michael Jackson - Rock With You'}]};
 const merged=mergeMusicCatalog(original,{tracks:[{...track,id:'noah:2'},{...track,id:'void:3',album:'Off the Wall',albumId:'void:4',thumb:'/cover'},{...track,id:'void:5',duration:203},{...track,id:'sc:6',title:'Rock with You (Live)'}]});
 assert.equal(merged.tracks.length,3);const recording=merged.tracks[0];assert.equal(recording.id,'void:3');assert.equal(recording.albumId,'void:4');assert.deepEqual(recording.sources.map(s=>s.id),['sc:1','noah:2','void:3']);assert.equal(original.tracks[0].sources,undefined);
 assert.deepEqual(song(recording).sources,recording.sources);
});
test('albums and artists merge across catalogs, while deluxe editions and search collections stay separate',()=>{
 const sc={artists:[{id:'1',title:'Yeat',verified:true}],releases:[{id:'sc:2',title:'AftërLyfe',artist:'Yeat',kind:'album'}]};
 const merged=mergeMusicCatalog(sc,{artists:[{id:'void:3',title:'YEAT',verified:false}],releases:[{id:'void:4',title:'Afterlyfe',artist:'Yeat',kind:'album',count:22},{id:'void:5',title:'Afterlyfe (Deluxe)',artist:'Yeat',kind:'album'},{id:'noah:6',title:'Afterlyfe',artist:'Yeat',kind:'playlist',partial:true}]});
 assert.equal(merged.artists.length,1);assert.equal(merged.artists[0].verified,true);assert.equal(merged.artists[0].sources.length,2);assert.equal(merged.releases.length,3);assert.equal(merged.releases[0].id,'void:4');assert.equal(merged.releases[0].count,22);
});
test('Void catalog includes albums, artists and track album links; artist and album pages are complete',async()=>{
 let calls=0;const adapter=createAlternativeMusic({request:async url=>{calls++;if(url.pathname.includes('/artist/'))return Response.json({name:'Michael Jackson',topTracks:[{...track,id:'1'}],albums:[{id:'2',title:'Off the Wall',artist:track.artist}]});if(url.pathname.includes('/album/'))return Response.json({title:'Off the Wall',artist:track.artist,tracks:[{...track,id:'1'}]});return Response.json({tracks:[{...track,id:'1',albumId:'2'}],albums:[{id:'2',title:'Off the Wall',artist:track.artist,trackCount:10}],artists:[{id:'3',name:track.artist}]})}});
 const a=await adapter.catalog('Rock with You');assert.equal(a.releases[0].id,'void:2');assert.equal(a.artists[0].id,'void:3');assert.equal(a.tracks[0].albumId,'void:2');await adapter.catalog('Rock with You');assert.equal(calls,1);assert.equal((await adapter.artist('3')).releases.length,1);assert.equal((await adapter.album('2')).tracks[0].albumId,'void:2');await assert.rejects(adapter.artist('../bad'),/Invalid/);
});
test('all searches start together, normalize U, share in-flight work and cache complete metadata',async()=>{
 const calls=[];let release;const pending=new Promise(resolve=>release=resolve);
 const source=name=>({catalog:async q=>{calls.push([name,q]);await pending;return {tracks:[{...track,id:name+':1'}],releases:[],artists:[]}}});
 const h=createMusicProviderHandler({service:source('sc'),noah:source('noah'),alternative:source('void')});
 const request=q=>{let body;const res={setHeader(){},end(value){body=JSON.parse(value)}};return h({method:'GET',url:'/api/soundcloud?op=catalog&q='+encodeURIComponent(q)},res).then(()=>body)};
 const a=request('Rock with U'),b=request('Rock with You');await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.length,3);assert(calls.every(([,q])=>q==='Rock with you'));release();const [one,two]=await Promise.all([a,b]);assert.deepEqual(one,two);assert.equal(one.tracks.length,1);assert.equal(one.catalogSources.length,3);await request('Rock with You');assert.equal(calls.length,3);assert.equal(normalizeMusicQuery('U2'),'U2');
});
