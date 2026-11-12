import test from 'node:test';import assert from 'node:assert/strict';
import {liveTradeAction} from '../server/shop-live-trades.mjs';
import {attemptTrade} from '../server/shop-trades.mjs';
import {SHOP_SEASON} from '../server/shop-season.mjs';

// Minimal in-memory Realtime Database: get/set/update/remove/transaction, with an optional
// stale first read inside transactions to mimic a cold or outdated local cache.
function memoryDb(data,{stale}={}){
 const parts=p=>p.split('/').filter(Boolean),at=p=>parts(p).reduce((n,k)=>n?.[k],data);
 const put=(p,v)=>{const k=parts(p),last=k.pop();let n=data;for(const key of k)n=n[key]??={};if(v===null||v===undefined)delete n[last];else n[last]=structuredClone(v)};
 const db={ref:(p='')=>({
  get:async()=>({val:()=>structuredClone(at(p)??null),exists:()=>at(p)!==undefined}),
  set:async v=>put(p,v),remove:async()=>put(p,null),
  update:async patch=>{for(const [k,v]of Object.entries(patch))put(p+'/'+k,v)},
  transaction:async fn=>{let guess=stale?.[p];for(let i=0;i<5;i++){const current=structuredClone(at(p)??null),input=guess!==undefined?structuredClone(guess):current;guess=undefined;const out=fn(input);if(out===undefined)return {committed:false,snapshot:{val:()=>current}};if(JSON.stringify(input)!==JSON.stringify(current))continue;put(p,out);return {committed:true,snapshot:{val:()=>structuredClone(at(p)??null)}}}throw Error('retries')}
 })};return db;
}
const items=[{id:'gem',kind:'decoration',name:'Gem'}],now=Date.now();
const seed=()=>({novaAccounts:{a:{name:'Ana'},b:{name:'Bo'}},novaChatV2:{},novaControl:{shopSeason:{version:SHOP_SEASON,status:'ready'},progress:{a:{coins:1000},b:{coins:1000}},inventory:{a:{gem:{count:1}}}}});

test('a full live trade settles through room transactions and one shop transaction',async()=>{
 const data=seed(),db=memoryDb(data),call=(uid,b)=>liveTradeAction({db,uid,b,items,now});
 const requestId='11111111-1111-4111-8111-111111111111',id=requestId;
 await call('a',{op:'liveInvite',to:'b',requestId});
 await call('b',{op:'liveJoin',id});
 await call('a',{op:'liveChat',id,requestId:'22222222-2222-4222-8222-222222222222',text:'hi'});
 let r=await call('a',{op:'liveOffer',id,revision:0,offer:{coins:0,items:{gem:1}}});assert.equal(r.room.revision,1);
 r=await call('b',{op:'liveOffer',id,revision:1,offer:{coins:300,items:{}}});assert.equal(r.room.revision,2);
 await call('a',{op:'liveConfirm',id,revision:2});
 r=await call('b',{op:'liveConfirm',id,revision:2});
 assert.equal(r.room.state,'completed');
 assert.equal(data.novaControl.progress.a.coins,1300);assert.equal(data.novaControl.progress.b.coins,700);
 assert.equal(data.novaControl.inventory.b.gem.count,1);assert.equal(data.novaControl.inventory.a.gem,undefined);
 assert.ok(Object.keys(data.novaChatV2.botMessages.a).length>0);
});

test('a stale cached copy no longer rejects a trader who really owns the item',async()=>{
 const data=seed(),requestId='33333333-3333-4333-8333-333333333333';
 // The local cache is outdated (old season, no items); the server copy is current.
 const staleRoot=structuredClone(data.novaControl);staleRoot.inventory={};staleRoot.shopSeason={version:'old',status:'ready'};
 const db=memoryDb(data,{stale:{'novaControl':staleRoot}});
 const r=await liveTradeAction({db,uid:'a',b:{op:'liveInvite',to:'b',requestId},items,now});
 assert.equal(r.room.state,'invited');
});

test('a check that fails part-way restores the touched records',()=>{
 const root={progress:{a:{coins:5}},trades:{}};
 assert.throws(()=>attemptTrade(root,['a','b'],['t'],()=>{root.progress.a.coins=0;root.progress.b={coins:9};root.trades.t={state:'pending'};throw Error('no')}),/no/);
 assert.deepEqual(root,{progress:{a:{coins:5}},trades:{}});
});
