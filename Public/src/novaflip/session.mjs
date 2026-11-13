// Game sessions. HostedGame owns the real engine state (single player, or the
// online host). RemoteGame mirrors what the host publishes for everyone else.
import {play,draw,pass,callFlip,catchMissed,autoMove,publicView} from './engine.mjs?v=5';
import {chooseMove,botCallsFlip,botCatchDelay} from './bot.mjs?v=5';

const FLIP_WINDOW=3000;

class Emitter{constructor(){this.subs=new Set()}on(fn){this.subs.add(fn);return ()=>this.subs.delete(fn)}emit(e){for(const fn of this.subs)try{fn(e)}catch(err){console.error(err)}}}

export class HostedGame extends Emitter{
 constructor(state,{meId,publish}={}){super();this.s=state;this.meId=meId;this.publish=publish;this.timers=new Set();this.deadline=0;this.closed=false;queueMicrotask(()=>this.changed({type:'start'}))}
 seatOf(id){return this.s.players.findIndex(p=>p.id===id)}
 get mySeat(){return this.seatOf(this.meId)}
 get view(){return {...publicView(this.s),deadline:this.deadline}}
 handOf(id){return this.s.players[this.seatOf(id)]?.hand||[]}
 get myHand(){return this.handOf(this.meId)}
 later(fn,ms){const t=setTimeout(()=>{this.timers.delete(t);if(!this.closed)fn()},ms);this.timers.add(t);return t}
 clear(){for(const t of this.timers)clearTimeout(t);this.timers.clear()}
 close(){this.closed=true;this.clear();this.subs.clear()}
 // seat is an index; move is {type,cardId,color,target}
 apply(seat,move){
  if(this.closed||seat<0)return;
  const s=this.s,before=s.players.map(p=>p.hand.length);let event={type:move.type,seat};
  if(move.type==='play'){const card=s.players[seat].hand.find(c=>c.id===move.cardId);play(s,seat,move.cardId,{color:move.color,target:move.target});event.card=card}
  else if(move.type==='draw'){const r=draw(s,seat);event.count=r.cards.length}
  else if(move.type==='pass')pass(s,seat);
  else if(move.type==='flip'){if(!callFlip(s,seat))return;event={type:'flip',seat}}
  else if(move.type==='auto'){autoMove(s,seat);event={type:'timeout',seat}}
  else throw Error('Unknown move.');
  event.deltas=s.players.map((p,k)=>p.hand.length-before[k]);
  this.changed(event);
 }
 act(move){this.apply(this.mySeat,move)}
 changed(event){
  this.clear();const s=this.s;
  // A FLIP! call or a catch doesn't reset the clock of the player whose turn it is.
  const key=s.turn+':'+(s.moves||0);
  if(s.phase==='play'&&s.settings.turnTimer&&!s.players[s.turn].bot){if(key!==this.timerKey||!this.deadline)this.deadline=Date.now()+s.settings.turnTimer*1000;this.later(()=>{try{this.apply(s.turn,{type:'auto'})}catch{}},Math.max(0,this.deadline-Date.now())+250)}else this.deadline=0;
  this.timerKey=key;
  this.emit(event);this.publish?.(this,event);
  if(s.phase!=='play')return;
  // Missed last-card call: bots may call instantly; humans get a short window.
  const o=s.oneCard;
  if(o&&!o.called){
   const owner=s.players[o.player];
   if(owner.bot&&botCallsFlip(s.settings.botLevel)){callFlip(s,o.player);this.later(()=>this.changed({type:'flip',seat:o.player}),350);return}
   const wait=owner.bot?botCatchDelay(s.settings.botLevel):FLIP_WINDOW;
   this.later(()=>{if(catchMissed(s,o.player===0?1:0))this.changed({type:'caught',seat:o.player,deltas:s.players.map((_,k)=>k===o.player?2:0)})},wait);
  }
  const seat=s.turn;
  if(s.players[seat].bot)this.later(()=>{try{const m=chooseMove(s,seat);if(s.players[seat].hand.length===2&&botCallsFlip(s.settings.botLevel))callFlip(s,seat);this.apply(seat,m)}catch(e){console.error(e);try{this.apply(seat,{type:'auto'})}catch{}}},700+Math.random()*700);
 }
 replaceWithBot(id){const k=this.seatOf(id);if(k<0)return;this.s.players[k].bot=true;this.s.players[k].name+=' (bot)';this.changed({type:'left',seat:k})}
}

export class RemoteGame extends Emitter{
 constructor({meId,send}){super();this.meId=meId;this.send=send;this.v=null;this.hand=[];this.lastSeq=-1}
 get view(){return this.v}
 get myHand(){return this.hand}
 get mySeat(){return this.v?this.v.players.findIndex(p=>p.id===this.meId):-1}
 update(view,hand){
  const prev=this.v;this.v=view;if(hand)this.hand=hand;
  if(!view)return;
  const deltas=prev?view.players.map((p,k)=>p.count-(prev.players[k]?.count??p.count)):[];
  const last=view.log?.[view.log.length-1];
  const event=prev&&view.top?.id!==prev.top?.id?{type:'play',seat:last?.player,card:view.top,deltas}:{type:view.seq!==prev?.seq?'sync':'hand',deltas};
  this.emit(event);
 }
 act(move){return this.send(move)}
 close(){this.subs.clear()}
}
