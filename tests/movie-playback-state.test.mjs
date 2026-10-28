import test from 'node:test';
import assert from 'node:assert/strict';
import {readMoviePlayback} from '../Public/src/movie-playback-state.mjs';
const rect=(width=800,height=450)=>({width,height});
const video=(extra={})=>({getBoundingClientRect:()=>rect(),readyState:4,currentTime:42,duration:1300,ended:false,error:null,...extra});
const doc=(videos=[],frames=[])=>({defaultView:{getComputedStyle:()=>({display:'block',visibility:'visible'})},querySelectorAll:tag=>tag==='video'?videos:frames});
const frame=contentDocument=>({contentDocument,getBoundingClientRect:()=>rect()});
test('readiness and playback progress are detected inside nested provider frames without messages',()=>{
 const state=readMoviePlayback(frame(doc([],[frame(doc([],[frame(doc([video()]))]))])));
 assert.equal(state.ready,true);assert.equal(state.currentTime,42);assert.equal(state.duration,1300);
});
test('hidden and tiny advertising frames cannot mark the movie ready',()=>{
 const ad=frame(doc([video()]));ad.getBoundingClientRect=()=>rect(1,1);
 const state=readMoviePlayback(frame(doc([],[ad,frame(doc([video({readyState:1})]))])));
 assert.equal(state.ready,false);
});
test('inaccessible frames do not prevent checking another provider frame',()=>{
 const blocked={getBoundingClientRect:()=>rect(),get contentDocument(){throw Error('different origin')}};
 assert.equal(readMoviePlayback(frame(doc([],[blocked,frame(doc([video()]))]))).ready,true);
});
test('a nested Vercel error is detected even without provider scripts',()=>{
 const broken=doc();broken.body={innerText:'404 NOT_FOUND Code: DEPLOYMENT_NOT_FOUND'};
 const state=readMoviePlayback(frame(doc([],[frame(broken)])));
 assert.equal(state.providerError,true);assert.equal(state.error,true);assert.equal(state.ready,false);
});
test('a broken secondary frame cannot interrupt healthy playback',()=>{
 const broken=doc();broken.body={innerText:'404 NOT_FOUND'};
 const state=readMoviePlayback(frame(doc([video()],[frame(broken)])));
 assert.equal(state.ready,true);assert.equal(state.error,false);
});
test('a failed player after playback remains recoverable',()=>{
 const broken=doc();broken.title='404: This page could not be found.';
 assert.equal(readMoviePlayback(frame(broken)).providerError,true);
});
