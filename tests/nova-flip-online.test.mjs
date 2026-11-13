// Exercises Nova Flip rooms (host + guest) against an in-memory Realtime Database
// fake, and the server reward rules against a fake admin database.
import test from 'node:test';
import assert from 'node:assert/strict';
import {nova} from '../Public/src/novaflip/nova.mjs?v=9';
import {Room} from '../Public/src/novaflip/online.mjs';
import {novaFlipAction,FLIP_DAILY_COIN_WINS} from '../server/nova-flip.mjs';
import {applyMove,applyTick,newTable} from '../server/nova-flip-table.mjs';

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
 // Like the real SDK: any undefined value anywhere in a write is an error.
 const noUndef=(v,path='value')=>{if(v===undefined)throw Error(path+' argument contains undefined');if(v&&typeof v==='object')for(const [k,x]of Object.entries(v))noUndef(x,path+'.'+k)};
 const fb={
  ref:(_db,path)=>({path,key:parts(path).at(-1)}),
  get:async r=>snap(r.path),
  set:async(r,v)=>{noUndef(v);setAt(r.path,v);notify()},
  remove:async r=>{setAt(r.path,null);notify()},
  update:async(r,patch)=>{noUndef(patch);for(const [k,v]of Object.entries(patch))setAt(r.path+'/'+k,v);notify()},
  push:async(r,v)=>{noUndef(v);const key='k'+String(++id).padStart(6,'0');setAt(r.path+'/'+key,v);notify();return {key}},
  runTransaction:async(r,fn)=>{const next=fn(clone(getAt(r.path)));if(next===undefined)return {committed:false,snapshot:snap(r.path)};setAt(r.path,next);notify();return {committed:true,snapshot:snap(r.path)}},
  onValue:(r,cb)=>{let last;const s={fire(){const v=JSON.stringify(getAt(r.path)??null);if(v!==last){last=v;cb(snap(r.path))}}};subs.add(s);queueMicrotask(()=>s.fire());return ()=>subs.delete(s)},
  onDisconnect:()=>({set:async()=>{},remove:async()=>{},cancel:()=>{}}),
  serverTimestamp:()=>Date.now()
 };
 const admin={ref:(p='')=>({
  get:async()=>snap(p),set:async v=>{setAt(p,v);notify()},
  update:async patch=>{for(const [k,v]of Object.entries(patch))setAt((p?p+'/':'')+k,v);notify()},
  transaction:async fn=>{const next=fn(clone(getAt(p)));if(next===undefined)return {committed:false,snapshot:snap(p)};setAt(p,next);notify();return {committed:true,snapshot:snap(p)}}})};
 return {fb,admin,tree:()=>tree};
}
const tick=(ms=20)=>new Promise(r=>setTimeout(r,ms));
const as=(uid,name)=>{nova.user={uid};nova.signedIn=true;nova.profile={name}};

// Wires Room.call to the real server action, running as whichever user is "signed in".
function serve(admin,clock){nova.serverCall=(action,b)=>novaFlipAction({db:admin,uid:nova.user.uid,account:{name:nova.profile.name},b,now:clock.now,initial})}

test('server runs the game: host and guest send moves, hands stay private, kick works',async()=>{
 const {fb,admin,tree}=fakeDb();Object.assign(nova,{fb,db:{}});const clock={now:1_800_000_000_000};serve(admin,clock);
 as('host1','Hosty');
 const host=await Room.create({name:'Test room',visibility:'public',settings:{turnTimer:0}});
 await tick();
 assert.match(host.code,/^[A-Z0-9]{5}$/);
 assert.equal(tree().novaFlip.lobbies[host.code].count,1);
 as('guest1','Guesty');
 const guest=await Room.join(host.code);await tick();
 assert.deepEqual(host.players.map(p=>p.id),['host1','guest1']);
 const guestEvents=[];guest.on(e=>guestEvents.push(e.type));
 as('host1','Hosty');await host.start();await tick(50);
 const room=tree().novaFlip.rooms[host.code];
 assert.equal(room.status,'playing');assert.ok(room.game&&room.game.gameId===room.gameId,'server published the view');
 assert.ok(guestEvents.includes('game'),'guest gets a game');
 assert.ok(tree().novaServer.flipTables[host.code].state,'state lives on the server');
 const g=guest.game,hg=host.game;await tick(50);
 assert.equal(g.myHand.length,7,'guest sees own hand');assert.equal(hg.myHand.length,7,'host sees own hand');
 assert.ok(!('hand' in g.view.players[0]),'public view hides hands');
 // Make it the guest's turn on the server, then the guest draws through the API.
 const t=tree().novaServer.flipTables[host.code],st=JSON.parse(t.state),gs=st.players.findIndex(p=>p.id==='guest1');
 Object.assign(st,{turn:gs,drawn:null,pending:null});t.state=JSON.stringify(st);
 const before=st.players[gs].hand.length;
 as('guest1','Guesty');await g.act({type:'draw'});await tick(50);
 const after=JSON.parse(tree().novaServer.flipTables[host.code].state);
 assert.ok(after.players[gs].hand.length>before,'server applied the guest draw');
 assert.equal(g.myHand.length,after.players[gs].hand.length,'guest hand synced from the server');
 // A move out of turn is refused by the server; the client resyncs quietly instead of erroring.
 if(after.turn!==gs){const rev=tree().novaServer.flipTables[host.code].rev;await g.act({type:'draw'});await tick(50);assert.equal(tree().novaServer.flipTables[host.code].rev,rev,'refused move changes nothing');assert.equal(g.view.turn,after.turn,'guest shows the real turn')}
 // Kick: guest is notified and banned from rejoining.
 as('host1','Hosty');await host.kick('guest1');await tick(50);
 assert.ok(guestEvents.includes('kicked'));
 as('guest1','Guesty');
 await assert.rejects(()=>Room.join(host.code),/removed you/);
 host.dispose();guest.dispose();delete nova.serverCall;
});

