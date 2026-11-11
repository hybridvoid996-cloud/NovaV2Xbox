import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverAIRequest} from '../Public/src/ai-request-recovery.mjs';
test('reconnect preserves request identity and message and returns recovered answer',async()=>{
 const request={requestId:'one-request',messages:[{role:'user',text:'Help with math'}]},seen=[],statuses=[];
 const result=await recoverAIRequest(async value=>{seen.push(value);if(seen.length<3)throw Object.assign(Error('Unavailable'),{status:503});return {text:'Recovered'}},request,{sleep:async()=>{},onStatus:s=>statuses.push(s)});
 assert.equal(result.text,'Recovered');assert.ok(seen.every(value=>value===request));assert.equal(statuses.length,2);
});
test('validation, balance and billing failures do not retry',async()=>{
 for(const error of [Error('Not enough tokens'),Object.assign(Error('Unavailable'),{status:402}),Error('Invalid request')]){
  let calls=0;await assert.rejects(recoverAIRequest(async()=>{calls++;throw error},{},{sleep:async()=>{}}));assert.equal(calls,1);
 }
});
test('reconnection stops after bounded attempts',async()=>{
 let calls=0;await assert.rejects(recoverAIRequest(async()=>{calls++;throw Error('Network failed')},{},{sleep:async()=>{},attempts:3}));assert.equal(calls,3);
});

test('browser timeout names and serialized timeout messages reconnect',async()=>{for(const error of [Object.assign(Error('The operation was aborted due to timeout'),{name:'TimeoutError'}),Error('The operation was aborted due to timeout')]){let calls=0;const result=await recoverAIRequest(async()=>{if(++calls===1)throw error;return {text:'Done'}},{requestId:'same-id'},{sleep:async()=>{}});assert.equal(result.text,'Done');assert.equal(calls,2)}});
