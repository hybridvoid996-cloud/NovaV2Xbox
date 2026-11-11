import {COLORS,DRAW_VALUE,isWild,isDraw,needsTarget,playable} from './engine.mjs';

const BOT_NAMES=['Orbit','Pixel','Comet','Nebula','Vega','Quasar','Luna','Nova Bot','Astra','Zephyr'];
export function botNames(count,taken=[]){const pool=BOT_NAMES.filter(n=>!taken.includes(n));const out=[];while(out.length<count)out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]||'Bot '+(out.length+1));return out}

function bestColor(hand){
 const score={r:0,y:0,g:0,b:0};
 for(const c of hand)if(c.c!=='w')score[c.c]+=1+(/^\d$/.test(c.v)?0:.5);
 const best=Object.entries(score).sort((a,b)=>b[1]-a[1])[0];
 return best[1]>0?best[0]:COLORS[Math.floor(Math.random()*4)];
}

// Returns {type:'play',cardId,color,target} | {type:'draw'} | {type:'pass'}
export function chooseMove(s,p){
 const level=s.settings.botLevel;
 const options=playable(s,p);
 if(!options.length)return s.drawn?{type:'pass'}:{type:'draw'};
 if(level==='easy'&&Math.random()<.15&&!s.pending&&!s.drawn)return {type:'draw'};
 const me=s.players[p],n=s.players.length;
 const next=s.players[((p+s.dir)%n+n)%n];
 const leaderCards=Math.min(...s.players.filter((_,k)=>k!==p).map(x=>x.hand.length));
 const threat=next.hand.length<=2;
 const rank=card=>{
  let v=0;
  if(isWild(card))v-=level==='hard'?8:3;               // hold wilds for emergencies
  if(isDraw(card))v+=threat?12:2+DRAW_VALUE[card.v]/4;  // hit the next player hard when they are close
  if(['skip','rev','skipall'].includes(card.v))v+=threat?9:1;
  if(card.v==='discard')v+=1+me.hand.filter(c=>c.c===card.c).length*2;
  if(card.v==='swap'){const fewest=Math.min(...s.players.filter((_,k)=>k!==p).map(x=>x.hand.length));v+=me.hand.length-fewest>2?14:-10}
  if(/^\d$/.test(card.v))v+=Number(card.v)/3;            // dump high numbers first
  if(card.c===s.color)v+=1;
  if(level==='hard'&&leaderCards<=2&&isDraw(card))v+=6;
  return v+Math.random()*(level==='easy'?6:level==='normal'?2:.5);
 };
 const card=options.slice().sort((a,b)=>rank(b)-rank(a))[0];
 const rest=me.hand.filter(c=>c.id!==card.id);
 const move={type:'play',cardId:card.id};
 if(isWild(card))move.color=bestColor(rest);
 if(needsTarget(s,card)&&me.hand.length>1){
  let best=-1,fewest=Infinity;
  for(const [k,x]of s.players.entries())if(k!==p&&x.hand.length<fewest){fewest=x.hand.length;best=k}
  move.target=best;
 }
 return move;
}

// Bots occasionally forget to call FLIP! on easy/normal, and catch others.
export const botCallsFlip=level=>Math.random()<(level==='easy'?.6:level==='normal'?.85:.98);
export const botCatchDelay=level=>level==='hard'?900:level==='normal'?1700:2600;
