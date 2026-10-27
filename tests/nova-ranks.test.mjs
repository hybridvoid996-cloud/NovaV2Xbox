import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceRank,rankForElo,rankSummary,NOVA_RANKS,RANK_DAILY_SECONDS} from '../Public/src/nova-rank-core.mjs';
import {createRankInput} from '../Public/src/nova-rank-input.mjs';
const session='11111111-1111-4111-8111-111111111111',event={active:true,game:'game:27',session};
test('only consecutive active, same-game pulses earn bounded server time',()=>{
 let {record}=advanceRank({},event,100000);assert.equal(record.elo,0);
 ({record}=advanceRank(record,event,115000));assert.equal(record.seconds,15);
 assert.equal(advanceRank(record,event,115000).seconds,0);
 assert.equal(advanceRank(record,event,120000).seconds,5);
 assert.equal(advanceRank(record,{...event,session:'22222222-2222-4222-8222-222222222222'},130000).seconds,0);
 assert.equal(advanceRank(record,{...event,game:'game:28'},130000).seconds,0);
 assert.equal(advanceRank(record,{...event,active:false},130000).seconds,0);
 assert.equal(advanceRank(record,{...event,game:'app:7'},130000).seconds,0);
 assert.equal(advanceRank(record,event,180000).seconds,0);
 assert.equal(advanceRank(record,event,110000).seconds,0);
});
test('rank rewards are emitted exactly once and daily earning is capped',()=>{
 const at=Date.UTC(2026,9,26,12),row={at:at-15000,active:true,session,game:'game:27',seconds:7190,elo:7190/60,rewarded:0,day:'2026-10-26',dailySeconds:RANK_DAILY_SECONDS-5};
 let next=advanceRank(row,event,at);assert.equal(next.seconds,5);assert.equal(next.promotions.length,0);
 next=advanceRank({...row,dailySeconds:0},event,at);assert.equal(next.promotions[0].id,'bronze');assert.equal(next.promotions[0].coins,5000);
 assert.deepEqual(advanceRank(next.record,event,at+15000).promotions,[]);
 assert.equal(advanceRank({...row,dailySeconds:RANK_DAILY_SECONDS},event,at).seconds,0);
 assert.equal(advanceRank({...row,at:at+86400000-15000,dailySeconds:RANK_DAILY_SECONDS},event,at+86400000).seconds,15);
});
test('ELO ladder has distinct increasing requirements and champion requires Master and first place',()=>{
 for(let i=1;i<NOVA_RANKS.length;i++)assert.ok(NOVA_RANKS[i].elo>NOVA_RANKS[i-1].elo);
 assert.equal(rankForElo(599).id,'bronze');assert.equal(rankForElo(600).id,'silver');
 assert.equal(rankSummary({elo:600},1).champion,false);assert.equal(rankSummary({elo:18000},1).champion,true);assert.equal(rankSummary({elo:48000},2).champion,false);
 assert.equal(rankSummary({elo:600}).remaining,1200);
});
test('manual repeated movement keys count, while synthetic events, key autorepeat and mouse jiggling do not',()=>{
 let at=0;const input=createRankInput(()=>at);assert.equal(input.active(),false);
 for(const code of ['Space','KeyW','KeyW','KeyA']){at+=1000;assert.equal(input.input({type:'keydown',isTrusted:true,repeat:false,code}),true)}
 at+=45000;assert.equal(input.active(),false);
 for(const event of [{type:'keydown',isTrusted:false},{type:'keydown',isTrusted:true,repeat:true},{type:'pointermove',isTrusted:true}])assert.equal(input.input(event),false);
 assert.equal(input.active(),false);input.input({type:'pointerdown',isTrusted:true});assert.equal(input.active(),true);input.reset();assert.equal(input.active(),false);
});
