import test from 'node:test';
import assert from 'node:assert/strict';
import {createMovieRouteMemory} from '../Public/src/movie-route-memory.mjs';
test('confirmed title route goes first while all fallbacks remain and other titles stay independent',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},memory=createMovieRouteMemory(storage,()=>100);
 const routes=['first','second','third'];memory.remember('movie:1','second');
 assert.deepEqual(memory.order('movie:1',routes),['second','first','third']);
 assert.deepEqual(memory.order('movie:2',routes),routes);
 assert.deepEqual(memory.order('movie:1',['new']),['new']);
});
test('old results expire and unavailable browser storage does not block playback',()=>{
 let at=0,value;const memory=createMovieRouteMemory({getItem:()=>value,setItem:(k,v)=>value=v},()=>at);
 memory.remember('title','second');at=8*86400000;assert.deepEqual(memory.order('title',['first','second']),['first','second']);
 const blocked=createMovieRouteMemory({getItem(){throw Error()},setItem(){throw Error()}});blocked.remember('title','second');assert.deepEqual(blocked.order('title',['first','second']),['first','second']);
});
