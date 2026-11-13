// Server-run Nova Flip tables. The server deals, checks every move with the shared rules
// engine, runs bots and turn timers, and decides the winner, so no player (host included)
// can fake a result or see other hands.
//
// novaControl/flipTables/{code}  (server only)  {gameId,host,startedAt,rev,lastAt,deadline,timerKey,state(JSON),result}
// novaFlip/rooms/{code}/game     public view (no hands) + deadline + rev
// novaFlip/hands/{code}/{uid}    that player's cards (readable by that player only)
// novaFlip/rooms/{code}/lastResult  written here when the game ends
//
// The API is serverless (no long-lived timers), so bots and timeouts advance through `tick`:
// clients call it when a bot is up, a timer has run out or a last-card call was missed.
import {randomUUID} from 'node:crypto';
import {createGame,cleanSettings,play,draw,pass,callFlip,catchMissed,autoMove,publicView} from '../Public/src/novaflip/engine.mjs';
import {chooseMove,botCallsFlip,botCatchDelay} from '../Public/src/novaflip/bot.mjs';

export const FLIP_CALL_WINDOW=3000;   // ms a human has to call their last card before it can be caught
export const BOT_STEP_MS=650;         // minimum gap between bot moves, so play stays readable
const MAX_PLAYERS=4;
const code=s=>typeof s==='string'&&/^[A-Z0-9]{5}$/.test(s);
const uuid=s=>typeof s==='string'&&/^[0-9a-f-]{36}$/i.test(s);

const load=t=>{const s=JSON.parse(t.state);for(const p of s.players)p.hand||=[];s.deck||=[];s.discard||=[];s.log||=[];return s};
const seatsOf=room=>Object.entries(room?.players||{}).map(([id,p])=>({id,...p})).sort((a,b)=>(a.joinedAt||0)-(b.joinedAt||0)).slice(0,MAX_PLAYERS);

/** Creates a fresh table for the room's current seats. */
export function newTable(room,{now,rand=Math.random}={}){
 const seats=seatsOf(room);
 if(seats.length<2)throw Error('You need at least 2 players. Add a bot or invite a friend.');
 const state=createGame(seats.map(p=>({id:p.id,name:String(p.name||'Player').slice(0,32),bot:!!p.bot})),cleanSettings(room.settings),rand);
 const table={gameId:randomUUID(),host:room.host,startedAt:now,rev:1,lastAt:now,deadline:0,timerKey:'',state:JSON.stringify(state),result:null};
 retime(table,state,now);
 return table;
}

function retime(table,s,now){
 const key=s.turn+':'+(s.moves||0);
 if(s.phase==='play'&&s.settings.turnTimer&&!s.players[s.turn].bot){if(key!==table.timerKey||!table.deadline)table.deadline=now+s.settings.turnTimer*1000}
 else table.deadline=0;
 table.timerKey=key;
}
function commit(table,s,now){
 table.rev=(table.rev||0)+1;table.lastAt=now;retime(table,s,now);
 if(s.phase==='over'&&!table.result){const w=s.players[s.winner];table.result={gameId:table.gameId,winner:w.id,winnerName:w.name,winnerBot:!!w.bot,points:s.points,at:now,startedAt:table.startedAt,humans:s.players.filter(p=>!p.bot).length}}
 table.state=JSON.stringify(s);
 return table;
}

/** A player's move. Returns the updated table or throws (the move is refused). */
export function applyMove(table,uid,move,{now}){
 if(!table)throw Error('This game is not running.');
 const s=load(table);
 if(s.phase!=='play')throw Error('The game is over.');
 const seat=s.players.findIndex(p=>p.id===uid);
 if(seat<0||s.players[seat].bot)throw Error('You are not playing at this table.');
 const type=move?.type;
 if(type==='play'){
  const extra=Array.isArray(move.extra)?move.extra.slice(0,12):move.extra&&typeof move.extra==='object'?Object.values(move.extra).slice(0,12):undefined;
  play(s,seat,String(move.cardId||''),{color:move.color,target:Number.isInteger(move.target)?move.target:undefined,extra});
 }
 else if(type==='draw')draw(s,seat);
 else if(type==='pass')pass(s,seat);
 else if(type==='flip'){if(!callFlip(s,seat))return null}   // repeat calls change nothing
 else throw Error('Unknown move.');
 return commit(table,s,now);
}

