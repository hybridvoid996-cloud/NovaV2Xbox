import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusicSearchSession} from '../Public/src/nova-music-search-session.mjs';
test('new search aborts the old request and rejects its late response even if fetch ignores abort',async()=>{
 const session=createMusicSearchSession(),old=session.begin();let finish;
 const response=new Promise(resolve=>finish=resolve);let painted='';
 const pending=response.then(value=>{if(old.current())painted=value});
 const latest=session.begin();assert.equal(old.signal.aborted,true);
 painted='current results';finish('old results');await pending;
 assert.equal(painted,'current results');assert.equal(latest.current(),true);
});
test('leaving search invalidates pending results and errors; returning creates a fresh request',()=>{
 const session=createMusicSearchSession(),old=session.begin();session.cancel();
 assert.equal(old.current(),false);assert.equal(old.signal.aborted,true);
 const next=session.begin();assert.equal(next.signal.aborted,false);assert.equal(next.current(),true);
});
