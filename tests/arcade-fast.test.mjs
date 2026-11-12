import test from 'node:test';
import assert from 'node:assert/strict';
import {PLINKO,WHEEL,SLOT_SYMBOLS,slotMultiplier,playFast,settleFast,applyStats,DAILY_FAST_LIMIT,FAST_GAMES} from '../server/arcade-fast.mjs';

const C=(n,k)=>{let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return r};
const fair=(ev,name)=>assert.ok(ev>=.94&&ev<=.99,name+' expected return '+ev.toFixed(4)+' is outside 94–99%');

test('every payout table has a 1–6% house edge',()=>{
 for(const [risk,t] of Object.entries(PLINKO)){assert.equal(t.length,13);fair(t.reduce((a,v,k)=>a+v*C(12,k)/4096,0),'plinko '+risk)}
 for(const [risk,t] of Object.entries(WHEEL))fair(t.reduce((a,b)=>a+b,0)/t.length,'wheel '+risk);
 const T=SLOT_SYMBOLS.reduce((a,s)=>a+s.weight,0);let ev=0;
 for(const a of SLOT_SYMBOLS)for(const b of SLOT_SYMBOLS)for(const c of SLOT_SYMBOLS)ev+=a.weight*b.weight*c.weight/T**3*slotMultiplier([a.id,b.id,c.id]);
 fair(ev,'slots');
 fair(.5*1.9,'flip');fair(18/37*2,'roulette color');fair(1/37*36,'roulette number');
});

test('limbo pays the target about 97/target percent of the time',()=>{
 let s=7;const rand=k=>{s=(s*16807)%2147483647;return s%k};
 for(const target of [1.5,2,10]){let w=0,n=150000;for(let i=0;i<n;i++)w+=playFast('limbo',{target},rand).multiplier;fair(w/n,'limbo '+target)}
});

test('games reject bad choices',()=>{
 assert.throws(()=>playFast('flip',{choice:'edge'}),/heads or tails/);
 assert.throws(()=>playFast('roulette',{pick:'number',number:40}),/0 to 36/);
 assert.throws(()=>playFast('limbo',{target:1}),/1.01/);
 assert.throws(()=>playFast('plinko',{risk:'extreme'}),/risk/);
 assert.throws(()=>playFast('poker',{}),/game/);
 for(const g of FAST_GAMES)assert.ok(typeof g==='string');
});

const now=Date.parse('2026-11-11T15:00:00Z');
test('settlement moves coins once and replays retries',()=>{
 const p={coins:1000};
 const a=settleFast(p,{uid:'u',requestId:'r1',game:'flip',coins:200,plan:{multiplier:1.9,outcome:{side:'heads'}},now});
 assert.equal(a.progress.coins,1180);assert.equal(a.receipt.payout,380);assert.equal(a.receipt.won,true);
 const again=settleFast(p,{uid:'u',requestId:'r1',game:'flip',coins:200,plan:{multiplier:0,outcome:{side:'tails'}},now:now+1000});
 assert.equal(again.replay,true);assert.equal(p.coins,1180,'a retried request never charges twice');
 const loss=settleFast(p,{uid:'u',requestId:'r2',game:'dice',coins:500,plan:{multiplier:0,outcome:{number:2}},now:now+1000});
 assert.equal(loss.progress.coins,680);assert.equal(loss.receipt.won,false);
 assert.throws(()=>settleFast(p,{uid:'u',requestId:'r3',game:'dice',coins:5000,plan:{multiplier:0,outcome:{}},now:now+2000}),/enough/);
 assert.throws(()=>settleFast(p,{uid:'u',requestId:'r4',game:'dice',coins:100,plan:{multiplier:0,outcome:{}},now:now+1100}),/Slow down/);
});

test('daily limit and receipt pruning',()=>{
 const p={coins:10_000_000};
 for(let i=0;i<DAILY_FAST_LIMIT;i++)settleFast(p,{uid:'u',requestId:'id'+i,game:'flip',coins:100,plan:{multiplier:0,outcome:{}},now:now+i*1000});
 assert.throws(()=>settleFast(p,{uid:'u',requestId:'over',game:'flip',coins:100,plan:{multiplier:0,outcome:{}},now:now+60000}),/Daily limit/);
 assert.ok(Object.keys(p.arcade.receipts).length<=15);
});

test('leaderboard stats track net, won, lost and biggest win',()=>{
 let s=applyStats(null,{coins:100,payout:250,at:1});s=applyStats(s,{coins:500,payout:0,at:2});s=applyStats(s,{coins:100,payout:1000,at:3});
 assert.deepEqual({games:s.games,wagered:s.wagered,won:s.won,lost:s.lost,net:s.net,biggestWin:s.biggestWin},{games:3,wagered:700,won:1050,lost:500,net:550,biggestWin:900});
});
