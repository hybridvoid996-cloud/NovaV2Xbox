import test from 'node:test';
import assert from 'node:assert/strict';
import {createMovieStallRecovery} from '../Public/src/movie-stall.mjs';
test('a stalled native movie retries and reconnects at the same position within 24 seconds',()=>{
 let clock=0,plays=0,loads=0,ready;
 const check=createMovieStallRecovery({now:()=>clock});
 const video={currentTime:45,paused:false,ended:false,seeking:false,currentSrc:'https://media.test/film.mp4',play(){plays++},load(){loads++;this.currentTime=0},addEventListener(name,fn){if(name==='loadedmetadata')ready=fn}};
 check(video);clock=12000;check(video);assert.equal(plays,1);assert.equal(loads,0);
 clock=24000;check(video);assert.equal(loads,1);ready();assert.equal(video.currentTime,45);
 clock=36000;check(video);clock=48000;check(video);assert.equal(loads,1);
});
test('paused, seeking, progressing and ended movies are left alone; HLS blobs are never reloaded',()=>{
 for(const flag of ['paused','seeking','ended']){let clock=0;const check=createMovieStallRecovery({now:()=>clock});const v={currentTime:10,[flag]:true,play(){throw Error('Unexpected play')},load(){throw Error('Unexpected reload')}};check(v);clock=180000;check(v)}
 let clock=0,plays=0;const check=createMovieStallRecovery({now:()=>clock});const v={currentTime:10,currentSrc:'blob:https://nova.test/id',play(){plays++},load(){throw Error('Do not reload an HLS blob')}};
 check(v);clock=12000;v.currentTime=20;check(v);assert.equal(plays,0);clock=24000;check(v);clock=36000;check(v);assert.equal(plays,2);
});
test('persistent HLS stalls request one player reconnect, while real progress resets the deadline',()=>{
 let clock=0,reconnects=0;const check=createMovieStallRecovery({now:()=>clock,exhausted:()=>reconnects++});
 const v={currentTime:20,currentSrc:'blob:https://nova.test/id',play(){}};
 check(v);clock=12000;v.currentTime=22;check(v);assert.equal(reconnects,0);
 for(clock=24000;clock<=60000;clock+=12000)check(v);
 assert.equal(reconnects,1);
});
