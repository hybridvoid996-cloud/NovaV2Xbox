import test from 'node:test';
import assert from 'node:assert/strict';
import {createNoahMusic,normalizeNoahTrack} from '../server/music-noah.mjs';
import {createMusicProviderHandler,mergeMusicCatalog} from '../server/music-providers.mjs';
const row={id:'123',title:'Artist - Song',artist:'Artist',artists:[{id:'9',name:'Artist'}],album:{id:'scgroup',title:'Electronic',cover:'https://i1.sndcdn.com/cover.jpg'},duration:120,allowStreaming:true};
const result=items=>Response.json({data:{items}});
const response=()=>({headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v},end(body){this.body=body}});

test('Noah metadata preserves recording identity and does not claim genre groups are albums',()=>{
 const t=normalizeNoahTrack(row);assert.equal(t.id,'noah:123');assert.equal(t.artist,'Artist');assert.equal(t.duration,120);assert.equal(t.album,'');assert.equal(t.thumb,row.album.cover);
 assert.equal(normalizeNoahTrack({...row,album:{...row.album,type:'ALBUM'}}).album,'Electronic');
 for(const patch of [{id:'../bad'},{duration:NaN},{duration:0},{allowStreaming:false},{presentation:'PREVIEW'}])assert.equal(normalizeNoahTrack({...row,...patch}),null);
 assert.equal(normalizeNoahTrack({...row,cover:'https://evil.test/img',album:null}).thumb,'');
});
test('Noah search caches, deduplicates and rejects invalid queries before networking',async()=>{
 let calls=0;const n=createNoahMusic({request:async url=>{calls++;assert.equal(url.origin,'https://noahstutoring.academy');assert.equal(url.pathname,'/api/music/search/');return result([row])}});
 const [a,b]=await Promise.all([n.catalog('Artist'),n.catalog('Artist')]);assert.equal(calls,1);assert.deepEqual(a,b);assert.equal(a.releases[0].kind,'playlist');assert.equal(a.releases[0].partial,true);assert.equal(a.artists[0].verified,false);
 await assert.rejects(n.catalog(''),/search/);await assert.rejects(n.catalog('a'.repeat(161)),/search/);assert.equal(calls,1);
});
test('Noah collection and artist links work without relying on server instance memory',async()=>{
 const make=()=>createNoahMusic({request:async()=>result([row,{...row,id:'124',title:'Other song'}])});
 const data=await make().catalog('Artist');const album=await make().collection(data.releases[0].id);assert.deepEqual(album.tracks.map(t=>t.id),['noah:123','noah:124']);assert.equal(album.partial,true);
 const artist=await make().artist(data.artists[0].id);assert.equal(artist.artist.title,'Artist');assert.equal(artist.tracks.length,2);
 await assert.rejects(make().collection('../private'),/Invalid/);
 await assert.rejects(make().collection('noah:'+Buffer.from(JSON.stringify({kind:'collection',query:'x'.repeat(200),group:'x'})).toString('base64url')),/Invalid/);
});
test('Noah fallback matches prefixed titles but rejects remixes, covers and wrong lengths',async()=>{
 const n=createNoahMusic({request:async()=>result([row,{...row,id:'124',title:'Song Remix'}])});
 const found=await n.find('Song','Artist',120);assert.equal(found.url,'/api/soundcloud?op=noah-audio&id=123');assert.equal(found.provider,'Noah');
 assert.deepEqual(await n.find('Song','Different Artist',120),{found:false});assert.deepEqual(await n.find('Song','Artist',300),{found:false});
});
test('Noah audio is fixed-origin, resumable, bounded and strips unrelated request headers',async()=>{
 const seen=[];const n=createNoahMusic({request:async(url,options)=>{seen.push({url,options});if(url.pathname==='/api/music/stream')return Response.json({kind:'direct',presentation:'FULL',provider:'soundcloud',streamUrl:'/api/music/file/123.m4a'});return new Response(null,{status:206,headers:{'content-type':'audio/mp4','content-range':'bytes 2000000-3048575/9000000'}})}});
 const res=response();await n.audio({method:'HEAD',headers:{range:'bytes=2000000-',authorization:'private',cookie:'private'}},res,'123');
 assert.equal(seen[1].url.href,'https://noahstutoring.academy/api/music/file/123.m4a');assert.deepEqual(seen[1].options.headers,{Range:'bytes=2000000-3048575'});assert.equal(res.statusCode,206);assert.equal(res.headers['content-length'],'1048576');
});
test('Noah audio rejects previews, manifests and arbitrary stream URLs before media fetch',async()=>{
 for(const patch of [{presentation:'PREVIEW'},{kind:'dash',manifest:'encrypted'},{provider:'unknown'},{streamUrl:'https://evil.test/123.m4a'},{streamUrl:'/api/music/file/124.m4a'}]){
  let count=0;const n=createNoahMusic({request:async()=>{count++;return Response.json({kind:'direct',presentation:'FULL',provider:'soundcloud',streamUrl:'/api/music/file/123.m4a',...patch})}});
  await assert.rejects(n.audio({method:'GET',headers:{}},response(),'123'),/supported full audio/);assert.equal(count,1);
 }
});
test('Noah rejects invalid ranges and malformed media replies',async()=>{
 let count=0;const n=createNoahMusic({request:async url=>{count++;return url.pathname==='/api/music/stream'?Response.json({kind:'direct',presentation:'FULL',provider:'soundcloud',streamUrl:'/api/music/file/123.m4a'}):new Response('html',{headers:{'content-type':'text/html'}})}});
 const res=response();await n.audio({method:'GET',headers:{range:'bytes=2-1'}},res,'123');assert.equal(res.statusCode,416);assert.equal(count,0);
 await assert.rejects(n.audio({method:'HEAD',headers:{}},response(),'../bad'),/Invalid/);assert.equal(count,0);
 await assert.rejects(n.audio({method:'HEAD',headers:{}},response(),'123'),/resumable/);
});
test('Noah artwork cannot proxy arbitrary hosts or credentials',async()=>{
 let calls=0;const n=createNoahMusic({request:async()=>{calls++;return new Response(null,{headers:{'content-type':'image/jpeg'}})}});
 for(const url of ['http://resources.tidal.com/a','https://resources.tidal.com.evil.test/a','https://user:pass@resources.tidal.com/a','https://127.0.0.1/a'])await assert.rejects(n.art({method:'HEAD'},response(),url),/Unsupported/);
 assert.equal(calls,0);await n.art({method:'HEAD'},response(),'https://resources.tidal.com/images/a.jpg');assert.equal(calls,1);
});
test('catalog merge prefers native IDs and verified metadata without mutating cached results',()=>{
 const original={tracks:[{id:'sc:123',title:'Song',album:'',thumb:''}],artists:[{id:'9',title:'Artist',verified:true}],releases:[]};
 const merged=mergeMusicCatalog(original,{tracks:[normalizeNoahTrack(row),normalizeNoahTrack({...row,id:'124'})],artists:[{title:'Artist',verified:false}],releases:[]});
 assert.deepEqual(merged.tracks.map(t=>t.id),['sc:123','noah:124']);assert.equal(merged.artists.length,1);assert.equal(merged.artists[0].verified,true);assert.equal(original.tracks[0].thumb,'');
});
test('provider fallback survives Void failure and never retries an excluded route',async()=>{
 let voidCalls=0;const handler=createMusicProviderHandler({primary(){throw Error('Unexpected primary')},service:{},alternative:{async find(){voidCalls++;throw Error('offline')}},noah:{async find(){return {found:true,url:'/api/soundcloud?op=noah-audio&id=123'}}}});
 const res=response();await handler({method:'GET',url:'/api/soundcloud?op=fallback&title=Song&artist=Artist&duration=120&exclude=void'},res);assert.equal(voidCalls,0);assert.equal(JSON.parse(res.body).found,true);
 const none=response();await handler({method:'GET',url:'/api/soundcloud?op=fallback&title=Song&artist=Artist&duration=120&exclude=void,noah'},none);assert.deepEqual(JSON.parse(none.body),{found:false});
});
test('a failed secondary catalog does not break SoundCloud and Noah survives a primary outage',async()=>{
 const run=async(service,noah)=>{const h=createMusicProviderHandler({primary(){},service,noah}),res=response();await h({method:'GET',url:'/api/soundcloud?op=catalog&q=Artist'},res);return {status:res.statusCode,data:JSON.parse(res.body)}};
 const good={async catalog(){return {tracks:[{id:'sc:1'}],artists:[],releases:[]}}},bad={async catalog(){throw Error('offline')}};
 assert.equal((await run(good,bad)).status,200);assert.equal((await run(bad,good)).data.tracks[0].id,'sc:1');assert.equal((await run(bad,bad)).status,502);
});
