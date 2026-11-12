// Fast Nova Arcade: instant coin games settled in ONE small transaction on the player's own
// progress node (novaControl/progress/{uid}), instead of the whole novaControl branch.
// Retries with the same requestId replay the stored receipt, so a dropped connection can
// never charge twice. Randomness comes from node:crypto.
import {randomInt} from 'node:crypto';
import {wheelColor} from './shop-games.mjs';

export const FAST_GAMES=['flip','dice','roulette','limbo','plinko','wheel','slots'];
export const DAILY_FAST_LIMIT=50;          // instant coin games per player per day (America/New_York)
export const MIN_STAKE=100,MAX_STAKE=5000000,BALANCE_CAP=1000000000;
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
const rnd=(n,random)=>random(n);
const uniform=random=>random(1000000)/1000000;

// ---------- payout tables (expected return is checked in tests: 94–99%) ----------
export const PLINKO={ // 12 rows -> 13 slots, symmetric
 low:[9,3,1.6,1.3,1.1,1,.45,1,1.1,1.3,1.6,3,9],
 medium:[26,9,3.2,1.8,1.1,.7,.3,.7,1.1,1.8,3.2,9,26],
 high:[110,30,8,2,.6,.2,.2,.2,.6,2,8,30,110]
};
export const WHEEL={ // 20 equal segments
 low:[1.5,1.2,1.2,1.2,1.5,0,1.2,1.2,0,1.5,1.2,1.2,1.2,1.5,0,1.2,1.2,0,1.5,0],
 medium:[0,1.5,0,2,0,1.5,0,3,0,1.5,0,2,0,1.5,0,2.7,0,1.7,0,2],
 high:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,19.4]
};
// Original slot symbols with weights; payout for three of a kind, and a small payout for two stars.
export const SLOT_SYMBOLS=[
 {id:'star',icon:'✦',weight:30,three:6,two:1.45},
 {id:'moon',icon:'☾',weight:24,three:10},
 {id:'bolt',icon:'⚡',weight:18,three:18},
 {id:'gem',icon:'◆',weight:10,three:40},
 {id:'crown',icon:'♛',weight:6,three:100},
 {id:'nova',icon:'N',weight:2,three:1000}
];
const slotTotal=SLOT_SYMBOLS.reduce((a,s)=>a+s.weight,0);
function slotReel(random){let r=rnd(slotTotal,random);for(const s of SLOT_SYMBOLS){r-=s.weight;if(r<0)return s.id}return SLOT_SYMBOLS[0].id}
export function slotMultiplier(reels){
 if(reels[0]===reels[1]&&reels[1]===reels[2])return SLOT_SYMBOLS.find(s=>s.id===reels[0]).three;
 if(reels.filter(r=>r==='star').length===2)return SLOT_SYMBOLS[0].two;
 return 0;
}

// Returns {multiplier, outcome}. Throws for invalid choices.
export function playFast(game,p,random=randomInt){
 if(game==='flip'){if(!['heads','tails'].includes(p.choice))throw Error('Choose heads or tails.');const side=rnd(2,random)?'tails':'heads';return {multiplier:side===p.choice?1.9:0,outcome:{side}}}
 if(game==='dice'){if(!['low','high'].includes(p.choice))throw Error('Choose low (1–3) or high (4–6).');const number=rnd(6,random)+1;return {multiplier:(number<=3?'low':'high')===p.choice?1.9:0,outcome:{number}}}
 if(game==='roulette'){
  if(!['color','number'].includes(p.pick))throw Error('Choose color or number.');
  if(p.pick==='color'&&!['red','black'].includes(p.color))throw Error('Choose red or black.');
  if(p.pick==='number'&&(!Number.isInteger(p.number)||p.number<0||p.number>36))throw Error('Choose a number from 0 to 36.');
  const number=rnd(37,random),color=wheelColor(number);
  const won=p.pick==='color'?color===p.color:number===p.number;
  return {multiplier:won?(p.pick==='color'?2:36):0,outcome:{number,color}};
 }
 if(game==='limbo'){
  const target=Math.round(Number(p.target)*100)/100;if(!(target>=1.01&&target<=100))throw Error('Pick a target from 1.01× to 100×.');
  const u=uniform(random);const result=Math.min(1000,Math.max(1,Math.floor(.97/(1-u)*100)/100));
  return {multiplier:result>=target?target:0,outcome:{result,target}};
 }
 if(game==='plinko'){
  const table=PLINKO[p.risk];if(!table)throw Error('Choose low, medium or high risk.');
  const path=Array.from({length:12},()=>rnd(2,random));const slot=path.reduce((a,b)=>a+b,0);
  return {multiplier:table[slot],outcome:{path,slot,risk:p.risk}};
 }
 if(game==='wheel'){
  const table=WHEEL[p.risk];if(!table)throw Error('Choose low, medium or high risk.');
  const segment=rnd(table.length,random);return {multiplier:table[segment],outcome:{segment,risk:p.risk}};
 }
 if(game==='slots'){const reels=[slotReel(random),slotReel(random),slotReel(random)];return {multiplier:slotMultiplier(reels),outcome:{reels}}}
 throw Error('Choose a Nova Arcade game.');
}

