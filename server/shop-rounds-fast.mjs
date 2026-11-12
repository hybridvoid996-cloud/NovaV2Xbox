// Fast path for round games (Mines, Crash, Chicken).
// The legacy handlers ran a transaction over the whole novaControl branch on every click, which
// downloads every player's data and made each reveal/step/collect slow. Here the same game rules
// (applyMines / applyArcadeRound) run inside a transaction on novaControl/progress/{uid} only:
// the player's coins, active rounds, round receipts and daily round limit all live in that record.
// Feed + leaderboard stats are written after the result settles. Rounds started before this
// change (still active under the old paths) finish on the legacy handler.
import {randomInt} from 'node:crypto';
import {SHOP_SEASON} from './shop-season.mjs';
import {applyMines,publicMines,minesAction} from './shop-mines.mjs';
import {applyArcadeRound,publicArcade,settleCrash,arcadeRoundAction} from './shop-rounds.mjs';
import {applyStats} from './arcade-fast.mjs';

const KEEP_RECEIPTS=40;
// Read every time (in parallel with the round reads) so a season reset blocks play immediately.
const season=db=>db.ref('novaControl/shopSeason').get().then(x=>x.val());

// Builds a tiny stand-in for the novaControl root holding only this player's data, so the
// existing (tested) game rules run unchanged.
function shim(uid,p,seasonValue){
 const rounds=p.rounds||{};
 const arcade={};if(rounds.crash)arcade.crash=rounds.crash;if(rounds.chicken)arcade.chicken=rounds.chicken;
 if(rounds.mines&&!Array.isArray(rounds.mines.picks))rounds.mines.picks=Object.values(rounds.mines.picks||{});
 return {shopSeason:seasonValue,progress:{[uid]:p},minesRounds:rounds.mines?{[uid]:rounds.mines}:{},arcadeRounds:{[uid]:arcade},
  shopReceipts:{[uid]:{...(p.roundReceipts||{})}},wagerLimits:p.roundLimit?{[uid]:p.roundLimit}:{},wagerFeed:{},gambleStats:{}};
}
function writeBack(uid,p,root){
 const a=root.arcadeRounds[uid]||{};
 p.rounds={mines:root.minesRounds[uid]||null,crash:a.crash||null,chicken:a.chicken||null};
 const receipts=root.shopReceipts[uid]||{};
 const keep=Object.keys(receipts).sort((x,y)=>(receipts[y].at||0)-(receipts[x].at||0)).slice(0,KEEP_RECEIPTS);
 p.roundReceipts=Object.fromEntries(keep.map(k=>[k,receipts[k]]));
 p.roundLimit=root.wagerLimits[uid]||null;
 return p;
}

async function run({db,uid,now,initial,seasonValue,apply,read}){
 if(seasonValue?.version!==SHOP_SEASON||seasonValue.status!=='ready')throw Error('The shop is preparing. Retry shortly.');
 let failure,root;
 const tx=await db.ref('novaControl/progress/'+uid).transaction(p=>{
  failure=null;root=null;
  // RTDB may call with a cold null cache. Return null to allow the server retry; never abort using a fabricated zero balance.
  if(p===null)return null;
  try{p=p||initial();const r=shim(uid,p,seasonValue);apply(r);root=r;return writeBack(uid,p,r)}
  catch(e){failure=e.message;return undefined}
 });
 if(!tx.committed||!root)throw Error(failure||'The round could not connect. Retry the same action.');
 const finished=Object.entries(root.wagerFeed);
 if(finished.length){
  await Promise.all(finished.flatMap(([key,feed])=>{
   const receipt=root.shopReceipts[uid]?.[key.slice(uid.length+1)];
   return [db.ref('novaControl/wagerFeed/'+key).set(feed),receipt?db.ref('novaControl/gambleStats/'+uid).transaction(s=>applyStats(s,receipt)):null].filter(Boolean);
  })).catch(()=>{});
 }
 return read(tx.snapshot.val()||{});
}

export async function fastMinesAction({db,uid,b,now,initial}){
 const [legacySnap,progSnap,seasonValue]=await Promise.all([db.ref('novaControl/minesRounds/'+uid).get(),db.ref('novaControl/progress/'+uid).get(),b.op==='status'?null:season(db)]);
 const legacy=legacySnap.val(),p=progSnap.val()||{};
 if(legacy?.state==='active'&&!p.rounds?.mines)return minesAction({db,uid,b,now,initial});
 if(b.op==='status'){const r=p.rounds?.mines||legacy;if(r&&!Array.isArray(r.picks))r.picks=Object.values(r.picks||{});return publicMines(r||null,p.coins||0)}
 const roll=randomInt(0x1000000000000-1)/0x1000000000000;
 return run({db,uid,now,initial,seasonValue,apply:root=>applyMines(root,uid,b,now,initial,roll),read:v=>{const r=v.rounds?.mines;if(r&&!Array.isArray(r.picks))r.picks=Object.values(r.picks||{});return publicMines(r||null,v.coins||0)}});
}

export async function fastArcadeRoundAction({db,uid,b,now,initial}){
 if(!['crash','chicken'].includes(b.game))throw Error('Choose Crash or Chicken.');
 const [legacySnap,progSnap,seasonValue]=await Promise.all([db.ref('novaControl/arcadeRounds/'+uid+'/'+b.game).get(),db.ref('novaControl/progress/'+uid).get(),season(db)]);
 const legacy=legacySnap.val(),p=progSnap.val()||{};
 if(legacy?.state==='active'&&!p.rounds?.[b.game])return arcadeRoundAction({db,uid,b,now,initial});
 if(b.op==='status'){
  const r=p.rounds?.[b.game]||null;
  // Crash rounds settle lazily: only open a transaction once the plane has (or would have) landed.
  const due=r&&b.game==='crash'&&r.state==='active'&&now>=r.startedAt+Math.log(r.autoCashout&&r.autoCashout<=r.crashAt?r.autoCashout:r.crashAt)*7000;
  if(!due)return publicArcade(r||(legacy&&legacy.state!=='active'?legacy:null),p.coins||0,now);
 }
 const roll=randomInt(1000000000)/1000000000;
 return run({db,uid,now,initial,seasonValue,apply:root=>applyArcadeRound(root,uid,b,now,initial,roll),read:v=>publicArcade(v.rounds?.[b.game]||null,v.coins||0,now)});
}
export {settleCrash};
