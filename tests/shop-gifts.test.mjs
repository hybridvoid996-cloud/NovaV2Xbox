import test from 'node:test';import assert from 'node:assert/strict';
import {giftPlan,settleGift,settleOpenGift} from '../server/shop-gifts.mjs';
import {SHOP_SEASON} from '../server/shop-season.mjs';
import {shopPrices} from '../Public/src/shop-config.mjs';

const items=[{id:'gem',kind:'decoration',rarity:'common',name:'Gem'},{id:'star',kind:'decoration',rarity:'epic',name:'Star',collection:'Cosmos'}];
const now=Date.parse('2026-11-12T12:00:00Z'),initial=()=>({xp:0,coins:0});
const id=n=>String(n).repeat(8)+'-1111-4111-8111-111111111111';
const root=()=>({shopSeason:{version:SHOP_SEASON,status:'ready'},progress:{a:{coins:100000},b:{coins:0}},inventory:{a:{gem:{count:1}}}});
const roll=(kind,count)=>Array.from({length:count},()=>items[0]);

test('crate gifts charge the sender once, hold rolled rewards until the recipient opens them',()=>{
 const r=root(),b={type:'crate',kind:'decoration',count:3,to:'b',requestId:id(1),note:'  good   luck '};
 const plan=giftPlan(b,items,now,roll);assert.equal(plan.cost,shopPrices.decoration[3]);assert.equal(plan.note,'good luck');
 const gift=settleGift(r,'a',b,plan,{now,initial,fromName:'Ana'});
 assert.equal(r.progress.a.coins,100000-plan.cost);assert.equal(gift.fromName,'Ana');assert.equal(r.inventory.b,undefined);
 // A retried request returns the same gift without a second charge.
 settleGift(r,'a',b,plan,{now,initial,fromName:'Ana'});assert.equal(r.progress.a.coins,100000-plan.cost);
 settleOpenGift(r,'b',id(1),now+5);assert.equal(r.inventory.b.gem.count,3);
 settleOpenGift(r,'b',id(1),now+6);assert.equal(r.inventory.b.gem.count,3);
});

test('item gifts move one owned cosmetic; failures change nothing',()=>{
 const r=root(),b={type:'item',id:'gem',to:'b',requestId:id(2)};
 settleGift(r,'a',b,giftPlan(b,items,now,roll),{now,initial});assert.equal(r.inventory.a.gem,undefined);
 const again={...b,requestId:id(3)},before=JSON.stringify(r);
 assert.throws(()=>settleGift(r,'a',again,giftPlan(again,items,now,roll),{now,initial}),/no longer own/);assert.equal(JSON.stringify(r),before);
 settleOpenGift(r,'b',id(2),now);assert.equal(r.inventory.b.gem.count,1);
});

test('gifts reject self, missing coins, bad bundles and reused IDs',()=>{
 const r=root();
 assert.throws(()=>giftPlan({type:'crate',kind:'decoration',count:2,to:'b',requestId:id(4)},items,now,roll),/bundle/);
 const self={type:'crate',kind:'decoration',count:1,to:'a',requestId:id(4)};assert.throws(()=>settleGift(r,'a',self,giftPlan(self,items,now,roll),{now,initial}),/another/);
 const poor={type:'crate',kind:'decoration',count:1,to:'a',requestId:id(5)};assert.throws(()=>settleGift(r,'b',poor,giftPlan(poor,items,now,roll),{now,initial}),/Nova Coins/);
 const b={type:'item',id:'gem',to:'b',requestId:id(6)};settleGift(r,'a',b,giftPlan(b,items,now,roll),{now,initial});
 const reuse={type:'crate',kind:'decoration',count:1,to:'b',requestId:id(6)};assert.throws(()=>settleGift(r,'a',reuse,giftPlan(reuse,items,now,roll),{now,initial}),/already used/);
 assert.throws(()=>settleOpenGift(r,'a',id(6),now),/not found/);
});