test('only the host can start, and a running game cannot be restarted',async()=>{
 const {fb,admin}=fakeDb();Object.assign(nova,{fb,db:{}});const clock={now:1_800_000_000_000};serve(admin,clock);
 as('h','H');const host=await Room.create({visibility:'private'});await host.addBot();await tick();
 as('x','X');const other=await Room.join(host.code);await tick();
 await assert.rejects(()=>other.call('tableStart'),/Only the host/);
 as('h','H');await host.start();await tick();
 await assert.rejects(()=>host.call('tableStart'),/already running/);
 host.dispose();other.dispose();delete nova.serverCall;
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
 assert.equal(r.points,2500,'points are capped');assert.equal(r.coinsWon,5000);assert.equal(r.coins,5500);
 await assert.rejects(()=>call({op:'claim',token,points:1200}),/already claimed|not registered/);
 assert.equal(db.tree().novaFlip.stats.u1.wins,1);
});

test('daily coin limit, then points only',async()=>{
 const db=adminDb();let now=1_800_000_000_000;
 const call=b=>novaFlipAction({db,uid:'u2',account:{name:'X'},b,now,initial});
 let last;
 for(let i=0;i<FLIP_DAILY_COIN_WINS+1;i++){const {token}=await call({op:'start',mode:'solo',players:2});now+=50_000;last=await call({op:'claim',token,points:1000})}
 assert.equal(last.limited,true);assert.equal(last.coinsWon,0);
 assert.equal(db.tree().novaControl.progress.u2.coins,FLIP_DAILY_COIN_WINS*5000);
});

test('online claim requires the room to name you as winner',async()=>{
 const gameId='11111111-2222-3333-4444-555555555555';
 const db=adminDb({novaFlip:{rooms:{ABCDE:{host:'h',players:{u3:{name:'a'},h:{name:'h'}}}}},novaServer:{flipTables:{ABCDE:{gameId,result:{gameId,winner:'h',points:1300,humans:2}}}}});let now=1_800_000_000_000;
 const call=(uid,b)=>novaFlipAction({db,uid,account:{name:uid},b,now,initial});
 const t3=(await call('u3',{op:'start',mode:'online',players:2,room:'ABCDE',gameId})).token;
 const th=(await call('h',{op:'start',mode:'online',players:2,room:'ABCDE',gameId})).token;
 now+=60_000;
 await assert.rejects(()=>call('u3',{op:'claim',token:t3}),/winner/);
 const r=await call('h',{op:'claim',token:th});
 assert.equal(r.coinsWon,5000);
});

