import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureShopSeason,SHOP_SEASON,HALLOWEEN_END} from '../server/shop-season.mjs';
import {wagerPlan,settleWager,wheelColor} from '../server/shop-games.mjs';
import {storeAction,catalog,draw,odds} from '../server/chat-store.mjs';
function fixture(data){
 const get=path=>path?path.split('/').reduce((v,k)=>v?.[k],data)??null:data;
 const set=(path,value)=>{const parts=path.split('/');let row=data;for(const p of parts.slice(0,-1))row=row[p]??={};if(value===null)delete row[parts.at(-1)];else row[parts.at(-1)]=structuredClone(value)};
 const snapshot=value=>({val:()=>structuredClone(value),exists:()=>value!==null});
 const db={ref(path=''){return {get:async()=>snapshot(get(path)),update:async values=>{for(const [key,value]of Object.entries(values))set([path,key].filter(Boolean).join('/'),value)},transaction:async fn=>{fn(null);const next=fn(structuredClone(get(path)));if(next===undefined)return {committed:false,snapshot:snapshot(get(path))};set(path,next);return {committed:true,snapshot:snapshot(next)}}}}};
 return {db,get,data};
}
test('season resets all inventories once, archives them and clears equipped cosmetics without changing coins, XP, Nitro or uploaded banners',async()=>{
 const f=fixture({novaControl:{inventory:{one:{a:{count:2}},two:{b:{count:1}}},progress:{one:{coins:900,xp:500}},nitro:{one:true}},novaChatV2:{profiles:{one:{decoration:'a',effect:'e',chatBanner:'b',banner:'https://example.com/custom.png'},two:{banner:'old-banner',effect:'x'}}}});
 await ensureShopSeason(f.db,1000,[{kind:'banner',id:'old-banner'}]);
 assert.deepEqual(f.get('novaControl/inventory'),{});assert.equal(f.get('novaControl/shopArchives/'+SHOP_SEASON+'/inventory/one/a/count'),2);
 assert.equal(f.get('novaControl/progress/one/coins'),900);assert.equal(f.get('novaControl/progress/one/xp'),500);assert.equal(f.get('novaControl/nitro/one'),true);
 assert.equal(f.get('novaChatV2/profiles/one/decoration'),null);assert.equal(f.get('novaChatV2/profiles/one/banner'),'https://example.com/custom.png');assert.equal(f.get('novaChatV2/profiles/two/banner'),null);
 f.data.novaControl.inventory.one={fresh:{count:1}};await ensureShopSeason(f.db,2000,[]);assert.equal(f.get('novaControl/inventory/one/fresh/count'),1);
});
test('another process cannot purchase while the global reset is in progress',async()=>{
 const f=fixture({novaControl:{shopSeason:{version:SHOP_SEASON,status:'resetting',token:'other',until:5000}}});
 await assert.rejects(ensureShopSeason(f.db,1000,[]),/preparing/);
});
test('roulette uses a real green zero, honest color odds, and consistent number/color choices',()=>{
 assert.equal(wheelColor(0),'green');assert.equal(Array.from({length:37},(_,n)=>wheelColor(n)).filter(c=>c==='red').length,18);
 const base={game:'roulette',stake:'coins',coins:100,pick:'color',color:'red'};
 assert.equal(wagerPlan(base,[],()=>0).payout,0);assert.equal(wagerPlan(base,[],()=>1).payout,200);
 assert.equal(wagerPlan({...base,pick:'number',number:1},[],()=>1).payout,3600);
 assert.throws(()=>wagerPlan({...base,pick:'both',number:2},[],()=>1),/color/);
});
test('invalid games, stakes, unsafe amounts and forged cosmetics fail before settlement',()=>{
 for(const body of [{game:'cheat'},{game:'flip',stake:'coins',coins:-1,choice:'heads'},{game:'dice',stake:'coins',coins:100.5,choice:'low'},{game:'flip',stake:'coins',coins:100001,choice:'heads'},{game:'flip',stake:'cosmetic',item:'missing',choice:'heads'}])assert.throws(()=>wagerPlan(body,[],()=>0));
});
test('coins settle at advertised payouts, insufficient funds and daily limits are rejected',()=>{
 const b={game:'flip',stake:'coins',coins:100,choice:'heads'},plan=wagerPlan(b,[],()=>0),root={progress:{u:{coins:500}}};
 assert.equal(settleWager(root,'u',b,plan,100000).balance,590);assert.throws(()=>settleWager(root,'u',b,plan,100001),/finish/);
 root.wagerLimits.u.coins=50;assert.throws(()=>settleWager(root,'u',b,plan,104000),/Daily/);
 assert.throws(()=>settleWager({progress:{u:{coins:99}}},'u',b,plan,100000),/enough/);
});
test('cosmetic losses consume one copy; wins keep it and award category credits based on rarity',()=>{
 const items=[{id:'rare',kind:'effect',rarity:'mythic'}],b={game:'flip',stake:'cosmetic',item:'rare',choice:'heads'};
 let root={progress:{u:{coins:0}},inventory:{u:{rare:{count:2}}}};settleWager(root,'u',b,wagerPlan(b,items,()=>1),100000);assert.equal(root.inventory.u.rare.count,1);
 settleWager(root,'u',b,wagerPlan(b,items,()=>0),104000);assert.equal(root.inventory.u.rare.count,1);assert.equal(root.crateCredits.u.effect,8);
 settleWager(root,'u',b,wagerPlan(b,items,()=>1),108000);assert.equal(root.inventory.u.rare,undefined);assert.throws(()=>settleWager(root,'u',b,wagerPlan(b,items,()=>0),112000),/Daily/);
});
test('wager retry returns the original receipt without another debit and rejects changed parameters',async()=>{
 const f=fixture({novaControl:{shopSeason:{version:SHOP_SEASON,status:'ready'},progress:{u:{coins:1000}}}}),b={requestId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',game:'flip',stake:'coins',coins:100,choice:'heads'};
 const args={db:f.db,uid:'u',account:{name:'User'},action:'storeGamble',b,now:100000,initial:()=>({coins:0})};
 const first=await storeAction(args),second=await storeAction({...args,now:110000});assert.deepEqual(second.receipt,first.receipt);assert.equal(second.coins,first.coins);
 await assert.rejects(storeAction({...args,b:{...b,coins:200},now:120000}),/already used/);
});
test('Halloween has all six rarity tiers, standard cases exclude it, and the end date is enforced on the server',async()=>{
 const items=await catalog();assert.equal(items.filter(i=>i.collection==='halloween').length,15);
 for(const [rarity]of odds)assert.ok(items.some(i=>i.collection==='halloween'&&i.rarity===rarity));
 assert.ok(draw(items,'halloween',10).every(i=>i.collection==='halloween'));assert.ok(draw(items,'decoration',10).every(i=>i.collection!=='halloween'));
 const f=fixture({novaControl:{shopSeason:{version:SHOP_SEASON,status:'ready'},progress:{u:{coins:50000}},crateCredits:{u:{decoration:2}}}});
 await assert.rejects(storeAction({db:f.db,uid:'u',account:{},action:'openCase',b:{kind:'halloween',count:1,requestId:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'},now:HALLOWEEN_END,initial:()=>({coins:0})}),/ended/);
 const r=await storeAction({db:f.db,uid:'u',account:{},action:'openCase',b:{kind:'decoration',count:1,useCredits:true,requestId:'cccccccc-cccc-cccc-cccc-cccccccccccc'},now:HALLOWEEN_END,initial:()=>({coins:0})});assert.equal(r.coins,50000);assert.equal(f.get('novaControl/crateCredits/u/decoration'),1);
});

test('five won crate credits can be opened in one fast bundle without charging coins',async()=>{const f=fixture({novaControl:{shopSeason:{version:SHOP_SEASON,status:'ready'},progress:{u:{coins:500}},crateCredits:{u:{decoration:5}}}});const args={db:f.db,uid:'u',account:{},action:'openCase',b:{kind:'decoration',count:5,useCredits:true,requestId:'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'},now:100000,initial:()=>({coins:0})};const result=await storeAction(args);assert.equal(result.rewards.length,5);assert.equal(result.coins,500);assert.equal(f.get('novaControl/crateCredits/u/decoration'),0);assert.equal((await storeAction(args)).rewards.length,5);await assert.rejects(storeAction({...args,b:{...args.b,useCredits:false,requestId:'ffffffff-ffff-ffff-ffff-ffffffffffff'}}),/valid case bundle/)});
test('raised virtual coin wager cap accepts 100k and rejects amounts above it',()=>{assert.equal(wagerPlan({game:'flip',stake:'coins',coins:100000,choice:'heads'},[],()=>0).coins,100000);assert.throws(()=>wagerPlan({game:'flip',stake:'coins',coins:100001,choice:'heads'},[],()=>0));});
