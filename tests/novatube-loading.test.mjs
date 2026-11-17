import test from 'node:test';
import assert from 'node:assert/strict';
import {createTubeLoadingGuard,observeTubePlayback} from '../Public/src/novatube-loading.mjs';
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
test('ready API and repeated unstarted notifications do not disable black-player recovery',()=>{
 const f=fixture();f.guard.wait({overlay:true});const deadline=[...f.timers.keys()][0];
 for(const message of [{event:'onReady'},{event:'onStateChange',info:-1},{event:'initialDelivery',info:{playerState:-1,currentTime:0}},{event:'onStateChange',info:'5'}])observeTubePlayback(f.guard,message);
 assert.deepEqual([...f.timers.keys()],[deadline]);assert.equal(f.loading.at(-1),false);
 f.expire();assert.equal(f.expired,1);
});
test('actual playback or advancing time clears startup recovery',()=>{
 for(const message of [{event:'onStateChange',info:'1'},{event:'infoDelivery',info:{currentTime:1}}]){
  const f=fixture();f.guard.wait();observeTubePlayback(f.guard,message);assert.equal(f.timers.size,0);
 }
});
test('blocked autoplay and an explicit pause leave a usable player rather than restarting it',()=>{
 for(const message of [{event:'onAutoplayBlocked'},{event:'onStateChange',info:2}]){
  const f=fixture();f.guard.wait();observeTubePlayback(f.guard,message);assert.equal(f.timers.size,0);assert.equal(f.loading.at(-1),false);
 }
});
