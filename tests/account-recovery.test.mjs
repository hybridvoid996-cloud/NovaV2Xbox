import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {issueAccountRecovery,revokeAccountRecovery,redeemAccountRecovery,requireRecoveryPrivacy} from '../server/account-recovery.mjs';
import {createHandler} from '../api-handlers/account-recovery.js';
const now=Date.parse('2026-10-25T12:00:00Z');
function setup({cold=false}={}){
 const data={novaAccounts:{owner:{name:'Owner'},one:{name:'Player One'},two:{name:'Other'}},novaChatV2:{roles:{owner:'owner',one:'member',two:'member'}}};let rules={'.read':false,'.write':false,novaAccountRecovery:{'.read':false,'.write':false}},disabled=false,mints=[];
 const get=p=>p.split('/').reduce((value,key)=>value?.[key],data)??null;
 const set=(p,value)=>{const keys=p.split('/');let row=data;for(const key of keys.slice(0,-1))row=row[key]??={};if(value===null)delete row[keys.at(-1)];else row[keys.at(-1)]=structuredClone(value)};
 const snap=value=>({val:()=>structuredClone(value),exists:()=>value!==null});
 const db={getRulesJSON:async()=>({rules}),ref:p=>({get:async()=>snap(get(p)),set:async value=>set(p,value),update:async patch=>{for(const [path,value]of Object.entries(patch))set(p+'/'+path,value)},push:async value=>set(p+'/'+Object.keys(get(p)||{}).length,value),transaction:async fn=>{if(cold&&p.includes('/accounts/')&&get(p)!==null)assert.equal(fn(null),null);const value=fn(get(p));if(value===undefined)return {committed:false,snapshot:snap(get(p))};set(p,value);return {committed:true,snapshot:snap(value)}}})};
 const auth={getUser:async uid=>({uid,disabled}),createCustomToken:async uid=>{mints.push(uid);return 'token-for-'+uid}};
 return {data,db,auth,get,set,mints,disable:()=>disabled=true,rules:value=>rules=value,issue:()=>issueAccountRecovery({db,auth,uid:'one',issuer:'owner',now}),redeem:(code,username='Player One',at=now)=>redeemAccountRecovery({db,auth,username,code,ip:'test',now:at})};
}
test('codes are hashed at rest, account-bound, single use and audited without secrets',async()=>{
 const s=setup(),issued=await s.issue();assert.equal(issued.expiresAt,now+900000);assert.match(issued.code,/^[A-F0-9]{6}(?:-[A-F0-9]{6}){5}$/);
 const normalized=issued.code.replaceAll('-',''),hash=createHash('sha256').update(normalized).digest('hex');assert(s.get('novaAccountRecovery/codes/'+hash));assert.equal(JSON.stringify(s.data).includes(normalized),false);assert.equal(JSON.stringify(s.data).includes(issued.code),false);
 await assert.rejects(s.redeem(issued.code,'Other'),error=>error.status===401);assert.equal(s.mints.length,0);
 assert.deepEqual(await s.redeem(issued.code.toLowerCase(),' player one '),{token:'token-for-one'});await assert.rejects(s.redeem(issued.code),error=>error.status===401);assert.deepEqual(s.mints,['one']);
});
test('reissue and revoke invalidate previous codes',async()=>{
 const s=setup(),a=await s.issue(),b=await s.issue();await assert.rejects(s.redeem(a.code),error=>error.status===401);await revokeAccountRecovery({db:s.db,auth:s.auth,uid:'one',issuer:'owner',now});await assert.rejects(s.redeem(b.code),error=>error.status===401);assert.equal(s.mints.length,0);
});
test('expired, disabled and site-banned accounts cannot recover',async()=>{
 for(const mode of ['expired','disabled','banned']){const s=setup(),code=(await s.issue()).code;if(mode==='disabled')s.disable();if(mode==='banned')s.set('novaControl/siteBans/one',{at:now});await assert.rejects(s.redeem(code,'Player One',mode==='expired'?now+900001:now));assert.equal(s.mints.length,0)}
});
test('cold-cache and concurrent redemptions still issue at most one token',async()=>{
 const s=setup({cold:true}),code=(await s.issue()).code;const results=await Promise.allSettled([s.redeem(code),s.redeem(code)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(s.mints.length,1);
});
test('only primary owners may approve owner-account recovery, and demoted issuers invalidate codes',async()=>{
 const s=setup();await assert.rejects(issueAccountRecovery({db:s.db,auth:s.auth,uid:'owner',issuer:'owner',now}),error=>error.status===403);
 const code=(await s.issue()).code;s.set('novaChatV2/roles/owner','member');await assert.rejects(s.redeem(code),error=>error.status===401);assert.equal(s.mints.length,0);
});
test('renamed accounts and missing active records cannot consume a stale code',async()=>{
 for(const mode of ['renamed','missing']){const s=setup(),code=(await s.issue()).code;s.set(mode==='renamed'?'novaAccounts/one/name':'novaAccountRecovery/accounts/one',mode==='renamed'?'New Name':null);await assert.rejects(s.redeem(code),error=>error.status===401);assert.equal(s.mints.length,0)}
});
test('public storage rules fail closed before generating or redeeming codes',async()=>{
 const s=setup();s.rules({'.read':false,'.write':false,novaAccountRecovery:{'.read':true,'.write':false}});await assert.rejects(s.issue(),error=>error.status===503);await assert.rejects(s.redeem('A'.repeat(36)),error=>error.status===503);
});
test('invalid guesses are rate limited and never mint sessions',async()=>{
 const s=setup();for(let i=0;i<30;i++)await assert.rejects(s.redeem('A'.repeat(36)),error=>error.status===401);await assert.rejects(s.redeem('A'.repeat(36)),error=>error.status===429);assert.equal(s.mints.length,0);
});
test('public recovery endpoint returns a token only for the approved code and account',async()=>{
 const s=setup();const issued=await issueAccountRecovery({db:s.db,auth:s.auth,uid:'one',issuer:'owner',now:Date.now()});const handler=createHandler(async()=>s);
 const res={setHeader(){},end(body){this.body=JSON.parse(body)}};await handler({method:'POST',headers:{},body:{username:'Player One',email:'made-up@example.test',code:issued.code}},res);assert.equal(res.statusCode,200);assert.deepEqual(res.body,{token:'token-for-one'});
});
