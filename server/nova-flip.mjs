// Nova Flip rewards. Coins are only granted here, never by the browser.
// start → issues a one-time game token; claim → verifies the token, a minimum
// game length and (online) the host-published result, then pays out.
import {randomUUID} from 'node:crypto';
import {tableAction} from './nova-flip-table.mjs';

export const FLIP_BASE_POINTS=1000;
export const FLIP_MAX_POINTS=2500;      // 1000 base + up to 1500 from cards left in opponents' hands
export const FLIP_ONLINE_BONUS=0;       // online wins pay the same flat reward
export const FLIP_WIN_COINS=5000;       // Nova Coins for every counted win
export const FLIP_MIN_WAGER=5000,FLIP_MAX_WAGER=1000000000;   // no real cap: bets are limited by the player's own balance
export const FLIP_DAILY_COIN_WINS=15;   // wins per UTC day that pay coins (points still count after)
export const FLIP_MIN_SECONDS=45;

const day=now=>new Date(now).toISOString().slice(0,10);
const code=s=>typeof s==='string'&&/^[A-Z0-9]{5}$/.test(s);
const uuid=s=>typeof s==='string'&&/^[0-9a-f-]{36}$/i.test(s);

export async function novaFlipAction({db,uid,account,b,now,initial}){
 const statsRef=db.ref('novaControl/flipStats/'+uid),gameRef=db.ref('novaControl/flipGames/'+uid),progress=db.ref('novaControl/progress/'+uid);
 const readStats=async()=>({wins:0,games:0,points:0,best:0,day:'',dayWins:0,...((await statsRef.get()).val()||{})});

 if(b.op==='stats'){
  await settleMyWagers(db,uid,now,initial).catch(()=>{});
  const [stats,p]=await Promise.all([readStats(),progress.get()]);
  const today=stats.day===day(now)?stats.dayWins:0;
  return {stats:{...stats,dayWins:today,dailyLimit:FLIP_DAILY_COIN_WINS},coins:p.val()?.coins||0};
 }

 if(b.op==='start'){
  const mode=b.mode==='online'?'online':'solo';
  const players=Number(b.players);if(!Number.isInteger(players)||players<2||players>4)throw Error('Choose 2 to 4 players.');
  if(mode==='online'&&(!code(b.room)||!uuid(b.gameId)))throw Error('Invalid room.');
  const token=randomUUID();
  await gameRef.set({token,mode,players,room:mode==='online'?b.room:null,gameId:mode==='online'?b.gameId:null,startedAt:now});
  await statsRef.transaction(s=>({wins:0,games:0,points:0,best:0,...(s||{}),games:((s||{}).games||0)+1}));
  return {token};
 }

 if(b.op==='claim'){
  const game=(await gameRef.get()).val();
  if(!game||game.token!==b.token)throw Error('This win was already claimed or the game was not registered.');
  if(now-game.startedAt<FLIP_MIN_SECONDS*1000)throw Error('That game was too short to count.');
  let points,bonus=0;
  if(game.mode==='online'){
   const room=(await db.ref('novaFlip/rooms/'+game.room).get()).val();
   // Only the result written by the server-run table counts (never a value a player wrote).
   const result=(await db.ref('novaControl/flipTables/'+game.room+'/result').get()).val();
   if(!result||result.gameId!==game.gameId||result.winner!==uid)throw Error('The server did not record you as the winner.');
   if(!room.players?.[uid]&&room.host!==uid)throw Error('You are no longer in that room.');
   points=Number(result.points)||FLIP_BASE_POINTS;
   if((result.humans||1)>=2)bonus=FLIP_ONLINE_BONUS;
  }else points=Number(b.points)||FLIP_BASE_POINTS;
  points=Math.max(FLIP_BASE_POINTS,Math.min(FLIP_MAX_POINTS,Math.floor(points)));
  // Burn the token first so a retry can never pay twice.
  const burned=await gameRef.transaction(g=>g&&g.token===b.token?null:undefined);
  if(!burned.committed)throw Error('This win was already claimed.');
  const today=day(now);let paid=false;
  const statsResult=await statsRef.transaction(s=>{s={wins:0,games:0,points:0,best:0,day:'',dayWins:0,...(s||{})};if(s.day!==today){s.day=today;s.dayWins=0}paid=s.dayWins<FLIP_DAILY_COIN_WINS;s.wins++;s.points+=points;s.best=Math.max(s.best,points);if(paid)s.dayWins++;return s});
  const stats=statsResult.snapshot.val();
  const coinsWon=paid?FLIP_WIN_COINS:0;bonus=0;
  let coins=(await progress.get()).val()?.coins||0;
  if(coinsWon){const r=await progress.transaction(p=>{p={...initial(),...(p||{})};p.coins=(p.coins||0)+coinsWon;return p});coins=r.snapshot.val().coins}
  await db.ref('novaFlip/stats/'+uid).set({name:String(account?.name||'Nova player').slice(0,32),wins:stats.wins,points:stats.points,best:stats.best,updatedAt:now}).catch(()=>{});
  return {ok:true,points,coinsWon,bonus:paid?bonus:0,limited:!paid,coins,stats:{...stats,dailyLimit:FLIP_DAILY_COIN_WINS}};
 }
 if(['tableStart','tableMove','tableTick'].includes(b.op))return tableAction({db,uid,b,now,lockWagers:(room,gameId,roomData)=>lockWagers(db,room,gameId,roomData,now,initial)});
 if(['wager','unwager','wagerLock','wagerSettle'].includes(b.op))return wagerAction({db,uid,account,b,now,initial});
 throw Error('Unknown Nova Flip request.');
}

