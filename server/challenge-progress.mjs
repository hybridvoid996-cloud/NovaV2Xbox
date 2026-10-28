import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CHALLENGE_PERIOD,CHALLENGE_MINUTES,CHALLENGE_REWARDS,CHALLENGE_REWARDS_VERSION,needsChallengeReset,startChallengeCycle} from './challenge-cycle.mjs';
import {totalXP} from './player-progress.mjs';
let catalog;
export function challengeCatalog(){return catalog??=Promise.all([['games','game'],['apps','app'],['cloud','cloud']].map(async([file,kind])=>JSON.parse(await readFile(new URL('../Public/library-'+file+'.json',import.meta.url),'utf8')).map(g=>({...g,id:String(g.id),kind})))).then(v=>v.flat()).catch(e=>{catalog=null;throw e})}
export function createChallenges(uid,all,now){
 const seed=uid+':'+Math.floor(now/CHALLENGE_PERIOD),hash=g=>createHash('sha256').update(seed+':'+g.kind+':'+g.id).digest('hex');
 const picks=[];for(const [kind,count]of [['game',3],['app',2],['cloud',2]])picks.push(...all.filter(g=>g.kind===kind).sort((a,b)=>hash(a).localeCompare(hash(b))).slice(0,count));
 picks.push({id:'watch-movies',kind:'movie',name:'Movie night · watch movies',art:'/src/challenge-movie.svg',mediaTypes:['movie']},{id:'watch-series',kind:'movie',name:'One more episode · shows & anime',art:'/src/challenge-series.svg',mediaTypes:['tv','anime']});
 return picks.map((g,i)=>({id:g.id,kind:g.kind,name:g.name,art:g.art||'/Nova12.png',...(g.mediaTypes?{mediaTypes:g.mediaTypes}:{}),minutes:CHALLENGE_MINUTES[i],reward:CHALLENGE_REWARDS[i],seconds:0,claimed:false}));
}
export function challengeActivity(b,all){
 const kind=b.kind||'game';if(b.active!==true)return null;
 if(['game','cloud','app'].includes(kind)){const item=all.find(g=>g.kind===kind&&g.id===String(b.game));return item?{kind,id:item.id,key:kind+':'+item.id}:null}
 if(kind==='movie'&&['movie','tv','anime'].includes(b.mediaType)&&/^[A-Za-z0-9_-]{1,80}$/.test(String(b.game||''))&&Number.isFinite(b.position)&&b.position>=0)return {kind,id:String(b.game),mediaType:b.mediaType,position:b.position,key:'movie:'+b.mediaType+':'+b.game+':'+(Number(b.season)||1)+':'+(Number(b.episode)||1)};
 return null;
}
export function advanceChallenges(p,{uid,body,all,now,config={}}){
 if(Number(p.lastAt)>now)return p;
 const activity=challengeActivity(body,all),session=/^[a-f0-9-]{36}$/.test(body.session||'')?body.session:null;
 let seconds=activity&&session&&p.lastActive&&p.lastActivityKey===activity.key&&p.lastChallengeSession===session&&now-p.lastAt<=35000?Math.min(20,Math.max(0,(now-p.lastAt)/1000)):0;
 if(activity?.kind==='movie'){const delta=activity.position-Number(p.lastMoviePosition);seconds=Number.isFinite(delta)&&delta>0&&delta<=(now-p.lastAt)/1000+5?Math.min(seconds,delta):0}
 if(needsChallengeReset(p,now,config.challengeVersion||0)){seconds=0;p.challenges=createChallenges(uid,all,now);startChallengeCycle(p,now);p.challengeVersion=config.challengeVersion||0;p.challengeRewardsVersion=CHALLENGE_REWARDS_VERSION}
 const multiplier=config.until>now?config.xpMultiplier||1:1,personal=p.multiplierUntil>now?p.multiplier||1:1;
 p.xp=Math.min(totalXP(2000),(Number(p.xp)||0)+seconds*100/60*Math.max(multiplier,personal));
 for(const c of p.challenges||[])if(activity&&!c.claimed&&(c.kind||'game')===activity.kind&&(activity.kind==='movie'?c.mediaTypes?.includes(activity.mediaType):String(c.id)===activity.id)){
  c.seconds=Math.min(c.minutes*60,(Number(c.seconds)||0)+seconds);if(c.seconds>=c.minutes*60){c.claimed=true;p.coins=(Number(p.coins)||0)+Math.round(c.reward*(config.until>now?config.coinMultiplier||1:1))}
 }
 p.activeSeconds=(Number(p.activeSeconds)||0)+seconds;p.lastAt=now;p.lastActive=!!activity;p.lastActivityKey=activity?.key||null;p.lastChallengeSession=session;p.lastMoviePosition=activity?.kind==='movie'?activity.position:null;return p;
}
