import test from 'node:test';
import assert from 'node:assert/strict';
import {rankAction} from '../server/nova-ranks.mjs';
function database(seed={}){const root=structuredClone(seed),get=path=>path.split('/').filter(Boolean).reduce((v,k)=>v?.[k],root),put=(path,value)=>{const parts=path.split('/').filter(Boolean);let row=root;for(const part of parts.slice(0,-1))row=row[part]??={};if(value===null)delete row[parts.at(-1)];else row[parts.at(-1)]=structuredClone(value)};return {root,ref(path=''){return {get:async()=>({val:()=>get(path)??null}),set:async value=>put(path,value),update:async patch=>{for(const [key,value]of Object.entries(patch))put([path,key].filter(Boolean).join('/'),value)},transaction:async fn=>{const value=fn(structuredClone(get(path)??null));put(path,value);return {committed:true,snapshot:{val:()=>structuredClone(value)}}}}}}}
const session='11111111-1111-4111-8111-111111111111';
test('server atomically awards promotion coins and levels once, without granting staff permissions',async()=>{
 const now=Date.UTC(2026,9,26,12),db=database({novaControl:{progress:{u:{xp:0,coins:100,rank:{at:now-15000,active:true,session,game:'game:27',seconds:7190,elo:7190/60,rewarded:0,day:'2026-10-26'}}}}});
 const result=await rankAction(db,'u','rankPulse',{active:true,game:'game:27',session},now);
 assert.equal(result.rank.rank.id,'bronze');assert.equal(result.progress.coins,5100);assert.equal(result.progress.xp,500);
 assert.equal(result.progress.rank.recent[0].game,'game:27');assert.equal(result.progress.rank.recent[0].seconds,15);
 assert.equal(db.root.novaChatV2.memberRoles.u.rank_bronze,true);assert.equal(db.root.novaChatV2.roles,undefined);
 const again=await rankAction(db,'u','rankPulse',{active:true,game:'game:27',session},now);assert.equal(again.progress.coins,5100);assert.equal(again.progress.xp,500);
});
test('live rank board includes Rookie accounts, sorts by ELO, paginates and excludes private fields',async()=>{
 const progress={},novaAccounts={};for(let n=0;n<43;n++){const id='u'+n;progress[id]={rank:{elo:n,seconds:n*60,session:'private-session'}};novaAccounts[id]={name:'Player '+n,email:'private@example.test',password:'private'}}
 const db=database({novaControl:{progress},novaAccounts});const page=await rankAction(db,'u0','rankBoard',{},1000);
 assert.equal(page.players.length,40);assert.equal(page.total,43);assert.equal(page.next,40);assert.equal(page.players[0].uid,'u42');assert.equal(page.players[0].position,1);assert.equal(page.rank.position,43);assert.equal(page.rank.rank.id,'rookie');
 const second=await rankAction(db,'u0','rankBoard',{offset:40},1000);assert.equal(second.players.length,3);assert.equal(second.players.at(-1).uid,'u0');assert.equal(second.next,null);assert.equal(/private@example|private-session|password/.test(JSON.stringify(page)),false);
});
test('unknown games cannot earn rank and public placement never exposes account fields',async()=>{
 const db=database({novaControl:{progress:{u:{rank:{elo:19000,seconds:1140000}},v:{rank:{elo:20000,seconds:1200000}}}}});
 const before=await rankAction(db,'u','rankProfile',{uid:'u'},1000);assert.equal(before.rank.position,2);assert.equal(before.rank.champion,false);assert.equal(before.email,undefined);
 await rankAction(db,'u','rankPulse',{active:true,game:'game:made-up',session},10000);const next=await rankAction(db,'u','rankPulse',{active:true,game:'game:made-up',session},25000);assert.equal(next.rank.elo,19000);
});
test('recent music is bounded, deduplicated and rejects unsafe artwork',async()=>{
 const db=database();for(let n=0;n<7;n++)await rankAction(db,'u','rankMusic',{name:'Song '+n,artist:'Artist',art:'javascript:alert(1)'},n);
 await rankAction(db,'u','rankMusic',{name:'Song 6',artist:'Artist'},8);const result=await rankAction(db,'u','rankProfile',{},100);assert.equal(result.recentMusic.length,5);assert.equal(result.recentMusic[0].name,'Song 6');assert.equal(result.recentMusic[0].art,'');
});

test('recent movie activity needs playback, stays bounded and never writes another account',async()=>{const db=database();await assert.rejects(()=>rankAction(db,'u','rankMovie',{id:'1',name:'Title',type:'movie',position:0},100),/Watch/);for(let i=0;i<7;i++)await rankAction(db,'u','rankMovie',{id:String(i),name:'Title '+i,type:'tv',season:2,episode:3,position:20,art:'javascript:bad',uid:'other'},100+i);const rows=db.root.novaChatV2.profiles.u.recentMovies;assert.equal(rows.length,5);assert.equal(rows[0].name,'Title 6');assert.equal(rows[0].art,'');assert.equal(db.root.novaChatV2.profiles.other,undefined);await rankAction(db,'u','rankMovie',{id:'6',name:'Title 6',type:'tv',position:30},110);assert.equal(db.root.novaChatV2.profiles.u.recentMovies.length,5)});
