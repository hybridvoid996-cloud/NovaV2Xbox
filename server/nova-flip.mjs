// Nova Flip rewards. Coins are only granted here, never by the browser.
// start → issues a one-time game token; claim → verifies the token, a minimum
// game length and (online) the host-published result, then pays out.
import {randomUUID} from 'node:crypto';

export const FLIP_BASE_POINTS=1000;
export const FLIP_MAX_POINTS=2500;      // 1000 base + up to 1500 from cards left in opponents' hands
export const FLIP_ONLINE_BONUS=250;     // extra coins for beating at least one other person
export const FLIP_DAILY_COIN_WINS=15;   // wins per UTC day that pay coins (points still count after)
export const FLIP_MIN_SECONDS=45;

const day=now=>new Date(now).toISOString().slice(0,10);
const code=s=>typeof s==='string'&&/^[A-Z0-9]{5}$/.test(s);
const uuid=s=>typeof s==='string'&&/^[0-9a-f-]{36}$/i.test(s);

export async function novaFlipAction({db,uid,account,b,now,initial}){
 const statsRef=db.ref('novaControl/flipStats/'+uid),gameRef=db.ref('novaControl/flipGames/'+uid),progress=db.ref('novaControl/progress/'+uid);
 const readStats=async()=>({wins:0,games:0,points:0,best:0,day:'',dayWins:0,...((await statsRef.get()).val()||{})});

 if(b.op==='stats'){
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
   const result=room?.lastResult;
   if(!result||result.gameId!==game.gameId||result.winner!==uid)throw Error('The room did not record you as the winner.');
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
  const coinsWon=paid?points+bonus:0;
  let coins=(await progress.get()).val()?.coins||0;
  if(coinsWon){const r=await progress.transaction(p=>{p={...initial(),...(p||{})};p.coins=(p.coins||0)+coinsWon;return p});coins=r.snapshot.val().coins}
  await db.ref('novaFlip/stats/'+uid).set({name:String(account?.name||'Nova player').slice(0,32),wins:stats.wins,points:stats.points,best:stats.best,updatedAt:now}).catch(()=>{});
  return {ok:true,points,coinsWon,bonus:paid?bonus:0,limited:!paid,coins,stats:{...stats,dailyLimit:FLIP_DAILY_COIN_WINS}};
 }
 throw Error('Unknown Nova Flip request.');
}
