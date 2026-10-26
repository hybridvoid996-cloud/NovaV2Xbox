import test from 'node:test';
import assert from 'node:assert/strict';
import {moviePlaybackRoutes,movieEntryFailed} from '../Public/src/movie-playback-routes.mjs';
import {createMovieRecovery} from '../Public/src/movie-recovery.mjs';

test('Spider-Man and other movies have distinct fallback player routes',()=>{
 for(const id of [969681,550,157336])assert.deepEqual(moviePlaybackRoutes({type:'movie',id}),['https://cno.to/watch/'+id,'https://framextv.xyz/embed/movie/'+id]);
});
test('series preserve the episode and sanitize invalid episode numbers consistently',()=>{
 assert.deepEqual(moviePlaybackRoutes({type:'tv',id:1396,season:2,episode:3}),['https://cno.to/watch/show/1396/2/3','https://framextv.xyz/embed/tv/1396/2/3']);
 assert.deepEqual(moviePlaybackRoutes({type:'tv',id:1396,season:-4,episode:1.5}),['https://cno.to/watch/show/1396/1/1','https://framextv.xyz/embed/tv/1396/1/1']);
 assert.deepEqual(moviePlaybackRoutes({type:'anime',id:1,episode:2,audio:'dub'}),['https://framextv.xyz/embed/anime?id=1&type=anime&episode=2&sub_type=dub']);
 assert.throws(()=>moviePlaybackRoutes({type:'movie',id:'../bad'}));
 assert.throws(()=>moviePlaybackRoutes({type:'invalid',id:1}));
});
test('only the failed entry page triggers immediate fallback, not unrelated requests',()=>{
 const entry='https://cno.to/watch/969681?t=12';
 assert.equal(movieEntryFailed(new URL(entry),404,entry),true);
 assert.equal(movieEntryFailed(new URL(entry),200,entry),false);
 for(const target of ['https://cno.to/api/s/21/movie/969681','https://ads.example/watch/969681','https://cno.to/segment.ts'])assert.equal(movieEntryFailed(new URL(target),403,entry),false);
 assert.equal(movieEntryFailed(new URL('https://framextv.xyz/embed/movie/969681'),404,'https://framextv.xyz/embed/movie/969681'),true);
});
test('a missing movie entry advances to fallback and successful playback stays there',async()=>{
 const routes=moviePlaybackRoutes({type:'movie',id:969681}),seen=[],tasks=[];let callbacks;
 const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
 const player=createMovieRecovery({schedule(fn){tasks.push(fn);return fn},cancel(fn){const i=tasks.indexOf(fn);if(i>=0)tasks.splice(i,1)},onState(){},launch(args){callbacks=args;const url=routes[Math.min(args.attempt-1,routes.length-1)];seen.push(url);if(movieEntryFailed(new URL(url),args.attempt===1?404:200,url))args.fail();return ()=>{}}});
 player.start();await flush();assert.equal(tasks.length,1);tasks.shift()();await flush();
 assert.deepEqual(seen,routes);callbacks.ready();callbacks.fail();assert.equal(tasks.length,0);assert.deepEqual(seen,routes);player.stop();
});
