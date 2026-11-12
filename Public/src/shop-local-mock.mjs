// Local-only fake shop server for testing the real shop page at /shop.html?preview=1 on localhost.
// Never loaded on a live site (shop-page.js only imports it for localhost + ?preview).
export function createLocalShop(assets){
 let coins=250000;const inventory={},credits={decoration:3,effect:3,banner:3};const recent=[];
 for(const kind of ['effect','decoration','banner']){for(const a of assets.filter(x=>x.kind===kind&&x.subtype!=='frame').slice(0,7))inventory[a.id]={count:1+(a.id.length%2)}}
 for(const f of assets.filter(a=>a.subtype==='frame').slice(0,4))inventory[f.id]={count:1};
 const P={low:[9,3,1.6,1.3,1.1,1,.45,1,1.1,1.3,1.6,3,9],medium:[26,9,3.2,1.8,1.1,.7,.3,.7,1.1,1.8,3.2,9,26],high:[110,30,8,2,.6,.2,.2,.2,.6,2,8,30,110]};
 const W={low:[1.5,1.2,1.2,1.2,1.5,0,1.2,1.2,0,1.5,1.2,1.2,1.2,1.5,0,1.2,1.2,0,1.5,0],medium:[0,1.5,0,2,0,1.5,0,3,0,1.5,0,2,0,1.5,0,2.7,0,1.7,0,2],high:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,19.4]};
 const RED=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
 const pause=ms=>new Promise(r=>setTimeout(r,ms));

 // Round games: same rules as server/shop-mines.mjs and server/shop-rounds.mjs.
 const mm=(m,p)=>{let q=1;for(let i=0;i<p;i++)q*=(25-m-i)/(25-i);return p?Math.min(3,Math.floor((1+Math.max(0,.97/q-1)*.35)*100)/100):1};
 const SAFE={easy:.85,normal:.75,hard:.6},cm=(d,s)=>s?Math.min(10,Math.floor(.97/Math.pow(SAFE[d],s)*100)/100):1,xm=ms=>Math.min(10,Math.max(1,Math.floor(Math.exp(Math.max(0,ms)/7000)*100)/100));
 let mr=null;const ar={};
 const take=n=>{if(!Number.isSafeInteger(n)||n<100||n>5000000)throw Error('Choose 100–5,000,000 Nova Coins.');if(n>coins)throw Error('You do not have enough Nova Coins.');coins-=n};
 const log=(game,r)=>recent.unshift({name:'You',game,stake:'coins',coins:r.stake,payout:r.payout,won:r.payout>r.stake,at:Date.now(),currentCoins:coins});
 function mines(b){
  const pub=()=>({ok:true,coins,round:mr&&{...mr,picks:[...mr.picks],multiplier:mm(mr.mines,mr.picks.length),nextMultiplier:mm(mr.mines,mr.picks.length+1),collect:Math.floor(mr.stake*mm(mr.mines,mr.picks.length))}});
  if(b.op==='status')return pub();
  const end=state=>{mr.state=state;mr.payout=state==='collected'?Math.floor(mr.stake*mm(mr.mines,mr.picks.length)):0;coins+=mr.payout;log('mines',mr)};
  if(b.op==='start'){if(mr?.state==='active')throw Error('Finish or collect your current Mines round first.');take(b.coins);mr={id:b.requestId,state:'active',mines:b.mines,stake:b.coins,picks:[],payout:0,hit:null};return pub()}
  if(!mr||mr.id!==b.roundId)throw Error('This round is no longer current. Reopen Mines.');if(mr.state!=='active')return pub();
  if(b.op==='reveal'){if(mr.picks.includes(b.tile))return pub();if(Math.floor(Math.random()*(25-mr.picks.length))<mr.mines){mr.hit=b.tile;end('lost')}else{mr.picks.push(b.tile);if(mr.picks.length===25-mr.mines||mm(mr.mines,mr.picks.length)>=3)end('collected')}}
  else if(b.op==='collect'){if(!mr.picks.length)throw Error('Reveal at least one gem before collecting.');end('collected')}
  return pub();
 }
 function arcade(b){
  const now=Date.now();let r=ar[b.game];
  const end=(state,m)=>{if(r.state!=='active')return;r.state=state;r.multiplier=m;r.payout=state==='collected'?Math.floor(r.stake*m):0;coins+=r.payout;log(b.game,r)};
  const settle=()=>{if(b.game!=='crash'||r?.state!=='active')return;const crashedAt=r.startedAt+Math.log(r.crashAt)*7000,targetAt=r.autoCashout?r.startedAt+Math.log(r.autoCashout)*7000:Infinity;if(targetAt<=crashedAt&&now>=targetAt)end('collected',r.autoCashout);else if(now>=crashedAt)end('lost',r.crashAt)};
  const pub=()=>{if(!r)return {ok:true,coins,serverNow:now,round:null};const m=r.state==='active'?(r.game==='crash'?xm(now-r.startedAt):cm(r.difficulty,r.steps)):r.multiplier||1;return {ok:true,coins,serverNow:now,round:{...r,crashAt:undefined,multiplier:m,nextMultiplier:r.game==='chicken'?cm(r.difficulty,r.steps+1):undefined,collect:Math.floor(r.stake*m)}}};
  settle();if(b.op==='status')return pub();
  if(b.op==='start'){if(r?.state==='active')throw Error('Finish your current round first.');take(b.coins);r=ar[b.game]={id:b.requestId,game:b.game,stake:b.coins,state:'active',steps:0,startedAt:now+(b.game==='crash'?1200:0),difficulty:b.game==='chicken'?b.difficulty:null,autoCashout:b.game==='crash'?b.autoCashout:0,crashAt:b.game==='crash'?Math.min(10,Math.max(1,Math.floor(.97/Math.max(1e-9,Math.random())*100)/100)):null,payout:0};return pub()}
  if(!r||r.id!==b.roundId)throw Error('This round is no longer current. Reopen the game.');if(r.state!=='active')return pub();
  if(b.op==='step'){if(b.step!==r.steps)throw Error('This step is no longer current.');if(Math.random()>=SAFE[r.difficulty])end('lost',cm(r.difficulty,r.steps));else{r.steps++;if(r.steps>=12||cm(r.difficulty,r.steps)>=10)end('collected',cm(r.difficulty,r.steps))}}
  else if(b.op==='collect'){if(r.game==='crash'&&now<r.startedAt)throw Error('Wait for takeoff before collecting.');if(r.game==='chicken'&&!r.steps)throw Error('Cross at least one lane before collecting.');end('collected',r.game==='crash'?xm(now-r.startedAt):cm(r.difficulty,r.steps))}
  return pub();
 }

 // Trading: a sample community feed and a partner who joins, offers and confirms on their own.
 const ids=Object.keys(inventory);const pick=(i,n=1)=>ids.length?{[ids[i%ids.length]]:n}:{};
 const feed=[
  {id:'t1',at:Date.now()-4*60e3,sender:{name:'Mara'},recipient:{name:'Theo'},give:{coins:25000,items:pick(0)},want:{items:pick(3,2)},counts:{W:6,F:3,L:1}},
  {id:'t2',at:Date.now()-52*60e3,sender:{name:'Jun'},recipient:{name:'Rosa'},give:{items:pick(7)},want:{coins:120000},counts:{W:1,F:2,L:9}},
  {id:'t3',at:Date.now()-5*3600e3,sender:{name:'Dez'},recipient:{name:'Kip'},give:{coins:5000},want:{items:pick(9)},counts:{}},
  {id:'t4',at:Date.now()-2*86400e3,sender:{name:'Ollie'},recipient:{name:'Mara'},give:{items:{...pick(12),...pick(14)}},want:{},counts:{F:4}}];
 const rooms={};
 function trade(b){
  if(b.op==='feed')return {feed:structuredClone(feed)};
  if(b.op==='vote'){const r=feed.find(x=>x.id===b.id);r.counts||={};if(r.vote)r.counts[r.vote]--;r.vote=r.vote===b.choice?null:b.choice;if(r.vote)r.counts[r.vote]=(r.counts[r.vote]||0)+1;return {counts:{...r.counts},vote:r.vote}}
  if(b.op==='liveList')return {rooms:Object.values(rooms).map(r=>structuredClone(r))};
  if(b.op==='liveInvite'){const id='room-'+b.to;const name=b.to.slice(2);rooms[id]={id,from:'preview',to:b.to,fromName:'You',toName:name,state:'invited',revision:0,offers:{preview:{coins:0,items:{}},[b.to]:{coins:0,items:{}}},confirmations:{},messages:{}};
   setTimeout(()=>{const r=rooms[id];if(r?.state!=='invited')return;r.state='open';r.revision++;r.offers[b.to]={coins:15000,items:pick(2)};r.messages.m1={uid:b.to,text:'hey! what do you think of this?',at:Date.now()}},1500);return {room:structuredClone(rooms[id])}}
  const r=rooms[b.id];if(!r)throw Error('That trade room is gone.');
  if(b.op==='liveStatus')return {room:structuredClone(r)};
  if(b.op==='liveCancel'){r.state='cancelled';return {room:structuredClone(r)}}
  if(b.op==='liveChat'){r.messages[b.requestId]={uid:'preview',text:b.text,at:Date.now()};return {room:structuredClone(r)}}
  if(b.op==='liveOffer'){if(b.revision!==r.revision)throw Error('The offer changed. Review it again.');r.offers.preview=b.offer;r.revision++;r.confirmations={};return {room:structuredClone(r)}}
  if(b.op==='liveConfirm'){r.confirmations.preview=r.revision;const other=r.to;setTimeout(()=>{if(r.state==='open'&&r.confirmations.preview===r.revision){r.confirmations[other]=r.revision;r.state='completed'}},1200);return {room:structuredClone(r)}}
  throw Error('Not available in the local preview.');
 }
 return async function shopRequest(action,b={}){
  await pause(60);
  if(action==='storeStatus')return {coins,inventory:structuredClone(inventory),crateCredits:{...credits},odds:[],halloween:{active:false},recentWagers:[],wagerActivity:recent.slice(0,12),dailyShop:null,hackPurchases:{},nitro:false};
  if(action==='equipCosmetic'){if(!inventory[b.id])throw Error('You don’t own that.');return {ok:true}}
  if(action==='unequipCosmetic')return {ok:true};
  if(action==='storePurchaseFeed')return {purchases:[]};
  if(action==='arcadeFast'){
   if(b.op==='board'){const row=(name,net,big,w,g)=>({uid:name,name,games:g,wagered:w,won:Math.max(0,net)+big,lost:Math.max(0,-net),net,biggestWin:big,photo:''});
    return {winners:[row('Mara',182400,90000,900000,61),row('Theo',64000,30000,400000,40),row('Jun',12500,8000,90000,22)],losers:[row('Dez',-240000,5000,700000,80),row('Kip',-51000,2000,120000,31),row('Ollie',-9000,1000,40000,12)],biggest:[row('Mara',182400,90000,900000,61),row('Rosa',4000,44000,60000,9)],active:[row('Mara',182400,90000,900000,61),row('Dez',-240000,5000,700000,80)]}}
   const R=Math.random,g=b.game;let m=0,o={};
   if(g==='flip'){o={side:R()<.5?'heads':'tails'};m=o.side===b.choice?1.9:0}
   if(g==='dice'){o={number:1+Math.floor(R()*6)};m=(o.number<=3?'low':'high')===b.choice?1.9:0}
   if(g==='roulette'){const n=Math.floor(R()*37);o={number:n,color:n===0?'green':RED.includes(n)?'red':'black'};m=b.pick==='color'?(o.color===b.color?2:0):(n===b.number?36:0)}
   if(g==='limbo'){const r=Math.max(1,Math.min(1000,Math.floor(.97/(1-R())*100)/100));o={result:r,target:b.target};m=r>=b.target?b.target:0}
   if(g==='plinko'){const path=Array.from({length:12},()=>R()<.5?0:1);const slot=path.reduce((a,c)=>a+c,0);o={path,slot,risk:b.risk};m=P[b.risk][slot]}
   if(g==='wheel'){const s=Math.floor(R()*20);o={segment:s,risk:b.risk};m=W[b.risk][s]}
   if(g==='slots'){const pool=['star','star','star','moon','moon','bolt','gem','crown','nova'];const reels=[0,1,2].map(()=>pool[Math.floor(R()*pool.length)]);const pay={star:6,moon:10,bolt:18,gem:40,crown:100,nova:1000};o={reels};m=reels[0]===reels[1]&&reels[1]===reels[2]?pay[reels[0]]:reels.filter(x=>x==='star').length===2?1.45:0}
   if(b.coins>coins)throw Error('You do not have enough Nova Coins.');
   const payout=Math.floor(b.coins*m);coins=coins-b.coins+payout;
   const receipt={game:g,stake:'coins',coins:b.coins,payout,multiplier:m,won:payout>b.coins,outcome:o,at:Date.now(),balance:coins};
   recent.unshift({name:'You',game:g,stake:'coins',coins:b.coins,payout,won:receipt.won,at:receipt.at,currentCoins:coins});
   return {ok:true,coins,limit:{used:recent.length,max:50},receipt};
  }
  if(action==='openCase'){const pool=assets.filter(a=>b.kind==='halloween'?a.collection==='halloween':a.kind===b.kind);const items=Array.from({length:b.count||1},()=>pool[Math.floor(Math.random()*pool.length)]);for(const it of items)inventory[it.id]={count:(inventory[it.id]?.count||0)+1};coins-=1000*(b.count||1);return {ok:true,coins,items,rewards:items,inventory:structuredClone(inventory)}}
  if(action==='chatDirectory')return {users:['Mara','Theo','Jun','Rosa','Dez','Kip'].map(n=>({uid:'u-'+n,name:n,photo:''})),next:null};
  if(action==='storeTrade')return trade(b);
  if(action==='storeMines')return mines(b);
  if(action==='storeArcade')return arcade(b);
  if(action==='storeGamble'){if(b.op==='status')return {round:null,coins};throw Error('Not available in the local preview.')}
  throw Error('Not available in the local preview: '+action);
 };
}
