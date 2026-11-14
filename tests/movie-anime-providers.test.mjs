import test from 'node:test';
import assert from 'node:assert/strict';
import {animeArtwork,providerAnimeItem,normalizeAnimeFeed,hianimeIdentity,createAnimeProviders} from '../server/movie-anime-providers.mjs';
import {animeProviderRoutes} from '../Public/src/movie-playback-routes.mjs';
import {animePlayerHTML} from '../Public/src/movie-anime-player-compat.mjs';
import {runInNewContext} from 'node:vm';
import {withMovieBackup} from '../server/movie-catalog-backup.mjs';
const row={id:1642,anilistId:'21',title:'One Piece',poster:'/api/anime/cover?key='+'a'.repeat(64),year:1999,episodeCount:1180};

test('site-local anime identifiers are never mistaken for AniList identifiers',()=>{
 assert.equal(providerAnimeItem(row).id,'21');
 for(const invalid of [{id:1642,title:'One Piece'},{...row,anilistId:'800000001'},{...row,isAdult:true},{...row,title:''}])assert.equal(providerAnimeItem(invalid),null);
 const catalog=normalizeAnimeFeed({feed:{'/anime/top-watched?range=week&view=rail':{items:[row,{id:4}]}}});
 assert.equal(catalog.rails.popular_anime.results.length,1);
 assert.throws(()=>normalizeAnimeFeed({feed:{}}),/no identified titles/);
});

test('anime artwork proxy accepts only the discovered artwork routes',()=>{
 assert.equal(animeArtwork(providerAnimeItem(row).poster).hostname,'ani.pm');
 assert.equal(animeArtwork('https://hianime.ms/images/poster/one-piece-1a877.webp').hostname,'hianime.ms');
 for(const url of ['https://ani.pm/api/account','https://ani.pm/api/anime/cover?key=bad','https://evil.example/images/poster/a.webp','https://ani.pm:444/img/covers/a.webp','https://user@ani.pm/img/covers/a.webp'])assert.throws(()=>animeArtwork(url));
});

test('HiAnime playback requires an exact external title identity',()=>{
 const html='<a href="https://anilist.co/anime/21">AniList</a><a href="/watch-one-piece-episode-1-1a877">Watch</a>';
 assert.equal(hianimeIdentity(html,'21').path,'/watch-one-piece-episode-{episode}-1a877');
 assert.equal(hianimeIdentity(html,'2'),null);
 assert.equal(hianimeIdentity(html.replace('anime/21','anime/211'),'21'),null);
 assert.equal(hianimeIdentity(html.replace('/watch-one-piece','https://evil.example/watch-one-piece'),'21'),null);
});

test('provider details retain episode identity and cache verified playback links',async()=>{
 let calls=0;const adapter=createAnimeProviders(async url=>{
  calls++;
  if(String(url).includes('/api/anime/ani/'))return Response.json({...row,routeId:'one-piece-21-knnjzt',episodes:[{number:1,title:'Beginning',thumbnail:row.poster}]});
  if(String(url).includes('/search?'))return new Response('<a href="/details/one-piece-1a877">One Piece</a>');
  return new Response('<a href="https://anilist.co/anime/21">AniList</a><a href="/watch-one-piece-episode-1-1a877">Watch</a>');
 });
 const detail=await adapter.details('21');assert.equal(detail.id,'21');assert.equal(detail.animePlayers.length,2);assert.equal(detail.episodeItems[0].number,1);
 assert.equal(await adapter.details('21'),detail);assert.equal(calls,3);
 const routes=animeProviderRoutes({...detail,episode:4,audio:'sub'});
 assert(routes.some(url=>url.includes('ani.pm/ani/one-piece-21-knnjzt?ep=4')));
 assert(routes.some(url=>new URL(url).pathname==='/watch-one-piece-episode-4-1a877'));
 assert.deepEqual(animeProviderRoutes({...detail,id:'22'}),[]);
 assert.deepEqual(animeProviderRoutes({...detail,episode:1.5}),[]);
});

test('mismatched provider details cannot enter playback',async()=>{
 const adapter=createAnimeProviders(async()=>Response.json({...row,anilistId:'22'}));
 await assert.rejects(adapter.details('21'),/different title/);
});

test('anime players receive the selected language before their scripts run',()=>{
 for(const [url,key] of [['https://ani.pm/ani/one-piece-21-gjovxa?ep=4&lang=sub','anipm:app:v1'],['https://hianime.ms/watch-one-piece-episode-4-1a877?lang=dub','hk-audio']]){
  const html=animePlayerHTML('<html><head><script>if(window.top!==window.self){window.top.location.href=window.location.href;}provider()</script></head></html>',url);
  const data=new Map([['anipm:app:v1',JSON.stringify({volume:.5})]]);
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}});
  if(key==='hk-audio'){assert.equal(data.get(key),'dub');assert(!html.includes('window.top.location.href'))}
  else assert.deepEqual(JSON.parse(data.get(key)),{volume:.5,defaultLang:'sub'});
 }
 const html='<head>unchanged</head>';assert.equal(animePlayerHTML(html,'https://evil.example/?lang=dub'),html);
});

test('Anime tab returns its bundled catalog promptly even when every service hangs',async()=>{
 const never=()=>new Promise(()=>{}),handler=withMovieBackup(never,{request:never});
 let data;const res={setHeader(){},end(body){data=JSON.parse(body)}},started=Date.now();
 await handler({url:'/api/movies?op=anime',method:'GET'},res);
 assert.equal(res.statusCode,200);assert(data.rails.popular_anime.results.length>=24);
 assert(Date.now()-started<4000);assert(data.cached);
});
