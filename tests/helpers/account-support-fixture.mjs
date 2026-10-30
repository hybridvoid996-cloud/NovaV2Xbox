import {accountSupport} from '../../server/account-support.mjs';
export function setup(){
 let now=Date.parse('2026-10-30T12:00:00Z'),rules={'.read':false,'.write':false,novaAccountSupport:{'.read':false,'.write':false},novaAccountRecovery:{'.read':false,'.write':false}},seq=0;
 const data={novaAccounts:{owner:{name:'Owner'},otherOwner:{name:'Second Owner'},one:{name:'Player One'},admin:{name:'Admin'}},novaChatV2:{roles:{owner:'owner',otherOwner:'owner',one:'member',admin:'admin'}},novaControl:{activity:{owner:{at:now},otherOwner:{at:now-120000}}}},mints=[];
 const get=p=>p.split('/').filter(Boolean).reduce((v,k)=>v?.[k],data)??null;
 const set=(p,v)=>{const ks=p.split('/').filter(Boolean);let row=data;for(const k of ks.slice(0,-1))row=row[k]??={};if(v===null)delete row[ks.at(-1)];else row[ks.at(-1)]=structuredClone(v)};
 const snap=v=>({val:()=>structuredClone(v),exists:()=>v!==null});
 function ref(p='',q={}){return {child:k=>ref(p+'/'+k),get:async()=>{let v=get(p);if(q.order&&v){let entries=Object.entries(v).sort(([,a],[,b])=>a[q.order]-b[q.order]);if(q.end!==undefined)entries=entries.filter(([,v])=>v[q.order]<=q.end);if(q.first)entries=entries.slice(0,q.first);if(q.last)entries=entries.slice(-q.last);v=Object.fromEntries(entries)}return snap(v)},set:async v=>set(p,v),update:async patch=>{for(const [k,v]of Object.entries(patch))set(p+'/'+k,v)},push:async v=>set(p+'/'+String(++seq).padStart(5,'0'),v),transaction:async fn=>{const old=get(p);if(old!==null)fn(null);const value=fn(old);if(value===undefined)return {committed:false,snapshot:snap(old)};set(p,value);return {committed:true,snapshot:snap(value)}},orderByChild:k=>ref(p,{...q,order:k}),limitToLast:n=>ref(p,{...q,last:n}),limitToFirst:n=>ref(p,{...q,first:n}),endAt:n=>ref(p,{...q,end:n})}}
 const db={getRulesJSON:async()=>({rules}),ref};
 const auth={verifyIdToken:async token=>({uid:token}),getUser:async uid=>({uid,disabled:false}),createCustomToken:async uid=>{mints.push(uid);return 'token-for-'+uid}};
 const call=(operation,b={},owner,options={})=>accountSupport({db,auth,ip:'visitor-ip',now,b:{operation,...b},owner,...options});
 return {db,auth,data,get,set,mints,call,tick:n=>now+=n,rules:r=>rules=r,create:async(aiConsent=false)=>call('create',{username:'Player One',email:'remembered@example.test',aiConsent})};
}
