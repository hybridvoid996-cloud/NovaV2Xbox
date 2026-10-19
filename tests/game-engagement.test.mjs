import test from 'node:test';import assert from 'node:assert/strict';import {changeEngagement,engagementTotals} from '../server/game-engagement.mjs';
test('repeat openings increase total views',()=>{let r=changeEngagement(null,'a','view');r=changeEngagement(r,'a','view');r=changeEngagement(r,'b','view');assert.equal(engagementTotals(r,'a').views,3);});
test('votes are exclusive, switchable and removable',()=>{let r=changeEngagement(null,'a','like');r=changeEngagement(r,'b','like');r=changeEngagement(r,'a','dislike');assert.deepEqual(engagementTotals(r,'a'),{views:0,likes:1,dislikes:1,choice:'dislike'});r=changeEngagement(r,'a','dislike');assert.deepEqual(engagementTotals(r,'a'),{views:0,likes:1,dislikes:0,choice:null});});


test('existing unique-view totals migrate without losing history and reads or votes add no views',()=>{let r={viewers:{a:true,b:true},votes:{}};assert.equal(engagementTotals(r,'a').views,2);r=changeEngagement(r,'a','view');assert.equal(engagementTotals(r,'a').views,3);r=changeEngagement(r,'a','like');assert.equal(engagementTotals(r,'a').views,3);assert.equal(r.viewers,undefined);});

test('catalog lookup refreshes when a newly added game is requested',async()=>{
 const {createKnownGameLookup}=await import('../server/game-engagement.mjs');
 const games=[{id:1}],lookup=createKnownGameLookup(async name=>name==='games'?[...games]:[]);
 assert.equal(await lookup('game','1'),true);games.push({id:1001});
 assert.equal(await lookup('game','1001'),true);assert.equal(await lookup('game','999999'),false);
 assert.equal(await lookup('cloud','1001'),false);
});
test('new imported game records views and restores the saved vote',async()=>{
 const {gameEngagement}=await import('../server/game-engagement.mjs');let record;
 const db={ref(path){assert.equal(path,'novaControl/gameEngagement/game/1001');return {async get(){return {val:()=>record}},async transaction(change){record=change(record);return {snapshot:{val:()=>record}}}}}};
 assert.equal((await gameEngagement(db,'player',{kind:'game',id:1001,event:'view'})).views,1);
 assert.equal((await gameEngagement(db,'player',{kind:'game',id:1001,event:'like'})).likes,1);
 assert.deepEqual(await gameEngagement(db,'player',{kind:'game',id:1001,event:'read'}),{views:1,likes:1,dislikes:0,choice:'like'});
});
