import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fastMinesAction,fastArcadeRoundAction} from '../server/shop-rounds-fast.mjs';
import {SHOP_SEASON} from '../server/shop-season.mjs';

// Minimal in-memory Realtime Database: get / set / transaction on slash paths, JSON round-trip
// (like RTDB, nulls and empty objects vanish). Records which paths were transacted.
function fakeDb(data){
 const txPaths=[];
 const clean=v=>JSON.parse(JSON.stringify(v,(k,x)=>x===null?undefined:x)??'null');
 const at=path=>path.split('/').reduce((o,k)=>o?.[k],data);
 const put=(path,v)=>{const ks=path.split('/');let o=data;for(const k of ks.slice(0,-1))o=o[k]??={};if(v==null)delete o[ks.at(-1)];else o[ks.at(-1)]=v};
 const snap=v=>({val:()=>v==null?null:clean(v)});
 return {txPaths,data,ref:path=>({
  get:async()=>snap(at(path)),
  set:async v=>put(path,clean(v)),
  transaction:async fn=>{txPaths.push(path);const cur=at(path);const next=fn(cur==null?null:clean(cur));if(next===undefined)return {committed:false,snapshot:snap(cur)};put(path,clean(next));return {committed:true,snapshot:snap(at(path))}}
 })};
}
const initial=()=>({coins:0});
const setup=(coins=100000)=>fakeDb({novaControl:{shopSeason:{version:SHOP_SEASON,status:'ready'},progress:{u1:{coins,other:'kept'}}}});

test('mines: start, reveal and collect run on the player record only',async()=>{
 const db=setup();let now=1_800_000_000_000;
 let r=await fastMinesAction({db,uid:'u1',b:{op:'start',requestId:randomUUID(),coins:1000,mines:1},now,initial});
 assert.equal(r.round.state,'active');assert.equal(r.coins,99000);
 // 1 mine in 25: reveal until we get at least one gem (or hit), then collect if still active
 let tile=0;while(r.round.state==='active'&&r.round.picks.length<1){now+=500;r=await fastMinesAction({db,uid:'u1',b:{op:'reveal',roundId:r.round.id,tile:tile++,requestId:randomUUID()},now,initial})}
 if(r.round.state==='active'){now+=500;r=await fastMinesAction({db,uid:'u1',b:{op:'collect',roundId:r.round.id,requestId:randomUUID()},now,initial});assert.equal(r.round.state,'collected');assert.ok(r.coins>=99000+1000)}
 assert.ok(db.txPaths.every(p=>p==='novaControl/progress/u1'||p==='novaControl/gambleStats/u1'),'no whole-branch transaction: '+db.txPaths);
 assert.equal(db.data.novaControl.progress.u1.other,'kept');
 assert.equal(Object.keys(db.data.novaControl.wagerFeed||{}).length,1,'feed entry written');
 assert.equal(db.data.novaControl.gambleStats.u1.games,1,'leaderboard stats updated');
 const s=await fastMinesAction({db,uid:'u1',b:{op:'status'},now,initial});assert.equal(s.round.state,r.round.state);assert.equal(s.coins,r.coins);
});

test('mines: replaying a start is idempotent and a second active round is refused',async()=>{
 const db=setup();const now=1_800_000_000_000,id=randomUUID();
 const a=await fastMinesAction({db,uid:'u1',b:{op:'start',requestId:id,coins:500,mines:3},now,initial});
 const b=await fastMinesAction({db,uid:'u1',b:{op:'start',requestId:id,coins:500,mines:3},now:now+1000,initial});
 assert.equal(b.coins,a.coins);assert.equal(b.round.id,id);
 await assert.rejects(fastMinesAction({db,uid:'u1',b:{op:'start',requestId:randomUUID(),coins:500,mines:3},now:now+2000,initial}),/Finish or collect/);
 await assert.rejects(fastMinesAction({db,uid:'u1',b:{op:'start',requestId:randomUUID(),coins:500,mines:3},now:now+2000,initial:()=>({coins:0})}),/Finish or collect/);
});

test('mines: not enough coins is refused without changing the balance',async()=>{
 const db=setup(200);
 await assert.rejects(fastMinesAction({db,uid:'u1',b:{op:'start',requestId:randomUUID(),coins:1000,mines:2},now:1e12,initial}),/enough Nova Coins/);
 assert.equal(db.data.novaControl.progress.u1.coins,200);
});

test('legacy active mines round still finishes on the old handler',async()=>{
 const db=setup();db.data.novaControl.minesRounds={u1:{id:randomUUID(),state:'active',mines:1,stake:1000,picks:[],at:1}};
 const s=await fastMinesAction({db,uid:'u1',b:{op:'status'},now:1e12,initial});
 assert.equal(s.round.state,'active');assert.equal(s.round.stake,1000);
});

test('chicken: steps and collect',async()=>{
 const db=setup();let now=1_800_000_000_000;
 let r=await fastArcadeRoundAction({db,uid:'u1',b:{op:'start',game:'chicken',difficulty:'easy',coins:1000,requestId:randomUUID()},now,initial});
 assert.equal(r.round.state,'active');assert.equal(r.coins,99000);
 while(r.round.state==='active'&&r.round.steps<2){now+=500;r=await fastArcadeRoundAction({db,uid:'u1',b:{op:'step',game:'chicken',roundId:r.round.id,step:r.round.steps,requestId:randomUUID()},now,initial})}
 if(r.round.state==='active'){now+=500;r=await fastArcadeRoundAction({db,uid:'u1',b:{op:'collect',game:'chicken',roundId:r.round.id,requestId:randomUUID()},now,initial});assert.equal(r.round.state,'collected');assert.ok(r.coins>99000)}
 assert.ok(db.txPaths.every(p=>p.startsWith('novaControl/progress/u1')||p==='novaControl/gambleStats/u1'));
});

test('crash: collect after takeoff, and status settles a crashed round',async()=>{
 const db=setup();let now=1_800_000_000_000;
 let r=await fastArcadeRoundAction({db,uid:'u1',b:{op:'start',game:'crash',coins:1000,autoCashout:0,requestId:randomUUID()},now,initial});
 assert.equal(r.round.state,'active');
 await assert.rejects(fastArcadeRoundAction({db,uid:'u1',b:{op:'collect',game:'crash',roundId:r.round.id,requestId:randomUUID()},now:now+100,initial}),/takeoff/);
 now+=1300;r=await fastArcadeRoundAction({db,uid:'u1',b:{op:'collect',game:'crash',roundId:r.round.id,requestId:randomUUID()},now,initial});
 assert.ok(['collected','lost'].includes(r.round.state));
 // a new round left alone long enough must settle as lost (or auto cashout) when status is read
 r=await fastArcadeRoundAction({db,uid:'u1',b:{op:'start',game:'crash',coins:1000,autoCashout:0,requestId:randomUUID()},now:now+1000,initial});
 const s=await fastArcadeRoundAction({db,uid:'u1',b:{op:'status',game:'crash'},now:now+10*60*1000,initial});
 assert.equal(s.round.state,'lost');
});
