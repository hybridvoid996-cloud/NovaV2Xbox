import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,play,draw,pass,canPlay,publicView,buildDeck,cleanSettings,callFlip,catchMissed} from '../Public/src/novaflip/engine.mjs';
import {chooseMove} from '../Public/src/novaflip/bot.mjs';

const seats=n=>Array.from({length:n},(_,i)=>({id:'p'+i,name:'P'+i,bot:true}));
function run(s){
 for(let guard=0;guard<5000&&s.phase==='play';guard++){
  const p=s.turn,m=chooseMove(s,p);if(s.players[p].hand.length===2)callFlip(s,p);
  if(m.type==='play')play(s,p,m.cardId,m);else if(m.type==='draw')draw(s,p);else pass(s,p);
  if(s.oneCard&&!s.oneCard.called)catchMissed(s,(s.oneCard.player+1)%s.players.length);
 }
 return s;
}

test('deck sizes',()=>{
 assert.equal(buildDeck(cleanSettings({chaos:false})).length,108);
 assert.equal(buildDeck(cleanSettings({chaos:true})).length,108+8+5); // chaos adds Skip All + Color Dump per color, 2 Swap, 2 +6, one +10 (no +16)
});

test('bot games always finish with a winner and conserve cards',()=>{
 for(const settings of [{},{stacking:false},{chaos:false},{sevenZero:true},{drawRule:'until'}])
  for(let n=2;n<=4;n++)for(let i=0;i<40;i++){
   const s=run(createGame(seats(n),settings));
   assert.equal(s.phase,'over',JSON.stringify(settings)+' '+n);
   assert.equal(s.players[s.winner].hand.length,0);
   const total=s.deck.length+s.discard.length+s.players.reduce((a,p)=>a+p.hand.length,0);
   assert.equal(total,buildDeck(cleanSettings(settings)).length);
   assert.ok(s.points>=1000);
  }
});

test('rejects out-of-turn and illegal plays',()=>{
 const s=createGame(seats(3));const other=(s.turn+1)%3;
 assert.throws(()=>draw(s,other),/not your turn/);
 const bad=s.players[s.turn].hand.find(c=>!canPlay(s,s.turn,c));
 if(bad)assert.throws(()=>play(s,s.turn,bad.id,{color:'r'}),/cannot be played/);
});

test('stacking passes the total to the next player with the same card only',()=>{
 const s=createGame(seats(2),{stacking:true});
 s.players[s.turn].hand.push({id:'x1',c:'w',v:'w4'});
 const first=s.turn;play(s,first,'x1',{color:'b'});
 assert.deepEqual(s.pending,{amount:4,top:'w4'});
 s.players[s.turn].hand.push({id:'x3',c:'w',v:'w10'},{id:'x2',c:'w',v:'w4'});
 assert.throws(()=>play(s,s.turn,'x3',{color:'g'}),/cannot be played/);
 play(s,s.turn,'x2',{color:'g'});
 assert.equal(s.pending.amount,8);
 const before=s.players[first].hand.length;draw(s,first);
 assert.equal(s.players[first].hand.length,before+8);
});
test('+2 stacks on +2 and the deck has no +16',()=>{
 const s=createGame(seats(2),{stacking:true,chaos:true});
 assert.ok(!s.deck.concat(...s.players.map(p=>p.hand),s.discard).some(c=>c.v==='w16'));
 const a=s.turn;s.color='r';s.players[a].hand.push({id:'d1',c:'r',v:'d2'});play(s,a,'d1');
 const b=s.turn;s.players[b].hand.push({id:'d2b',c:'b',v:'d2'});play(s,b,'d2b');
 assert.deepEqual(s.pending,{amount:4,top:'d2'});
});

test('missed FLIP! call costs two cards; a call protects',()=>{
 const s=createGame(seats(2));const p=s.turn;
 s.players[p].hand=[{id:'a',c:s.color,v:'5'},{id:'b',c:'r',v:'9'}];
 play(s,p,'a');assert.equal(s.oneCard.called,false);
 assert.ok(catchMissed(s,1-p));assert.equal(s.players[p].hand.length,3);
 const t=createGame(seats(2));const q=t.turn;
 t.players[q].hand=[{id:'a',c:t.color,v:'5'},{id:'b',c:'r',v:'9'}];
 callFlip(t,q);play(t,q,'a');assert.equal(t.oneCard.called,true);assert.equal(catchMissed(t,1-q),false);
});

