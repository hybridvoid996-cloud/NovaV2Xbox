import test from 'node:test';import assert from 'node:assert/strict';
import {achcromaItem,normalizeAchcroma} from '../server/movie-achcroma.mjs';
import {createMovieCatalog} from '../server/movie-catalog.mjs';
import {resolveAnimeBackup} from '../server/movie-anime-backup.mjs';
import {moviePlaybackRoutes,isAchcromaBackup,orderMovieRoutes} from '../Public/src/movie-playback-routes.mjs';
import {createMovieRecovery} from '../Public/src/movie-recovery.mjs';
const movie={id:1514026,media:'movie',title:'Buddy',year:'2026',poster:'/poster.jpg',backdrop:'/backdrop.jpg'};
async function call(handler,url){let body;const res={setHeader(){},end(v){body=v}};await handler({method:'GET',url},res);return {status:res.statusCode||200,data:JSON.parse(body)}}
test('Achcroma preserves movie/TV IDs and anime metadata without disguising TMDB IDs as AniList',()=>{
 const anime=achcromaItem({...movie,media:'tv',id:73223,title:'Black Clover',anime:true});assert.equal(anime.type,'tv');assert.equal(anime.isAnime,true);assert.equal(anime.metadataSource,'achcroma');assert.equal(anime.poster,'https://image.tmdb.org/t/p/original/poster.jpg');assert.equal(achcromaItem({...movie,id:'../bad'}),null);
 const home=normalizeAchcroma('home',{hero:[movie],top10:[movie],rows:[{title:'Popular',items:[movie]}]});assert.equal(home.rails.popular_movies.results.length,1);
 const detail=normalizeAchcroma('details',{...movie,cast:[{name:'Actor',photo:'/actor.jpg'}],seasons:[{number:1,episodes:12}],trailer:'udPBHzBnXKA'});assert.equal(detail.seasons[0].episodeCount,12);assert.equal(detail.cast[0].photo,'https://image.tmdb.org/t/p/original/actor.jpg');assert.equal(detail.trailer.site,'YouTube');
 const season=normalizeAchcroma('season',{episodes:[{number:2,name:'Next',still:'/episode.jpg',runtime:24,air_date:'2020-01-01'}]});assert.equal(season.episodes[0].still,'https://image.tmdb.org/t/p/original/episode.jpg');assert.equal(season.episodes[0].airDate,'2020-01-01');
});
test('catalog remains usable when the old sources fail, with TV, anime and pagination reachable',async()=>{
 const requested=[];const handler=createMovieCatalog({request:async value=>{const u=new URL(value);requested.push(u);if(u.hostname!=='achcroma.voudouris.org')throw Error('offline');if(u.pathname.endsWith('/list'))return Response.json({items:[movie],page:2,total_pages:50});const kind=u.searchParams.get('type');return Response.json({hero:[{...movie,media:kind==='movie'?'movie':'tv',anime:kind==='anime'}],top10:[{...movie,media:kind==='movie'?'movie':'tv',anime:kind==='anime'}],rows:[]})}});
 const home=await call(handler,'/api/movies?op=home');assert.equal(home.status,200);assert.ok(home.data.rails.popular_movies);assert.ok(home.data.rails.popular_tv);assert.equal(home.data.rails.popular_anime.results[0].isAnime,true);
 const page=await call(handler,'/api/movies?op=achcromaList&type=movie&page=2');assert.equal(page.data.page,2);assert.equal(page.data.totalPages,50);assert.equal(page.data.results[0].title,'Buddy');assert.equal((await call(handler,'/api/movies?op=achcromaList&type=movie&page=51')).status,400);assert.ok(requested.every(u=>u.protocol==='https:'));
});
test('new playback hosts come after every existing provider and preserve TV episode numbering',()=>{
 const routes=moviePlaybackRoutes({type:'movie',id:1514026});assert.equal(routes.length,6);assert.ok(routes.slice(0,3).every(url=>!isAchcromaBackup(url)));assert.ok(routes.slice(3).every(isAchcromaBackup));assert.equal(routes[3],'https://player.vidzee.wtf/embed/movie/1514026');
 const tv=moviePlaybackRoutes({type:'tv',id:2190,season:2,episode:3});assert.equal(tv[3],'https://player.vidzee.wtf/embed/tv/2190/2/3');assert.equal(tv[5],'https://cinesrc.st/embed/tv/2190?s=2&e=3');
});
test('anime backup matching refuses wrong years, ambiguous titles and incompatible episode layouts',async()=>{
 const anime={title:'Black Clover',year:2017,episodes:170},match={id:'73223',title:'Black Clover',year:'2017',type:'tv',isAnime:true};const source=async op=>op==='search'?{results:[match]}:{seasons:[{number:1,episodeCount:170},{number:2,episodeCount:26}]};assert.deepEqual(await resolveAnimeBackup(anime,source),{type:'tv',id:'73223',segments:[{season:1,count:170}]});assert.equal(await resolveAnimeBackup({...anime,year:2000},source),null);assert.equal(await resolveAnimeBackup({...anime,episodes:200},source),null);assert.equal(await resolveAnimeBackup(anime,async()=>({results:[match,match]})),null);
 const mapped=moviePlaybackRoutes({type:'anime',id:1,episode:13,playbackBackup:{type:'tv',id:99,segments:[{season:1,count:12},{season:2,count:12}]}});assert.match(mapped[0],/id=1/);assert.equal(mapped[1],'https://player.vidzee.wtf/embed/tv/99/2/1');assert.equal(moviePlaybackRoutes({type:'anime',id:1,episode:13}).length,1);
});
test('recovery reaches the last backup and never switches a successful player',async()=>{
 const tasks=[],seen=[];let ready;const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};const recovery=createMovieRecovery({maxAttempts:()=>6,schedule(fn){tasks.push(fn);return fn},cancel(fn){const at=tasks.indexOf(fn);if(at>=0)tasks.splice(at,1)},onState(){},launch(args){seen.push(args.attempt);ready=args;if(args.attempt<6)args.fail()}});recovery.start();await flush();for(let i=0;i<5;i++){tasks.shift()();await flush()}assert.deepEqual(seen,[1,2,3,4,5,6]);ready.ready();ready.fail();assert.equal(tasks.length,0);recovery.stop();
});

import {createMovieRouteMemory} from '../Public/src/movie-route-memory.mjs';
test('remembered backups remain last, while working primary preferences are retained',()=>{let value;const memory=createMovieRouteMemory({getItem:()=>value,setItem:(k,v)=>value=v});const routes=moviePlaybackRoutes({type:'movie',id:550});memory.remember('movie:550',routes[4]);assert.deepEqual(orderMovieRoutes(routes,primary=>memory.order('movie:550',primary)),routes);memory.remember('movie:550',routes[2]);const ordered=orderMovieRoutes(routes,primary=>memory.order('movie:550',primary));assert.equal(ordered[0],routes[2]);assert.deepEqual(ordered.slice(3),routes.slice(3))});
