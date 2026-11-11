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
 assert.equal(buildDeck(cleanSettings({chaos:true})).length,108+8+6);
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

test('stacking passes the total to the next player',()=>{
 const s=createGame(seats(2),{stacking:true});
 s.players[s.turn].hand.push({id:'x1',c:'w',v:'w4'});
 const first=s.turn;play(s,first,'x1',{color:'b'});
 assert.deepEqual(s.pending,{amount:4,top:'w4'});
 s.players[s.turn].hand.push({id:'x2',c:'w',v:'w16'});
 play(s,s.turn,'x2',{color:'g'});
 assert.equal(s.pending.amount,20);
 const before=s.players[first].hand.length;draw(s,first);
 assert.equal(s.players[first].hand.length,before+20);
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