test('public view hides hands',()=>{
 const v=publicView(createGame(seats(4)));
 assert.ok(v.players.every(p=>!('hand' in p)&&p.count===7));
});
test('spamming the last-card call counts once and never floods the game',async()=>{
 const {callFlip}=await import('../Public/src/novaflip/engine.mjs');
 const s=createGame(seats(2));const p=s.turn;s.players[p].hand=s.players[p].hand.slice(0,2);
 assert.equal(callFlip(s,p),true);for(let i=0;i<30;i++)assert.equal(callFlip(s,p),false);
 const other=1-p;s.players[other].hand=s.players[other].hand.slice(0,1);
 const logs=s.log.length;assert.equal(callFlip(s,other),true);for(let i=0;i<30;i++)assert.equal(callFlip(s,other),false);
 assert.equal(s.log.length,logs+1);
});
test('a human spamming the call cannot stop the bot from taking its turn',async()=>{
 const {HostedGame}=await import('../Public/src/novaflip/session.mjs?v=9');
 const state=createGame([{id:'me',name:'Me'},{id:'bot',name:'Bot',bot:true}],{turnTimer:0});
 const g=new HostedGame(state,{meId:'me'});const botSeat=g.seatOf('bot');
 state.turn=botSeat;state.players[g.mySeat].hand=state.players[g.mySeat].hand.slice(0,1);g.changed({type:'sync'});
 const moves=state.moves||0;
 const spam=setInterval(()=>{try{g.act({type:'flip'})}catch{}},50);
 await new Promise(r=>setTimeout(r,2200));clearInterval(spam);g.close();
 assert.ok((state.moves||0)>moves||state.phase!=='play','the bot moved while the human spammed');
});
test('stacking from your own hand: same number or same card plays together',async()=>{
 const {stackMates}=await import('../Public/src/novaflip/engine.mjs');
 const s=createGame(seats(3),{stacking:true});const p=s.turn;
 s.color='r';s.discard.push({id:'top',c:'r',v:'3'});
 s.players[p].hand=[{id:'r6',c:'r',v:'6'},{id:'g6',c:'g',v:'6'},{id:'b6',c:'b',v:'6'},{id:'y1',c:'y',v:'1'}];
 assert.deepEqual(stackMates(s,p,s.players[p].hand[0]).map(c=>c.id),['g6','b6']);
 assert.throws(()=>play(s,p,'r6',{extra:['y1']}),/same number/);
 play(s,p,'r6',{extra:['g6','b6']});
 assert.deepEqual(s.players[p].hand.map(c=>c.id),['y1']);assert.equal(s.color,'b');assert.equal(s.discard.at(-1).id,'b6');
});
test('two +2s from one hand add up, and two skips skip two players',()=>{
 const s=createGame(seats(4),{stacking:true});let p=s.turn;s.color='r';
 s.players[p].hand=[{id:'a',c:'r',v:'d2'},{id:'b',c:'g',v:'d2'},{id:'k',c:'y',v:'5'}];
 play(s,p,'a',{extra:['b']});assert.deepEqual(s.pending,{amount:4,top:'d2'});
 const t=createGame(seats(4),{stacking:true});p=t.turn;t.color='r';
 t.players[p].hand=[{id:'s1',c:'r',v:'skip'},{id:'s2',c:'b',v:'skip'},{id:'k',c:'y',v:'5'}];
 play(t,p,'s1',{extra:['s2']});assert.equal(t.turn,((p+3*t.dir)%4+4)%4);
});
test('stacking from your hand is refused when stacking is off',()=>{
 const s=createGame(seats(2),{stacking:false});const p=s.turn;s.color='r';
 s.players[p].hand=[{id:'r6',c:'r',v:'6'},{id:'g6',c:'g',v:'6'},{id:'y1',c:'y',v:'1'}];
 assert.throws(()=>play(s,p,'r6',{extra:['g6']}),/turned off/);
});
