import {streakStatus} from '../Public/src/streak-core.mjs';
import {advanceRank,rankSummary,NOVA_RANKS} from '../Public/src/nova-rank-core.mjs';
import {leaderboardGames} from './leaderboard.mjs';
import {levelForXP,totalXP} from './player-progress.mjs';
const standings=new WeakMap();
async function positions(db,now){let cache=standings.get(db);if(!cache||now-cache.at>30000){cache={at:now,promise:db.ref('novaControl/progress').get().then(s=>Object.entries(s.val()||{}).filter(([,p])=>p?.rank&&Number.isFinite(p.rank.elo)).sort((a,b)=>b[1].rank.elo-a[1].rank.elo||a[0].localeCompare(b[0])).map(([id])=>id))};standings.set(db,cache)}return cache.promise}
async function grantRank(db,uid,rank){const updates={};for(const r of NOVA_RANKS)updates['novaChatV2/memberRoles/'+uid+'/rank_'+r.id]=r.id===rank.id?true:null;updates['novaChatV2/customRoles/rank_'+rank.id]={name:rank.name,from:rank.color,to:'#ffffff',color:rank.color,purchaseOnly:true,rankIndex:rank.index};await db.ref().update(updates)}
export async function rankAction(db,uid,action,b,now=Date.now()){
 if(action==='rankBoard'){
  const offset=Number.isSafeInteger(b.offset)&&b.offset>=0?b.offset:0;
  const [records,accounts]=await Promise.all(['novaControl/progress','novaAccounts'].map(path=>db.ref(path).get().then(s=>s.val()||{})));
  const players=Object.entries(records).filter(([id,p])=>accounts[id]&&p?.rank&&Number.isFinite(p.rank.elo)).sort((a,b)=>b[1].rank.elo-a[1].rank.elo||a[0].localeCompare(b[0]));
  const own=records[uid]?.rank||{},place=players.findIndex(([id])=>id===uid);
  const rows=await Promise.all(players.slice(offset,offset+40).map(async([id,p],i)=>{const profile=await db.ref('novaChatV2/profiles/'+id).get();const a=accounts[id]||{},chat=profile.val()||{},photo=chat.photo||a.photo||'';return {streak:streakStatus(p.streak||{},now).count,uid:id,name:String(chat.name||a.name||'Nova player').slice(0,100),photo:typeof photo==='string'&&photo.length<100000&&/^(https:\/\/|data:image\/(?:png|jpeg|webp|gif);base64,)/.test(photo)?photo:'',position:offset+i+1,...rankSummary(p.rank,offset+i+1)}}));
  return {rank:rankSummary(own,place<0?null:place+1),recent:(Array.isArray(own.recent)?own.recent:[]).slice(0,6),players:rows,total:players.length,next:offset+40<players.length?offset+40:null,serverNow:now};
 }
 if(action==='rankPulse'){
  const game=(await leaderboardGames()).find(g=>g.key===b.game&&!g.key.startsWith('app:')),known=!!game;
  const result=await db.ref('novaControl/progress/'+uid).transaction(p=>{p||={xp:0,coins:0,challenges:[],resetAt:0};const update=advanceRank(p.rank||{},{active:b.active===true&&known,game:b.game,session:b.session},now);p.rank=update.record;if(update.seconds>0&&game){const rows=Array.isArray(p.rank.recent)?p.rank.recent:[],previous=rows.find(row=>row.game===game.key);p.rank.recent=[{game:game.key,name:game.name,art:game.art||'',seconds:(Number(previous?.seconds)||0)+update.seconds,at:now},...rows.filter(row=>row.game!==game.key)].slice(0,6)}for(const r of update.promotions){p.coins=(Number(p.coins)||0)+r.coins;const level=levelForXP(Number(p.xp)||0);p.xp=Math.min(totalXP(2000),(Number(p.xp)||0)+totalXP(Math.min(2000,level+r.levels))-totalXP(level))}return p});
  const progress=result.snapshot.val(),summary=rankSummary(progress.rank);if(progress.rank.role!==summary.rank.id){await grantRank(db,uid,summary.rank);await db.ref('novaControl/progress/'+uid+'/rank/role').set(summary.rank.id)}return {rank:summary,progress};
 }
 if(action==='rankProfile'){
  const id=typeof b.uid==='string'?b.uid:uid;if(!id||id.length>128||/[.#$\[\]\/]/.test(id))throw Error('Choose a Nova profile.');
  const [snapshot,ids,music]=await Promise.all([db.ref('novaControl/progress/'+id+'/rank').get(),positions(db,now),db.ref('novaChatV2/profiles/'+id+'/recentMusic').get()]);
  return {rank:rankSummary(snapshot.val()||{},ids.includes(id)?ids.indexOf(id)+1:null),recentMusic:Array.isArray(music.val())?music.val():[]};
 }
 if(action==='rankMusic'){
  const name=typeof b.name==='string'?b.name.trim().slice(0,150):'';if(!name)throw Error('Choose a song.');const artist=typeof b.artist==='string'?b.artist.slice(0,150):'',art=typeof b.art==='string'&&b.art.length<2000&&/^https:\/\//.test(b.art)?b.art:'';
  await db.ref('novaChatV2/profiles/'+uid+'/recentMusic').transaction(old=>[{name,artist,art,at:now},...(Array.isArray(old)?old:[]).filter(m=>m.name!==name||m.artist!==artist)].slice(0,5));return {ok:true};
 }
}
