// Exercises Nova Flip rooms (host + guest) against an in-memory Realtime Database
// fake, and the server reward rules against a fake admin database.
import test from 'node:test';
import assert from 'node:assert/strict';
import {nova} from '../Public/src/novaflip/nova.mjs';
import {Room} from '../Public/src/novaflip/online.mjs';
import {novaFlipAction,FLIP_DAILY_COIN_WINS} from '../server/nova-flip.mjs';

// ---------- tiny RTDB fake (client SDK surface used by online.mjs) ----------
function fakeDb(){
 let tree={};const subs=new Set();
 const parts=p=>p.split('/').filter(Boolean);
 const getAt=p=>parts(p).reduce((n,k)=>n==null?n:n[k],tree);
 const clone=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
 const setAt=(p,v)=>{const ks=parts(p);if(!ks.length){tree=v??{};return}let n=tree;for(const k of ks.slice(0,-1)){if(typeof n[k]!=='object'||n[k]===null)n[k]={};n=n[k]}if(v===null||v===undefined)delete n[ks.at(-1)];else n[ks.at(-1)]=clone(v)};
 const notify=()=>queueMicrotask(()=>{for(const s of subs)s.fire()});
 const snap=(p,key)=>{const v=clone(getAt(p));return {val:()=>v,exists:()=>v!==null,key}};
 let id=0;
 const fb={
  ref:(_db,path)=>({path,key:parts(path).at(-1)}),
  get:async r=>snap(r.path),
  set:async(r,v)=>{setAt(r.path,v);notify()},
  remove:async r=>{setAt(r.path,null);notify()},
  update:async(r,patch)=>{for(const [k,v]of Object.entries(patch))setAt(r.path+'/'+k,v);notify()},
  push:async(r,v)=>{const key='k'+String(++id).padStart(6,'0');setAt(r.path+'/'+key,v);notify();return {key}},
  runTransaction:async(r,fn)=>{const next=fn(clone(getAt(r.path)));if(next===undefined)return {committed:false,snapshot:snap(r.path)};setAt(r.path,next);notify();return {committed:true,snapshot:snap(r.path)}},
  onValue:(r,cb)=>{let last;const s={fire(){const v=JSON.stringify(getAt(r.path)??null);if(v!==last){last=v;cb(snap(r.path))}}};subs.add(s);queueMicrotask(()=>s.fire());return ()=>subs.delete(s)},
  onDisconnect:()=>({set:async()=>{},remove:async()=>{},cancel:()=>{}}),
  serverTimestamp:()=>Date.now()
 };
 return {fb,tree:()=>tree};
}
const tick=(ms=20)=>new Promise(r=>setTimeout(r,ms));
const as=(uid,name)=>{nova.user={uid};nova.signedIn=true;nova.profile={name}};

test('host creates, guest joins, plays through host, and can be kicked',async()=>{
 const {fb,tree}=fakeDb();Object.assign(nova,{fb,db:{}});
 as('host1','Hosty');
 const host=await Room.create({name:'Test room',visibility:'public',settings:{turnTimer:0}});
 await tick();
 assert.match(host.code,/^[A-Z0-9]{5}$/);
 assert.equal(tree().novaFlip.lobbies[host.code].count,1);

 as('guest1','Guesty');
 const guest=await Room.join(host.code);
 await tick();
 assert.deepEqual(host.players.map(p=>p.id),['host1','guest1']);
 const guestEvents=[];guest.on(e=>guestEvents.push(e.type));

 await host.addBot();await tick();
 assert.equal(host.players.length,3);
 await host.start();await tick(50);
 assert.equal(tree().novaFlip.rooms[host.code].status,'playing');
 assert.ok(guestEvents.includes('game'),'guest gets a game');
 const g=guest.game;await tick(50);
 assert.equal(g.myHand.length,7,'guest sees own hand');
 assert.ok(!('hand' in g.view.players[0]),'public view hides hands');
 assert.ok(tree().novaFlip.hands[host.code].guest1);

 // Drive turns until it is the guest's turn, then the guest draws via the actions queue.
 const hs=host.game.s;const guestSeat=host.game.seatOf('guest1');
 host.game.clear();Object.assign(hs,{turn:guestSeat,drawn:null,pending:null});
 const before=hs.players[guestSeat].hand.length;
 await g.act({type:'draw'});await tick(60);
 assert.ok(hs.players[guestSeat].hand.length>before,'host applied the guest draw');
 assert.equal(Object.keys(tree().novaFlip.rooms[host.code].actions?.guest1||{}).length,0,'action consumed');
 assert.equal(g.myHand.length,hs.players[guestSeat].hand.length,'guest hand synced');
 // A move sent out of turn is ignored, not applied.
 const turnBefore=hs.turn;if(hs.turn!==guestSeat){await g.act({type:'draw'});await tick(60);assert.equal(hs.turn,turnBefore)}
 // Kick: guest is notified and banned from rejoining.
 await host.kick('guest1');await tick(50);
 assert.ok(guestEvents.includes('kicked'));
 as('guest1','Guesty');
 await assert.rejects(()=>Room.join(host.code),/removed you/);
 host.dispose();
});