// Pure settlement used inside the transaction (exported for tests).
export function settleFast(progress,{uid,requestId,game,coins,plan,now}){
 if(!progress||!Number.isSafeInteger(progress.coins)||progress.coins<0)throw Error('Your balance is unavailable.');
 const day=dayFormat.format(new Date(now));
 const a=progress.arcade&&progress.arcade.day===day?progress.arcade:{day,count:0,last:0,receipts:progress.arcade?.receipts||{}};
 a.receipts||={};
 if(a.receipts[requestId])return {progress,receipt:a.receipts[requestId],replay:true};
 if(a.count>=DAILY_FAST_LIMIT)throw Error('Daily limit reached: '+DAILY_FAST_LIMIT+' instant games. Come back tomorrow.');
 if(now-(a.last||0)<250)throw Error('Slow down a little.');
 if(progress.coins<coins)throw Error('You do not have enough Nova Coins.');
 const payout=Math.floor(coins*plan.multiplier);
 const balance=progress.coins-coins+payout;if(!Number.isSafeInteger(balance)||balance>BALANCE_CAP)throw Error('This wager exceeds the balance limit.');
 progress.coins=balance;a.count++;a.last=now;
 const receipt={game,stake:'coins',coins,payout,multiplier:plan.multiplier,won:payout>coins,outcome:plan.outcome,at:now,balance};
 a.receipts[requestId]=receipt;
 const ids=Object.keys(a.receipts).sort((x,y)=>a.receipts[y].at-a.receipts[x].at);for(const old of ids.slice(15))delete a.receipts[old];
 progress.arcade=a;
 return {progress,receipt,replay:false};
}

export function applyStats(s,receipt){
 s={games:0,wagered:0,won:0,lost:0,net:0,biggestWin:0,...(s||{})};
 const diff=receipt.payout-receipt.coins;
 s.games++;s.wagered+=receipt.coins;s.net+=diff;if(diff>0){s.won+=diff;s.biggestWin=Math.max(s.biggestWin,diff)}else s.lost+=-diff;s.updatedAt=receipt.at;
 return s;
}

export async function arcadeAction({db,uid,b,now,initial}){
 if(b.op==='board')return arcadeBoard(db);
 if(b.op!=='play')throw Error('Unknown arcade request.');
 if(!/^[a-f0-9-]{36}$/.test(b.requestId||''))throw Error('A round ID is required.');
 if(!FAST_GAMES.includes(b.game))throw Error('Choose a Nova Arcade game.');
 const coins=Number(b.coins);if(!Number.isSafeInteger(coins)||coins<MIN_STAKE||coins>MAX_STAKE)throw Error('Wager 100–5,000,000 Nova Coins.');
 const plan=playFast(b.game,b);   // drawn once, so transaction retries reuse the same result
 let failure,settled;
 const result=await db.ref('novaControl/progress/'+uid).transaction(p=>{failure=null;try{p=p||initial();const r=settleFast(p,{uid,requestId:b.requestId,game:b.game,coins,plan,now});settled=r;return r.progress}catch(e){failure=e.message;return undefined}});
 if(!result.committed||!settled)throw Error(failure||'The round could not complete.');
 const receipt=settled.receipt;
 if(!settled.replay){
  // Feed + leaderboard stats are written after the coins settle (non-blocking for the result).
  const feed={uid,game:receipt.game,stake:'coins',coins:receipt.coins,payout:receipt.payout,won:receipt.won,at:receipt.at,balance:receipt.balance,crates:null};
  await Promise.all([
   db.ref('novaControl/wagerFeed/'+uid+':'+b.requestId).set(feed),
   db.ref('novaControl/gambleStats/'+uid).transaction(s=>applyStats(s,receipt))
  ]).catch(()=>{});
  if(randomInt(15)===0)trimFeed(db).catch(()=>{});
 }
 return {ok:true,receipt,coins:result.snapshot.val().coins,limit:{used:result.snapshot.val().arcade?.count||0,max:DAILY_FAST_LIMIT}};
}
async function trimFeed(db){const feed=(await db.ref('novaControl/wagerFeed').get()).val()||{};const keys=Object.keys(feed).sort((a,b)=>feed[b].at-feed[a].at);const patch={};for(const k of keys.slice(40))patch[k]=null;if(Object.keys(patch).length)await db.ref('novaControl/wagerFeed').update(patch)}

// Gambling leaderboard: biggest net winners, biggest net losers, biggest single wins.
export async function arcadeBoard(db){
 const stats=(await db.ref('novaControl/gambleStats').get()).val()||{};
 const rows=Object.entries(stats).map(([uid,s])=>({uid,...s})).filter(r=>r.games>0);
 const pick=(sort,n=10)=>[...rows].sort(sort).slice(0,n);
 const winners=pick((a,b)=>b.net-a.net).filter(r=>r.net>0),losers=pick((a,b)=>a.net-b.net).filter(r=>r.net<0),biggest=pick((a,b)=>b.biggestWin-a.biggestWin).filter(r=>r.biggestWin>0),active=pick((a,b)=>b.wagered-a.wagered);
 const ids=[...new Set([...winners,...losers,...biggest,...active].map(r=>r.uid))];
 const people=new Map(await Promise.all(ids.map(async uid=>{const p=(await db.ref('novaChatV2/profiles/'+uid).get()).val()||{};const photo=typeof p.photo==='string'&&p.photo.length<=50000&&/^(https:\/\/|data:image\/)/.test(p.photo)?p.photo:'';return [uid,{name:String(p.displayName||p.name||'Nova member').slice(0,64),photo,effect:String(p.effect||'').slice(0,120),decoration:String(p.decoration||'').slice(0,120),nameRole:p.nameRole&&/^#[0-9a-f]{6}$/i.test(p.nameRole.from||'')&&/^#[0-9a-f]{6}$/i.test(p.nameRole.to||'')?{from:p.nameRole.from,to:p.nameRole.to}:null}]})));
 const withPeople=list=>list.map(r=>({uid:r.uid,games:r.games,wagered:r.wagered,won:r.won,lost:r.lost,net:r.net,biggestWin:r.biggestWin,...people.get(r.uid)}));
 return {winners:withPeople(winners),losers:withPeople(losers),biggest:withPeople(biggest),active:withPeople(active)};
}
