import test from 'node:test';import assert from 'node:assert/strict';import {createMovieRecovery} from '../Public/src/movie-recovery.mjs';
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve()};
function clock(){let at=0,id=0;const tasks=new Map();return {schedule(fn,delay){tasks.set(++id,{fn,at:at+delay});return id},cancel(id){tasks.delete(id)},advance(ms){const end=at+ms;for(;;){const entry=[...tasks].sort((a,b)=>a[1].at-b[1].at).find(([,task])=>task.at<=end);if(!entry)break;at=entry[1].at;tasks.delete(entry[0]);entry[1].fn()}at=end}}}
test('a slow first player reconnects automatically, and loaded playback never restarts',async()=>{const c=clock(),launches=[],states=[];let disposed=0;const player=createMovieRecovery({...c,launch:args=>{launches.push(args);return ()=>disposed++},onState:s=>states.push(s)});player.start();await flush();c.advance(25000);assert.equal(disposed,1);assert.equal(states.at(-1),'reconnecting');c.advance(1000);await flush();assert.equal(launches.length,2);launches[0].ready();assert.equal(states.at(-1),'loading');launches[1].ready();assert.equal(states.at(-1),'ready');c.advance(100000);await flush();assert.equal(launches.length,2);player.stop();assert.equal(disposed,2)});
test('repeated connection failures stop after three attempts',async()=>{const c=clock(),states=[];let calls=0;const player=createMovieRecovery({...c,launch:()=>{calls++;throw Error('offline')},onState:s=>states.push(s)});player.start();await flush();c.advance(1000);await flush();c.advance(2000);await flush();assert.equal(calls,3);assert.equal(states.at(-1),'error');c.advance(100000);await flush();assert.equal(calls,3)});
test('leaving during a connection disposes its late frame and cancels pending retries',async()=>{const c=clock();let resolve,disposed=0,calls=0;const player=createMovieRecovery({...c,launch:()=>{calls++;return new Promise(r=>resolve=r)},onState(){}});player.start();await flush();player.stop();resolve(()=>disposed++);await flush();assert.equal(disposed,1);c.advance(100000);await flush();assert.equal(calls,1)});

test('a confirmed lost player can reconnect after readiness, while ordinary late request failures do not interrupt it',async()=>{const c=clock(),launches=[],states=[];const player=createMovieRecovery({...c,launch:args=>launches.push(args)&&(()=>{}),onState:s=>states.push(s)});player.start();await flush();launches[0].ready();launches[0].fail();c.advance(50000);await flush();assert.equal(launches.length,1);launches[0].lost();c.advance(1000);await flush();assert.equal(launches.length,2);assert.equal(states.at(-1),'loading');player.stop()});

test('useful startup progress keeps a slow laptop player alive, with a bounded total wait',async()=>{
 const c=clock(),launches=[],states=[];
 const player=createMovieRecovery({...c,launch:args=>{launches.push(args)},onState:s=>states.push(s)});
 player.start();await flush();
 c.advance(20000);launches[0].progress();c.advance(20000);launches[0].progress();
 assert.equal(launches.length,1);assert.equal(states.at(-1),'loading');
 c.advance(20000);assert.equal(states.at(-1),'reconnecting');
 c.advance(1000);await flush();assert.equal(launches.length,2);player.stop();
});

test('an interactive hint cannot disable the total startup deadline',async()=>{const c=clock(),launches=[],states=[];const player=createMovieRecovery({...c,launch:args=>{launches.push(args)},onState:s=>states.push(s)});player.start();await flush();launches[0].hold();launches[0].progress();c.advance(59000);await flush();assert.equal(launches.length,1);assert.equal(states.at(-1),'interactive');c.advance(1000);assert.equal(states.at(-1),'reconnecting');c.advance(1000);await flush();assert.equal(launches.length,2);launches[1].ready();c.advance(200000);assert.equal(states.at(-1),'ready');player.stop()});
