import test from 'node:test';
import assert from 'node:assert/strict';
import {createTubeLoadingGuard} from '../Public/src/novatube-loading.mjs';
function fixture(){
 const timers=new Map(),loading=[];let id=0,expired=0,current=true;
 const guard=createTubeLoadingGuard({isCurrent:()=>current,setLoading:v=>loading.push(v),onTimeout:()=>expired++,schedule:fn=>{timers.set(++id,fn);return id},cancel:id=>timers.delete(id)});
 return {guard,timers,loading,expire(){[...timers.values()][0]?.()},stale(){current=false},get expired(){return expired}};
}
test('repeated buffering cannot extend a stalled video forever',()=>{
 const f=fixture();f.guard.wait();const first=[...f.timers.keys()][0];
 for(let i=0;i<30;i++)f.guard.wait();
 assert.deepEqual([...f.timers.keys()],[first]);f.expire();
 assert.equal(f.expired,1);assert.equal(f.loading.at(-1),false);
});
test('revealing loaded iframe controls keeps the connection deadline alive',()=>{
 const f=fixture();f.guard.wait({overlay:true});f.guard.reveal();
 assert.equal(f.loading.at(-1),false);assert.equal(f.timers.size,1);f.expire();assert.equal(f.expired,1);
});
test('real playback clears the timeout, and a later stall gets a new deadline',()=>{
 const f=fixture();f.guard.wait();f.guard.ready();assert.equal(f.timers.size,0);
 f.guard.wait();assert.equal(f.timers.size,1);f.expire();assert.equal(f.expired,1);
});
test('old video callbacks cannot hide or replace the next video',()=>{
 const f=fixture();f.guard.wait({overlay:true});const late=[...f.timers.values()][0];f.guard.stop();late();
 assert.equal(f.expired,0);assert.equal(f.timers.size,0);
 const g=fixture();g.guard.wait();g.stale();g.expire();assert.equal(g.expired,0);
});
