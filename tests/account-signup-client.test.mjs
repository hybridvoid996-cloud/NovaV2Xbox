import test from 'node:test';
import assert from 'node:assert/strict';
import {createOrResumeAccount} from '../Public/src/account-signup-client.mjs';
test('new signup never attempts login',async()=>{
 const result=await createOrResumeAccount('new@example.test','password',{create:async()=>({uid:'new'}),signIn:()=>assert.fail()});
 assert.equal(result.resumed,false);assert.equal(result.user.uid,'new');
});
test('existing email with different password reports duplicate email during signup',async()=>{
 await assert.rejects(createOrResumeAccount('existing@example.test','password',{create:async()=>{throw {code:'auth/email-already-in-use'}},signIn:async()=>{throw {code:'auth/invalid-credential'}}}),e=>e.code==='auth/email-already-in-use'&&/different email/.test(e.message));
});
test('interrupted signup resumes only after successful password authentication',async()=>{
 const result=await createOrResumeAccount('existing@example.test','password',{create:async()=>{throw {code:'auth/email-already-in-use'}},signIn:async()=>({uid:'existing'})});
 assert.equal(result.resumed,true);assert.equal(result.user.uid,'existing');
});
test('signup preserves network errors',async()=>{
 await assert.rejects(createOrResumeAccount('new@example.test','password',{create:async()=>{throw {code:'auth/network-request-failed'}},signIn:()=>assert.fail()}),e=>e.code==='auth/network-request-failed');
});