/** Advances anything that is waiting on time. Does at most one thing; returns null when nothing is due. */
export function applyTick(table,room,{now}){
 if(!table)return null;
 const s=load(table);
 if(s.phase!=='play')return null;
 // Players who left the room are replaced by bots so the match can finish.
 let changed=false;
 for(const p of s.players)if(!p.bot&&!room?.players?.[p.id]){p.bot=true;p.name=String(p.name).slice(0,26)+' (bot)';changed=true}
 // A last card that was not called gets caught after the window.
 const o=s.oneCard;
 if(o&&!o.called&&s.players[o.player]?.hand.length===1){
  const owner=s.players[o.player],wait=owner.bot?botCatchDelay(s.settings.botLevel):FLIP_CALL_WINDOW;
  if(now-(o.at||0)>=wait&&catchMissed(s,o.player))return commit(table,s,now);
 }
 const seat=s.turn,player=s.players[seat];
 if(player.bot){
  if(now-(table.lastAt||0)<BOT_STEP_MS)return changed?commit(table,s,now):null;
  const before=player.hand.length;
  try{
   const m=chooseMove(s,seat);
   if(before===2&&botCallsFlip(s.settings.botLevel))callFlip(s,seat);
   if(m.type==='play')play(s,seat,m.cardId,{color:m.color,target:m.target,extra:m.extra});else if(m.type==='draw')draw(s,seat);else pass(s,seat);
  }catch{autoMove(s,seat)}
  // Bots usually call their last card straight away.
  if(s.phase==='play'&&player.hand.length===1&&s.oneCard?.player===seat&&!s.oneCard.called&&botCallsFlip(s.settings.botLevel))callFlip(s,seat);
  return commit(table,s,now);
 }
 if(table.deadline&&now>=table.deadline){autoMove(s,seat);s.log.push({text:player.name+' ran out of time · auto move',at:now});return commit(table,s,now)}
 return changed?commit(table,s,now):null;
}

/** Public data for clients, written after each change. */
export function publishPatch(code,table){
 const s=load(table),view={...publicView(s),gameId:table.gameId,deadline:table.deadline||0,rev:table.rev,serverAt:table.lastAt||Date.now()};
 const patch={['novaFlip/rooms/'+code+'/game']:JSON.parse(JSON.stringify(view))};
 for(const p of s.players)if(!p.bot)patch['novaFlip/hands/'+code+'/'+p.id]=s.phase==='play'&&p.hand.length?p.hand:null;
 if(table.result){patch['novaFlip/rooms/'+code+'/lastResult']=table.result;patch['novaFlip/rooms/'+code+'/status']='lobby'}
 return patch;
}

async function publish(db,room,table){
 // Only move the public view forward: a slower, older write must not replace a newer one.
 const res=await db.ref('novaFlip/rooms/'+room+'/game').transaction(v=>v&&v.gameId===table.gameId&&(v.rev||0)>=table.rev?undefined:{...v,rev:table.rev});
 if(!res.committed)return;
 await db.ref().update(publishPatch(room,table));
}

export async function tableAction({db,uid,b,now,lockWagers}){
 if(!code(b.room))throw Error('Invalid room.');
 const roomRef=db.ref('novaFlip/rooms/'+b.room),tableRef=db.ref('novaControl/flipTables/'+b.room);
 const room=(await roomRef.get()).val();
 if(!room||room.status==='closed')throw Error('That room has closed.');

 if(b.op==='tableStart'){
  if(room.host!==uid)throw Error('Only the host can start the game.');
  if(room.status==='playing'){const t=(await tableRef.get()).val();if(t&&!t.result)throw Error('A game is already running.')}
  const table=newTable(room,{now});
  await tableRef.set(table);
  await db.ref().update({['novaFlip/rooms/'+b.room+'/status']:'playing',['novaFlip/rooms/'+b.room+'/gameId']:table.gameId,['novaFlip/rooms/'+b.room+'/startedAt']:now,['novaFlip/rooms/'+b.room+'/lastResult']:null,['novaFlip/rooms/'+b.room+'/game']:null});
  await db.ref().update(publishPatch(b.room,table));
  if(lockWagers)await lockWagers(b.room,table.gameId,room);
  return {ok:true,gameId:table.gameId};
 }
 if(!['tableMove','tableTick'].includes(b.op))throw Error('Unknown table request.');
 if(b.op==='tableMove'&&!uuid(b.gameId))throw Error('Invalid game.');
 const member=room.host===uid||!!room.players?.[uid];
 if(!member)throw Error('You are not in this room.');
 let failure=null,next=null;
 const tx=await tableRef.transaction(t=>{failure=null;next=null;if(!t)return t;
  try{
   if(b.op==='tableMove'){if(t.gameId!==b.gameId)throw Error('That game has ended.');next=applyMove(t,uid,b.move,{now})}
   else next=applyTick(t,room,{now});
  }catch(e){failure=e.message;return t}
  return next||undefined});   // nothing due (e.g. an early tick or a repeat call): write nothing
 if(failure)throw Error(failure);
 if(!next)return {ok:true,changed:false};
 if(!tx.committed)throw Error('The move could not be saved. Try again.');
 const table=tx.snapshot.val();
 if(next&&table)await publish(db,b.room,table);
 return {ok:true,changed:!!next,rev:table?.rev||0};
}