test('room is full at 4',async()=>{
 const {fb}=fakeDb();Object.assign(nova,{fb,db:{}});
 as('h','H');const host=await Room.create({visibility:'private'});
 for(const u of ['a','b','c']){as(u,u);await Room.join(host.code)}
 as('d','d');await assert.rejects(()=>Room.join(host.code),/full/);
 host.dispose();
});

// ---------- server rewards ----------
function adminDb(initial={}){
 let tree=structuredClone(initial);const parts=p=>p.split('/').filter(Boolean);
 const getAt=p=>parts(p).reduce((n,k)=>n==null?n:n[k],tree);
 const setAt=(p,v)=>{const ks=parts(p);let n=tree;for(const k of ks.slice(0,-1)){if(typeof n[k]!=='object'||n[k]===null)n[k]={};n=n[k]}if(v==null)delete n[ks.at(-1)];else n[ks.at(-1)]=structuredClone(v)};
 const snap=p=>{const v=getAt(p)??null;return {val:()=>v==null?null:structuredClone(v),exists:()=>v!=null}};
 return {tree:()=>tree,ref:p=>({get:async()=>snap(p),set:async v=>setAt(p,v),transaction:async fn=>{const n=fn(getAt(p)==null?null:structuredClone(getAt(p)));if(n===undefined)return {committed:false,snapshot:snap(p)};setAt(p,n);return {committed:true,snapshot:snap(p)}}})};
}
const initial=()=>({xp:0,coins:0,challenges:[],resetAt:0,redeemed:{}});

test('solo win pays coins once, after the minimum length',async()=>{
 const db=adminDb({novaControl:{progress:{u1:{coins:500}}}});let now=1_800_000_000_000;
 const call=b=>novaFlipAction({db,uid:'u1',account:{name:'Will'},b,now,initial});
 const {token}=await call({op:'start',mode:'solo',players:4});
 await assert.rejects(()=>call({op:'claim',token,points:1200}),/too short/);
 now+=60_000;
 const r=await call({op:'claim',token,points:999999});
 assert.equal(r.points,2500,'points are capped');assert.equal(r.coinsWon,2500);assert.equal(r.coins,3000);
 await assert.rejects(()=>call({op:'claim',token,points:1200}),/already claimed|not registered/);
 assert.equal(db.tree().novaFlip.stats.u1.wins,1);
});

test('daily coin limit, then points only',async()=>{
 const db=adminDb();let now=1_800_000_000_000;
 const call=b=>novaFlipAction({db,uid:'u2',account:{name:'X'},b,now,initial});
 let last;
 for(let i=0;i<FLIP_DAILY_COIN_WINS+1;i++){const {token}=await call({op:'start',mode:'solo',players:2});now+=50_000;last=await call({op:'claim',token,points:1000})}
 assert.equal(last.limited,true);assert.equal(last.coinsWon,0);
 assert.equal(db.tree().novaControl.progress.u2.coins,FLIP_DAILY_COIN_WINS*1000);
});

test('online claim requires the room to name you as winner',async()=>{
 const gameId='11111111-2222-3333-4444-555555555555';
 const db=adminDb({novaFlip:{rooms:{ABCDE:{host:'h',players:{u3:{name:'a'},h:{name:'h'}},lastResult:{gameId,winner:'h',points:1300,humans:2}}}}});let now=1_800_000_000_000;
 const call=(uid,b)=>novaFlipAction({db,uid,account:{name:uid},b,now,initial});
 const t3=(await call('u3',{op:'start',mode:'online',players:2,room:'ABCDE',gameId})).token;
 const th=(await call('h',{op:'start',mode:'online',players:2,room:'ABCDE',gameId})).token;
 now+=60_000;
 await assert.rejects(()=>call('u3',{op:'claim',token:t3}),/winner/);
 const r=await call('h',{op:'claim',token:th});
 assert.equal(r.coinsWon,1300+250);
});
