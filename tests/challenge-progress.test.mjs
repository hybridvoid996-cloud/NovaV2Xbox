import test from 'node:test';import assert from 'node:assert/strict';
import {challengeCatalog,createChallenges,advanceChallenges} from '../server/challenge-progress.mjs';
import {CHALLENGE_PERIOD} from '../server/challenge-cycle.mjs';
const all=['game','app','cloud'].flatMap(kind=>Array.from({length:4},(_,i)=>({id:String(i),kind,name:kind+' '+i,art:'/Nova12.png'}))),session='11111111-1111-4111-8111-111111111111';
const pulse=(p,body,now)=>advanceChallenges(p,{uid:'u',body:{session,...body},all,now});
test('nine deterministic challenges mix games, apps, cloud and watching with higher rewards',async()=>{
 const rows=createChallenges('u',all,1000);assert.equal(rows.length,9);for(const [kind,count]of [['game',3],['app',2],['cloud',2],['movie',2]])assert.equal(rows.filter(c=>c.kind===kind).length,count);
 assert.deepEqual(rows.map(c=>c.minutes),[20,25,30,35,40,45,50,55,60]);assert.equal(rows[0].reward,25000);assert.equal(rows[8].reward,225000);assert.deepEqual(createChallenges('u',all,1000),rows);
 assert.equal(createChallenges('u',await challengeCatalog(),1000).length,9);
});
for(const kind of ['game','app','cloud'])test(kind+' time counts only its own kind and pays exactly once',()=>{
 const p=pulse({xp:0,coins:0},{active:false},1000),c=p.challenges.find(c=>c.kind===kind),body={active:true,kind,game:c.id};pulse(p,body,2000);pulse(p,body,17000);assert.equal(c.seconds,15);assert.equal(p.xp,25);
 for(const other of p.challenges.filter(x=>x!==c))assert.equal(other.seconds,0);
 c.seconds=c.minutes*60-15;pulse(p,body,32000);assert.equal(c.claimed,true);assert.equal(p.coins,c.reward);pulse(p,body,47000);assert.equal(p.coins,c.reward);
});
test('watching requires advancing video and does not pay for paused time or large seeks',()=>{
 const p=pulse({xp:0,coins:0},{active:false},1000),c=p.challenges.find(c=>c.id==='watch-movies'),body={active:true,kind:'movie',game:'123',mediaType:'movie',position:10};pulse(p,body,2000);pulse(p,{...body,position:25},17000);assert.equal(c.seconds,15);
 pulse(p,{...body,position:25},32000);assert.equal(c.seconds,15);pulse(p,{...body,position:1000},47000);assert.equal(c.seconds,15);pulse(p,{...body,position:1015},62000);assert.equal(c.seconds,30);pulse(p,{...body,active:false,position:1030},77000);assert.equal(c.seconds,30);
});
test('show and anime playback count toward the series challenge',()=>{
 for(const mediaType of ['tv','anime']){const p=pulse({xp:0,coins:0},{active:false},1000),body={active:true,kind:'movie',game:'1',mediaType,position:10};pulse(p,body,2000);pulse(p,{...body,position:25},17000);assert.equal(p.challenges.find(c=>c.id==='watch-series').seconds,15);assert.equal(p.challenges.find(c=>c.id==='watch-movies').seconds,0)}
});
test('invalid activities, switching sessions and out-of-order pulses cannot create time',()=>{
 const p=pulse({xp:0,coins:0},{active:false},1000),c=p.challenges[0],body={active:true,kind:c.kind,game:c.id};pulse(p,body,2000);pulse(p,{...body,session:'22222222-2222-4222-8222-222222222222'},17000);assert.equal(c.seconds,0);pulse(p,body,1000);assert.equal(p.lastAt,17000);pulse(p,{active:true,kind:'game',game:'missing'},32000);assert.equal(p.xp,0);
});
test('seven-hour reset preserves balances and never pays an old completion again',()=>{
 const p=pulse({xp:100,coins:500},{active:false},1000);p.challenges[0].claimed=true;pulse(p,{active:false},1000+CHALLENGE_PERIOD-1);assert.equal(p.challenges[0].claimed,true);pulse(p,{active:false},1000+CHALLENGE_PERIOD);assert.equal(p.challenges.length,9);assert.ok(p.challenges.every(c=>!c.claimed&&c.seconds===0));assert.equal(p.coins,500);assert.equal(p.resetAt,1000+2*CHALLENGE_PERIOD);
});