// ---------- Wagers ----------
// Each player stakes 5,000+ coins in the lobby. Coins are held by the server in
// novaControl/flipWagers/{room}/{uid}; rooms/{room}/wagers mirrors them for display.
// When the host starts, the stakes are locked to that game. The human winner takes
// the whole pot; if a bot wins or the room closes first, everyone is refunded.
const wagersRef=(db,room)=>db.ref('novaControl/flipWagers/'+room);
async function moveCoins(db,uid,delta,initial){
 let failure=null;
 const r=await db.ref('novaControl/progress/'+uid).transaction(p=>{failure=null;p={...initial(),...(p||{})};const next=(p.coins||0)+delta;if(!Number.isSafeInteger(next)||next<0){failure='You do not have enough Nova Coins.';return p}p.coins=next;return p});
 if(failure)throw Error(failure);if(!r.committed)throw Error('Coins could not be updated. Retry.');
 return r.snapshot.val().coins;
}
async function payout(db,room,entries,winner,initial,now){
 const pot=entries.reduce((sum,[,e])=>sum+e.amount,0);
 const winnerStaked=winner&&entries.some(([id])=>id===winner);
 if(winnerStaked)await moveCoins(db,winner,pot,initial);
 else for(const [id,e]of entries)await moveCoins(db,id,e.amount,initial);
 const patch={};for(const [id]of entries){patch['novaFlip/rooms/'+room+'/wagers/'+id]=null;patch['novaControl/flipWagerUsers/'+id+'/'+room]=null}
 if(winnerStaked)patch['novaFlip/rooms/'+room+'/lastPot']={winner,amount:pot,at:now};
 await db.ref().update(patch).catch(()=>{});
 return {pot,paidTo:winnerStaked?winner:null,refunded:!winnerStaked};
}
export async function settleRoomWagers(db,room,now,initial){
 const [roomData,table]=await Promise.all([db.ref('novaFlip/rooms/'+room).get(),db.ref('novaControl/flipTables/'+room).get()]).then(r=>r.map(x=>x.val()));
 const result=table?.result,open=roomData&&roomData.status!=='closed';
 let taken=[],winner=null;
 await wagersRef(db,room).transaction(all=>{taken=[];winner=null;if(!all)return all;
  const game=all._game;
  for(const [id,e]of Object.entries(all)){if(id==='_game'||!e)continue;
   const lockedHere=game&&e.gameId===game.gameId;
   // A result posted less than 45 seconds after the stakes locked is not trusted: everyone is refunded.
   if(lockedHere&&result?.gameId===game.gameId){taken.push([id,e]);winner=!result.winnerBot&&Number(result.at||now)-Number(game.at||0)>=FLIP_MIN_SECONDS*1000?result.winner:null}
   else if(lockedHere&&(!open||table?.gameId!==game.gameId))taken.push([id,e]);       // game abandoned
   else if(!lockedHere&&!open)taken.push([id,e]);                                     // lobby closed
  }
  for(const [id]of taken)delete all[id];
  if(game&&!Object.entries(all).some(([id,e])=>id!=='_game'&&e?.gameId===game.gameId))delete all._game;
  return Object.keys(all).length?all:null});
 if(!taken.length)return {pot:0};
 return payout(db,room,taken,winner,initial,now);
}
async function settleMyWagers(db,uid,now,initial){
 const rooms=Object.keys((await db.ref('novaControl/flipWagerUsers/'+uid).get()).val()||{}).slice(0,10);
 for(const room of rooms)if(code(room))await settleRoomWagers(db,room,now,initial);
}
async function wagerAction({db,uid,account,b,now,initial}){
 if(!code(b.room))throw Error('Invalid room.');
 const roomRef=db.ref('novaFlip/rooms/'+b.room),roomData=(await roomRef.get()).val();
 if(b.op==='wagerSettle')return {ok:true,...await settleRoomWagers(db,b.room,now,initial)};
 if(!roomData||roomData.status==='closed')throw Error('That room has closed.');
 const member=roomData.host===uid||!!roomData.players?.[uid];
 if(b.op==='wagerLock')return {ok:true};   // bets now lock automatically when the server starts the game
 if(!member)throw Error('Join the room first.');
 if(roomData.status!=='lobby')throw Error('Wagers can only change in the lobby.');
 if(!roomData.settings?.wagers)throw Error('The host has not turned on wagering for this room.');
 const current=(await db.ref('novaControl/flipWagers/'+b.room+'/'+uid).get()).val();
 if(current?.gameId)throw Error('Your wager is locked into the current game.');
 const old=current?.amount||0;
 const amount=b.op==='unwager'?0:Number(b.amount);
 if(b.op==='wager'&&(!Number.isSafeInteger(amount)||amount<FLIP_MIN_WAGER||amount>FLIP_MAX_WAGER))throw Error('Wager at least '+FLIP_MIN_WAGER.toLocaleString('en-US')+' Nova Coins.');
 const coins=await moveCoins(db,uid,old-amount,initial);
 const name=String(account?.name||'Nova player').slice(0,32);
 try{
  await db.ref().update(amount?{['novaControl/flipWagers/'+b.room+'/'+uid]:{amount,at:now,name},['novaFlip/rooms/'+b.room+'/wagers/'+uid]:{amount,name},['novaControl/flipWagerUsers/'+uid+'/'+b.room]:true}
   :{['novaControl/flipWagers/'+b.room+'/'+uid]:null,['novaFlip/rooms/'+b.room+'/wagers/'+uid]:null,['novaControl/flipWagerUsers/'+uid+'/'+b.room]:null});
 }catch(error){await moveCoins(db,uid,amount-old,initial);throw error}
 return {ok:true,amount,coins};
}

// Called by the server when it starts a table: stakes of seated players lock to that game,
// anyone who bet but is no longer seated is refunded.
export async function lockWagers(db,room,gameId,roomData,now,initial){
 const refunds=[];
 await wagersRef(db,room).transaction(all=>{refunds.length=0;if(!all)return all;
  for(const [id,e]of Object.entries(all)){if(id==='_game'||!e||e.gameId)continue;if(roomData.players?.[id]||id===roomData.host)e.gameId=gameId;else{refunds.push([id,e]);delete all[id]}}
  all._game={gameId,at:now};return all});
 for(const [id,e]of refunds){await moveCoins(db,id,e.amount,initial);await db.ref().update({['novaFlip/rooms/'+room+'/wagers/'+id]:null,['novaControl/flipWagerUsers/'+id+'/'+room]:null})}
}
