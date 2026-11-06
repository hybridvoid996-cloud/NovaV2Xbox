import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverableWager,wagerRecoveryKey} from '../Public/src/wager-recovery.mjs';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
test('lost response retries the same bet ID and keeps one charge',async()=>{
 const storage=memory(),body={op:'start',requestId:'same-id'},receipts=new Map();let charges=0,calls=0;
 const result=await recoverableWager({uid:'a',action:'storeMines',body,storage,delay:async()=>{},send:async b=>{calls++;if(!receipts.has(b.requestId)){charges++;receipts.set(b.requestId,{coins:900,round:{id:b.requestId}})}if(calls===1)throw Error('Response lost');return receipts.get(b.requestId)}});
 assert.equal(charges,1);assert.equal(result.round.id,'same-id');assert.equal(storage.getItem(wagerRecoveryKey('a','storeMines',body)),undefined);
});
test('reopening restores unresolved action and another account cannot consume it',async()=>{
 const storage=memory(),body={op:'start',requestId:'old-id'};
 await assert.rejects(recoverableWager({uid:'a',action:'storeMines',body,storage,delay:async()=>{},send:async()=>{throw Error('offline')}}));
 let sent;await recoverableWager({uid:'b',action:'storeMines',body:{op:'status'},storage,send:async b=>{sent=b;return {}}});assert.equal(sent.op,'status');
 await recoverableWager({uid:'a',action:'storeMines',body:{op:'status'},storage,send:async b=>{sent=b;return {}}});assert.equal(sent.requestId,'old-id');
});
test('rejected bet is not retried',async()=>{let calls=0;await assert.rejects(recoverableWager({uid:'a',action:'storeGamble',body:{requestId:'x'},storage:memory(),send:async()=>{calls++;throw Object.assign(Error('Insufficient coins'),{status:400})}}));assert.equal(calls,1)});
