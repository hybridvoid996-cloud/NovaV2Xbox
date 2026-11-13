import test from 'node:test';import assert from 'node:assert/strict';
import {novaFlipAction,FLIP_MIN_WAGER} from '../server/nova-flip.mjs';
function memoryDb(tree){
 const parts=p=>p.split('/').filter(Boolean),at=p=>parts(p).reduce((n,k)=>n==null?n:n[k],tree);
 const put=(p,v)=>{const k=parts(p),last=k.pop();let n=tree;for(const key of k){if(typeof n[key]!=='object'||n[key]===null)n[key]={};n=n[key]}if(v==null)delete n[last];else n[last]=structuredClone(v)};
 const snap=p=>{const v=at(p);return {val:()=>v==null?null:structuredClone(v),exists:()=>v!=null}};
 return {tree,ref:(p='')=>({get:async()=>snap(p),set:async v=>put(p,v),update:async patch=>{for(const [k,v]of Object.entries(patch))put((p?p+'/':'')+k,v)},
  transaction:async fn=>{const out=fn(at(p)==null?null:structuredClone(at(p)));if(out===undefined)return {committed:false,snapshot:snap(p)};put(p,out);return {committed:true,snapshot:snap(p)}}})};
}
const initial=()=>({xp:0,coins:0});const gameId='11111111-2222-3333-4444-555555555555';
const room=(status='lobby',extra={})=>({host:'h',status,settings:{wagers:true},players:{h:{name:'H'},a:{name:'A'},b:{name:'B'}},...extra});
const call=(db,uid,b,now=1e12)=>novaFlipAction({db,uid,account:{name:uid.toUpperCase()},b,now,initial});

test('wagers below 5,000 are refused and coins are held by the server',async()=>{
 const db=memoryDb({novaFlip:{rooms:{ABCDE:room()}},novaControl:{progress:{a:{coins:20000}}}});
 await assert.rejects(call(db,'a',{op:'wager',room:'ABCDE',amount:FLIP_MIN_WAGER-1}),/at least 5,000/);
 const r=await call(db,'a',{op:'wager',room:'ABCDE',amount:8000});assert.equal(r.coins,12000);
 assert.equal(db.tree.novaFlip.rooms.ABCDE.wagers.a.amount,8000);
 await call(db,'a',{op:'wager',room:'ABCDE',amount:6000});assert.equal(db.tree.novaControl.progress.a.coins,14000);
 await call(db,'a',{op:'unwager',room:'ABCDE'});assert.equal(db.tree.novaControl.progress.a.coins,20000);
 await assert.rejects(call(db,'a',{op:'wager',room:'ABCDE',amount:999999}),/enough/);
});

test('the human winner takes the whole pot exactly once',async()=>{
 const db=memoryDb({novaFlip:{rooms:{ABCDE:room()}},novaControl:{progress:{h:{coins:10000},a:{coins:10000},b:{coins:10000}}}});
 for(const [u,n]of [['h',5000],['a',7000],['b',9000]])await call(db,u,{op:'wager',room:'ABCDE',amount:n});
 db.tree.novaFlip.rooms.ABCDE.status='playing';db.tree.novaFlip.rooms.ABCDE.gameId=gameId;
 await call(db,'h',{op:'wagerLock',room:'ABCDE',gameId});
 await assert.rejects(call(db,'a',{op:'wager',room:'ABCDE',amount:6000}),/lobby/);
 Object.assign(db.tree.novaFlip.rooms.ABCDE,{status:'lobby',lastResult:{gameId,winner:'a',points:1200,at:1e12+60000}});
 const s=await call(db,'b',{op:'wagerSettle',room:'ABCDE'});
 assert.equal(s.pot,21000);assert.equal(s.paidTo,'a');
 assert.deepEqual([db.tree.novaControl.progress.h.coins,db.tree.novaControl.progress.a.coins,db.tree.novaControl.progress.b.coins],[5000,24000,1000]);
 const again=await call(db,'a',{op:'wagerSettle',room:'ABCDE'});assert.equal(again.pot,0);assert.equal(db.tree.novaControl.progress.a.coins,24000);
 assert.equal(Object.keys(db.tree.novaFlip.rooms.ABCDE.wagers||{}).length,0);assert.equal(db.tree.novaFlip.rooms.ABCDE.lastPot.amount,21000);
});

test('a bot win or a closed room refunds every stake',async()=>{
 const db=memoryDb({novaFlip:{rooms:{ABCDE:room()}},novaControl:{progress:{h:{coins:10000},a:{coins:10000}}}});
 await call(db,'h',{op:'wager',room:'ABCDE',amount:5000});await call(db,'a',{op:'wager',room:'ABCDE',amount:5000});
 Object.assign(db.tree.novaFlip.rooms.ABCDE,{status:'playing',gameId});await call(db,'h',{op:'wagerLock',room:'ABCDE',gameId});
 Object.assign(db.tree.novaFlip.rooms.ABCDE,{status:'lobby',lastResult:{gameId,winner:'bot-x',at:1e12+60000}});
 const s=await call(db,'a',{op:'wagerSettle',room:'ABCDE'});assert.equal(s.refunded,true);
 assert.equal(db.tree.novaControl.progress.h.coins,10000);assert.equal(db.tree.novaControl.progress.a.coins,10000);
 // Lobby stake, then the host closes the room: refunded when the player next opens Nova Flip.
 const db2=memoryDb({novaFlip:{rooms:{ABCDE:room()}},novaControl:{progress:{a:{coins:9000}}}});
 await call(db2,'a',{op:'wager',room:'ABCDE',amount:5000});db2.tree.novaFlip.rooms.ABCDE.status='closed';
 await call(db2,'a',{op:'stats'});assert.equal(db2.tree.novaControl.progress.a.coins,9000);
});

test('a result posted too quickly after the stakes lock refunds instead of paying',async()=>{
 const db=memoryDb({novaFlip:{rooms:{ABCDE:room()}},novaControl:{progress:{h:{coins:10000},a:{coins:10000}}}});
 await call(db,'h',{op:'wager',room:'ABCDE',amount:5000});await call(db,'a',{op:'wager',room:'ABCDE',amount:5000});
 Object.assign(db.tree.novaFlip.rooms.ABCDE,{status:'playing',gameId});await call(db,'h',{op:'wagerLock',room:'ABCDE',gameId});
 Object.assign(db.tree.novaFlip.rooms.ABCDE,{status:'lobby',lastResult:{gameId,winner:'h',at:1e12+5000}});
 const s=await call(db,'a',{op:'wagerSettle',room:'ABCDE'});assert.equal(s.refunded,true);
 assert.equal(db.tree.novaControl.progress.h.coins,10000);assert.equal(db.tree.novaControl.progress.a.coins,10000);
});
