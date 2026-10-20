import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoadingWatch} from '../Public/src/game-loading-health.mjs';
test('a confirmed loading screen with no progress gets a bounded startup recovery',()=>{
 let time=0;const watch=createLoadingWatch({now:()=>time}),state={signature:'20%',error:false};
 assert.equal(watch.sample(state),null);time=89999;assert.equal(watch.sample(state),null);
 time=90000;assert.equal(watch.sample(state).kind,'loading');
});
test('download completions and changing loader percentages extend the wait',()=>{
 let time=0;const watch=createLoadingWatch({now:()=>time});watch.sample({signature:'20%'});
 time=80000;watch.progress();time=100000;assert.equal(watch.sample({signature:'20%'}),null);
 time=160000;assert.equal(watch.sample({signature:'30%'}),null);
 time=200000;assert.equal(watch.sample({signature:'30%'}),null);
});
test('no loader means no stuck-loading verdict; explicit loading failures are immediate',()=>{
 let time=0;const watch=createLoadingWatch({now:()=>time});watch.sample({signature:'loading'});
 time=200000;assert.equal(watch.sample(null),null);
 assert.equal(watch.sample({signature:'error',error:true}).kind,'loading');
});