// ---------- server-run table ----------
test('bots and timeouts advance on tick, and the server decides the winner',()=>{
 const room={host:'h',settings:{turnTimer:15},players:{h:{name:'H',joinedAt:1},b:{name:'Bot',bot:true,joinedAt:2}}};
 let now=1_900_000_000_000;let t=newTable(room,{now});
 const seat=id=>JSON.parse(t.state).players.findIndex(p=>p.id===id);
 // Force the bot's turn: an early tick does nothing, a later one makes one bot move.
 let st=JSON.parse(t.state);st.turn=seat('b');t.state=JSON.stringify(st);t.lastAt=now;
 assert.equal(applyTick(t,room,{now:now+100}),null);
 const moved=applyTick(structuredClone(t),room,{now:now+1000});assert.ok(moved.rev>t.rev);
 // Human timer: nothing before the deadline, an auto move after it.
 st=JSON.parse(t.state);st.turn=seat('h');st.drawn=null;st.pending=null;t.state=JSON.stringify(st);t.deadline=now+15000;
 assert.equal(applyTick(t,room,{now:now+5000}),null);
 const timed=applyTick(structuredClone(t),room,{now:now+16000});assert.notEqual(JSON.parse(timed.state).turn===seat('h')&&!JSON.parse(timed.state).drawn,true);
 // Winning: the server records the result itself.
 st=JSON.parse(t.state);st.turn=seat('h');st.drawn=null;st.pending=null;const top=st.discard.at(-1);st.color=top.c==='w'?'r':top.c;
 st.players[seat('h')].hand=[{id:'win',c:st.color,v:'5'}];t.state=JSON.stringify(st);
 const won=applyMove(t,'h',{type:'play',cardId:'win'},{now:now+60000});
 assert.equal(won.result.winner,'h');assert.equal(won.result.gameId,t.gameId);
 assert.throws(()=>applyMove(won,'h',{type:'draw'},{now:now+61000}),/over/);
});

test('moves are checked: wrong player, wrong turn and impossible cards are refused',()=>{
 const room={host:'h',settings:{},players:{h:{name:'H',joinedAt:1},g:{name:'G',joinedAt:2}}};
 const now=1_900_000_000_000,t=newTable(room,{now}),st=JSON.parse(t.state);
 const turnId=st.players[st.turn].id,waitId=turnId==='h'?'g':'h';
 assert.throws(()=>applyMove(t,'stranger',{type:'draw'},{now}),/not playing/);
 assert.throws(()=>applyMove(t,waitId,{type:'draw'},{now}),/not your turn/);
 assert.throws(()=>applyMove(t,turnId,{type:'play',cardId:'not-mine'},{now}),/not in your hand/);
});

test('a result written into the room by a player is ignored: only the server result pays',async()=>{
 const gameId='11111111-2222-3333-4444-555555555555';
 // The host writes a fake lastResult naming themselves; the server table has no result yet.
 const db=adminDb({novaFlip:{rooms:{ABCDE:{host:'h',status:'lobby',players:{h:{name:'h'},u:{name:'u'}},gameId,lastResult:{gameId,winner:'h',points:2500,humans:2}}}},novaServer:{flipTables:{ABCDE:{gameId,state:'{}',result:null}}}});
 let now=1_800_000_000_000;const call=(uid,b)=>novaFlipAction({db,uid,account:{name:uid},b,now,initial});
 const {token}=await call('h',{op:'start',mode:'online',players:2,room:'ABCDE',gameId});now+=60_000;
 await assert.rejects(()=>call('h',{op:'claim',token}),/did not record you/);
});

test('a public view that fell behind the server is healed, and clients never step back to an older view',async()=>{
 const {fb,admin,tree}=fakeDb();Object.assign(nova,{fb,db:{}});const clock={now:1_800_000_000_000};serve(admin,clock);
 as('h','H');const host=await Room.create({visibility:'private',settings:{turnTimer:0}});await tick();
 as('g','G');const guest=await Room.join(host.code);await tick();
 as('h','H');await host.start();await tick(50);
 const code=host.code,table=tree().novaServer.flipTables[code],st=JSON.parse(table.state);
 // Simulate a lost publish: the server table moved on (turn + rev) but the public view did not.
 const real=(st.turn+1)%st.players.length;Object.assign(st,{turn:real,drawn:null,pending:null});table.state=JSON.stringify(st);table.rev+=3;
 const stale=tree().novaFlip.rooms[code].game.rev;assert.ok(stale<table.rev);
 as('g','G');await guest.call('tableTick');await tick(50);
 const view=tree().novaFlip.rooms[code].game;
 assert.equal(view.rev,table.rev,'tick republished the newer view');assert.equal(view.turn,real,'public view shows the real turn');
 assert.equal(guest.game.view.turn,real,'guest shows the real turn');
 // An older view arriving late is ignored by clients.
 const shown=guest.game.view.rev;guest.data={...guest.data,game:{...view,rev:shown-1,turn:(real+1)%st.players.length}};guest.clientTick();
 assert.equal(guest.game.view.rev,shown,'older view ignored');
 host.dispose();guest.dispose();delete nova.serverCall;
});
