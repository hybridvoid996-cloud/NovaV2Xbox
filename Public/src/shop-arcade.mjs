// Nova Arcade v3: instant coin games on the fast server path (action 'arcadeFast').
// Every round is settled by the server; animations are short and start the moment you bet.
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
const fmt=n=>Math.round(n).toLocaleString();
const short=n=>n>=1e6?(n/1e6).toFixed(n%1e6?1:0)+'M':n>=1e3?(n/1e3).toFixed(n%1e3?1:0)+'K':String(n);
const reduced=()=>localStorage.getItem('nova_reduce_motion')==='true';
const wait=ms=>new Promise(r=>setTimeout(r,reduced()?0:ms));
// Frame-driven tween that always finishes: background tabs pause requestAnimationFrame, so a timer backs it up.
function tween(dur,frame){dur=reduced()?0:dur;return new Promise(res=>{const start=performance.now();let done=false;const finish=()=>{if(done)return;done=true;frame(1);res()};const step=t=>{if(done)return;const k=Math.min(1,(t-start)/Math.max(1,dur));frame(k);if(k<1)requestAnimationFrame(step);else finish()};requestAnimationFrame(step);setTimeout(finish,dur+80)})}

// Payout tables shown on screen (the server's copy in server/arcade-fast.mjs is authoritative).
const PLINKO={low:[9,3,1.6,1.3,1.1,1,.45,1,1.1,1.3,1.6,3,9],medium:[26,9,3.2,1.8,1.1,.7,.3,.7,1.1,1.8,3.2,9,26],high:[110,30,8,2,.6,.2,.2,.2,.6,2,8,30,110]};
const WHEEL={low:[1.5,1.2,1.2,1.2,1.5,0,1.2,1.2,0,1.5,1.2,1.2,1.2,1.5,0,1.2,1.2,0,1.5,0],medium:[0,1.5,0,2,0,1.5,0,3,0,1.5,0,2,0,1.5,0,2.7,0,1.7,0,2],high:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,19.4]};
const SLOT={star:'✦',moon:'☾',bolt:'⚡',gem:'◆',crown:'♛',nova:'N'};
const RED=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const multColor=m=>m>=10?'#ff5d8f':m>=3?'#ffb547':m>=1.5?'#5fd38a':m>=1?'#7fb6ff':'#3a3f4b';

export const ARCADE_GAMES=[
 {id:'plinko',name:'Plinko',icon:'●',tag:'Drop the ball · up to 110×'},
 {id:'slots',name:'Nova Slots',icon:'♛',tag:'Three reels · up to 1000×'},
 {id:'wheel',name:'Lucky Wheel',icon:'◎',tag:'Spin · up to 19.4×'},
 {id:'limbo',name:'Limbo',icon:'↗',tag:'Pick a target · 1.01–100×'},
 {id:'roulette',name:'Roulette',icon:'◉',tag:'Red, black or a number'},
 {id:'flip',name:'Coin Flip',icon:'◐',tag:'Heads or tails · 1.9×'},
 {id:'dice',name:'High / Low',icon:'⚄',tag:'1–3 or 4–6 · 1.9×'}
];

export function mountArcade(host,ctx,{request,onBalance}){
 const root=el('section','arc');
 const tabs=el('div','arc-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Arcade games');
 const board=el('div','arc-board'),controls=el('aside','arc-controls'),stage=el('div','arc-stage'),history=el('div','arc-history');
 history.setAttribute('aria-label','Your recent results');
 board.append(controls,stage);root.append(tabs,board,history);host.append(root);
 const state={game:localStorage.getItem('nova_arcade_game')||'plinko',bet:Number(localStorage.getItem('nova_arcade_bet'))||1000,risk:'medium',choice:'heads',dice:'high',pick:'color',color:'red',number:7,target:2,busy:false,used:0};
 if(!ARCADE_GAMES.some(g=>g.id===state.game))state.game='plinko';
 const balance=()=>Number(ctx.state.store?.coins)||0;

 // ---------- game tabs ----------
 function drawTabs(){tabs.replaceChildren(...ARCADE_GAMES.map(g=>{const b=el('button','arc-tab');b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(g.id===state.game));b.append(el('i','',g.icon),el('span','',g.name),el('small','',g.tag));b.onclick=()=>{if(state.busy)return;state.game=g.id;localStorage.setItem('nova_arcade_game',g.id);drawTabs();drawControls();drawStage()};return b}))}

 // ---------- controls ----------
 const betInput=el('input','arc-bet');betInput.type='number';betInput.min='100';betInput.max='5000000';betInput.step='100';betInput.setAttribute('aria-label','Bet amount in Nova Coins');
 const playBtn=el('button','arc-play');playBtn.type='button';
 const info=el('p','arc-info'),err=el('p','arc-err');err.setAttribute('role','alert');
 const setBet=v=>{state.bet=Math.max(100,Math.min(5000000,Math.floor(v)||100));betInput.value=String(state.bet);localStorage.setItem('nova_arcade_bet',String(state.bet));updateInfo()};
 betInput.oninput=()=>{state.bet=Math.floor(Number(betInput.value))||0;updateInfo()};betInput.onchange=()=>setBet(Number(betInput.value));
 function seg(label,options,key,onChange){const wrap=el('div','arc-field');wrap.append(el('label','',label));const row=el('div','arc-seg');for(const [v,t]of options){const b=el('button','',t);b.type='button';b.setAttribute('aria-pressed',String(state[key]===v));b.onclick=()=>{state[key]=v;row.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));onChange?.();updateInfo();drawStage()};row.append(b)}wrap.append(row);return wrap}
 function drawControls(){
  controls.replaceChildren();
  const betWrap=el('div','arc-field');betWrap.append(el('label','','Bet · Nova Coins'),betInput);
  const chips=el('div','arc-chips');for(const [label,fn]of [['½',()=>setBet(state.bet/2)],['2×',()=>setBet(state.bet*2)],['1K',()=>setBet(1000)],['10K',()=>setBet(10000)],['100K',()=>setBet(100000)],['Max',()=>setBet(Math.min(5000000,balance()))]]){const b=el('button','',label);b.type='button';b.onclick=fn;chips.append(b)}
  betWrap.append(chips);controls.append(betWrap);
  const g=state.game;
  if(g==='plinko'||g==='wheel')controls.append(seg('Risk',[['low','Low'],['medium','Medium'],['high','High']],'risk'));
  if(g==='flip')controls.append(seg('Your call',[['heads','Heads'],['tails','Tails']],'choice'));
  if(g==='dice')controls.append(seg('Your call',[['low','Low · 1–3'],['high','High · 4–6']],'dice'));
  if(g==='roulette'){controls.append(seg('Bet on',[['color','A color · 2×'],['number','A number · 36×']],'pick',drawControls));
   if(state.pick==='color')controls.append(seg('Color',[['red','Red'],['black','Black']],'color'));
   else{const w=el('div','arc-field');w.append(el('label','','Number 0–36'));const n=el('input','arc-bet');n.type='number';n.min='0';n.max='36';n.value=String(state.number);n.oninput=()=>{state.number=Math.max(0,Math.min(36,Math.floor(Number(n.value))||0));updateInfo()};w.append(n);controls.append(w)}}
  if(g==='limbo'){const w=el('div','arc-field');w.append(el('label','','Target multiplier'));const n=el('input','arc-bet');n.type='number';n.min='1.01';n.max='100';n.step='0.01';n.value=String(state.target);n.oninput=()=>{state.target=Math.max(1.01,Math.min(100,Math.round(Number(n.value)*100)/100||2));updateInfo()};const quick=el('div','arc-chips');for(const t of [1.5,2,3,5,10,50]){const b=el('button','',t+'×');b.type='button';b.onclick=()=>{state.target=t;n.value=String(t);updateInfo()};quick.append(b)}w.append(n,quick);controls.append(w)}
  controls.append(info,playBtn,err,el('p','arc-note','Nova Coins only · fair odds shown before you play · results come from the Nova server.'));
  betInput.value=String(state.bet);updateInfo();
 }
 function payoutLine(){const g=state.game;
  if(g==='flip'||g==='dice')return 'Win chance 50% · pays 1.9× ('+fmt(state.bet*1.9)+')';
  if(g==='roulette')return state.pick==='color'?'Win chance 48.6% · pays 2× ('+fmt(state.bet*2)+')':'Win chance 2.7% · pays 36× ('+fmt(state.bet*36)+')';
  if(g==='limbo')return 'Win chance '+Math.min(97,97/state.target).toFixed(2)+'% · pays '+state.target+'× ('+fmt(state.bet*state.target)+')';
  if(g==='plinko')return 'Max '+Math.max(...PLINKO[state.risk])+'× · 12 rows';
  if(g==='wheel')return 'Max '+Math.max(...WHEEL[state.risk])+'× · 20 segments';
  return 'Three of a kind pays up to 1000× · two ✦ pays 1.45×';}
 function updateInfo(){info.textContent=payoutLine();const ok=state.bet>=100&&state.bet<=5000000&&state.bet<=balance();playBtn.disabled=state.busy||!ok;playBtn.textContent=state.busy?'…':state.bet>balance()?'Not enough coins':'Bet '+short(state.bet);}

 // ---------- stages ----------
 let view={};
 function drawStage(){stage.replaceChildren();stage.dataset.game=state.game;view={};const g=state.game;
  const banner=el('div','arc-result');banner.setAttribute('aria-live','polite');view.banner=banner;
  if(g==='flip'){const coin=el('div','arc-coin');coin.append(el('span','front','N'),el('span','back','✦'));view.coin=coin;stage.append(coin)}
  if(g==='dice'){const die=el('div','arc-die','?');view.die=die;const scale=el('div','arc-scale');for(let i=1;i<=6;i++)scale.append(el('span',i<=3?'lo':'hi',String(i)));stage.append(die,scale)}
  if(g==='roulette'){const wheel=el('div','arc-roulette');const order=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26],step=360/37;wheel.style.background='conic-gradient('+order.map((n,i)=>(n===0?'#2e9e5b':RED.includes(n)?'#c0392b':'#1b1f27')+' '+(i*step)+'deg '+((i+1)*step)+'deg').join(',')+')';view.order=order;view.wheel=wheel;const hub=el('div','arc-roulette-hub','?');view.hub=hub;wheel.append(hub);stage.append(el('i','arc-pointer'),wheel)}
  if(g==='limbo'){const big=el('div','arc-limbo','1.00×');view.big=big;stage.append(big,el('small','arc-sub','Target '+state.target+'×'))}
  if(g==='wheel'){const t=WHEEL[state.risk],step=360/t.length;const w=el('div','arc-wheel');w.style.background='conic-gradient('+t.map((m,i)=>multColor(m)+' '+(i*step)+'deg '+((i+1)*step-.6)+'deg, #0b0c10 '+((i+1)*step-.6)+'deg '+((i+1)*step)+'deg').join(',')+')';for(const [i,m]of t.entries()){const lab=el('span','',m?m+'×':'');lab.style.transform='rotate('+(i*step+step/2)+'deg) translateY(-118px)';w.append(lab)}view.wheel=w;stage.append(el('i','arc-pointer'),w)}
  if(g==='slots'){const reels=el('div','arc-reels');view.reels=[0,1,2].map(()=>{const r=el('div','arc-reel');r.append(el('span','',SLOT.star));reels.append(r);return r});stage.append(reels,el('small','arc-sub','N N N 1000× · ♛ 100× · ◆ 40× · ⚡ 18× · ☾ 10× · ✦ 6×'))}
  if(g==='plinko'){const c=el('canvas','arc-plinko');c.width=520;c.height=420;view.canvas=c;stage.append(c);drawPlinko(c,null,0)}
  stage.append(banner);
 }
 function drawPlinko(c,path,progress){const x=c.getContext('2d'),W=c.width,H=c.height,rows=12,gap=W/(rows+3),top=30;x.clearRect(0,0,W,H);
  for(let r=0;r<rows;r++)for(let i=0;i<=r+2;i++){x.fillStyle='rgba(255,255,255,.75)';x.beginPath();x.arc(W/2+(i-(r+2)/2)*gap,top+r*gap*.92,3.4,0,7);x.fill()}
  const t=PLINKO[state.risk];const bw=gap*.94;t.forEach((m,i)=>{const cx=W/2+(i-6)*gap;x.fillStyle=multColor(m);x.beginPath();x.roundRect(cx-bw/2,top+rows*gap*.92,bw,26,6);x.fill();x.fillStyle=m>=1.5?'#111':'#fff';x.font='bold 11px Segoe UI';x.textAlign='center';x.fillText(m+'×',cx,top+rows*gap*.92+17)});
  if(path){const steps=Math.min(rows,Math.floor(progress));let col=0;for(let i=0;i<steps;i++)col+=path[i];const frac=progress-steps;const r=steps;const nextCol=col+(path[steps]??0);const px0=W/2+(col-r/2)*gap,px1=W/2+(nextCol-(r+1)/2)*gap;const py0=top+(r-1)*gap*.92,py1=top+r*gap*.92;const px=px0+(px1-px0)*frac,py=py0+(py1-py0)*frac-Math.sin(frac*Math.PI)*gap*.35;x.fillStyle='#ffd166';x.shadowColor='#ffd166';x.shadowBlur=14;x.beginPath();x.arc(steps>=rows?W/2+(col-6)*gap:px,steps>=rows?top+rows*gap*.92+12:py,8,0,7);x.fill();x.shadowBlur=0}}

 // ---------- play ----------
 async function play(){
  if(state.busy)return;const g=state.game;err.textContent='';
  if(state.bet<100||state.bet>5000000){err.textContent='Bet 100 to 5,000,000 Nova Coins.';return}
  if(state.bet>balance()){err.textContent='You don’t have enough Nova Coins.';return}
  state.busy=true;updateInfo();stage.classList.add('rolling');view.banner.className='arc-result';view.banner.textContent='';
  const spin=startSpin(g);
  const body={op:'play',game:g,coins:state.bet,requestId:crypto.randomUUID()};
  if(g==='plinko'||g==='wheel')body.risk=state.risk;if(g==='flip')body.choice=state.choice;if(g==='dice')body.choice=state.dice;
  if(g==='roulette'){body.pick=state.pick;if(state.pick==='color')body.color=state.color;else body.number=state.number}
  if(g==='limbo')body.target=state.target;
  try{
   const data=await request(ctx,'arcadeFast',body);const r=data.receipt;
   await land(g,r.outcome,spin);
   ctx.state.store&&(ctx.state.store.coins=data.coins);onBalance?.(data.coins);state.used=data.limit?.used||state.used;
   const net=r.payout-r.coins;view.banner.className='arc-result '+(r.won?'win':net===0?'even':'lose');
   view.banner.replaceChildren(el('b','',r.won?'+'+fmt(net):net===0?'Even':'−'+fmt(r.coins)),el('small','',(r.multiplier||0)+'× · balance '+fmt(data.coins)+(data.limit?' · '+data.limit.used+'/'+data.limit.max+' today':'')));
   addHistory(r);
  }catch(e){spin.stop?.();err.textContent=e.message||'The round could not complete.';view.banner.textContent=''}
  finally{state.busy=false;stage.classList.remove('rolling');updateInfo()}
 }
 function startSpin(g){
  const s={stop(){}};
  if(g==='dice'){let n=0;const t=setInterval(()=>{view.die.textContent=String(1+(n++%6))},55);s.stop=()=>clearInterval(t)}
  if(g==='slots'){const syms=Object.values(SLOT);const t=setInterval(()=>{for(const r of view.reels)if(!r.dataset.stop)r.firstChild.textContent=syms[Math.floor(Math.random()*syms.length)]},50);s.stop=()=>clearInterval(t)}
  if(g==='limbo'){view.big.className='arc-limbo';view.big.textContent='1.00×'}
  if(g==='flip')view.coin.classList.add('spin');
  if(g==='roulette'||g==='wheel'){view.wheel.style.transition='none';const cur=Number(view.wheel.dataset.rot||0)%360;view.wheel.style.transform='rotate('+cur+'deg)';void view.wheel.offsetWidth}
  return s;
 }
 async function land(g,o,spin){
  if(g==='flip'){const c=view.coin;c.classList.remove('spin');c.style.transform='rotateY('+(o.side==='heads'?0:180)+'deg)';await wait(250)}
  if(g==='dice'){spin.stop();view.die.textContent=String(o.number);view.die.className='arc-die '+(o.number<=3?'lo':'hi');await wait(120)}
  if(g==='roulette'||g==='wheel'){const count=g==='roulette'?37:WHEEL[state.risk].length,idx=g==='roulette'?view.order.indexOf(o.number):o.segment,step=360/count;const base=Number(view.wheel.dataset.rot||0);const target=base-base%360+720+(360-(idx*step+step/2));view.wheel.dataset.rot=String(target);view.wheel.style.transition=reduced()?'none':'transform .85s cubic-bezier(.12,.75,.18,1)';view.wheel.style.transform='rotate('+target+'deg)';if(g==='roulette'){view.hub.textContent=String(o.number);view.hub.dataset.color=o.color}await wait(860)}
  if(g==='slots'){for(const [i,r]of view.reels.entries()){await wait(i?140:80);r.dataset.stop='1';r.firstChild.textContent=SLOT[o.reels[i]];r.classList.add('landed')}spin.stop();await wait(100);for(const r of view.reels){delete r.dataset.stop;r.classList.remove('landed')}}
  if(g==='limbo'){const end=o.result;await tween(520,k=>{view.big.textContent=(1+(end-1)*(1-Math.pow(1-k,3))).toFixed(2)+'×'});view.big.className='arc-limbo '+(end>=o.target?'win':'lose')}
  if(g==='plinko'){await tween(640,k=>drawPlinko(view.canvas,o.path,k*12.999))}
 }
 function addHistory(r){const pill=el('span','arc-pill '+(r.won?'win':'lose'),(r.multiplier||0)+'×');pill.title=(r.won?'Won ':'Lost ')+fmt(Math.abs(r.payout-r.coins))+' · '+r.game;history.prepend(pill);while(history.children.length>14)history.lastChild.remove()}

 playBtn.onclick=play;
 root.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target.tagName!=='INPUT'){e.preventDefault();play()}});
 root.tabIndex=-1;
 drawTabs();drawControls();drawStage();
 // The store balance loads after the arcade appears (and changes from other games), so keep the button in sync.
 let lastBalance=balance();const sync=setInterval(()=>{if(!root.isConnected){clearInterval(sync);return}const b=balance();if(b!==lastBalance){lastBalance=b;updateInfo()}},500);
 addEventListener('nova-server-progress',e=>{if(Number.isSafeInteger(e.detail?.coins)&&ctx.state.store){ctx.state.store.coins=e.detail.coins;updateInfo()}});
 return {refresh:updateInfo};
}

// ---------- gambling leaderboard ----------
export function mountGambleBoard(host,ctx,{request}){
 const box=el('section','gb');const head=el('div','gb-head');head.append(el('small','eyebrow','ARCADE LEADERBOARD'),el('h2','','Who’s up, who’s down'));
 const tabs=el('div','gb-tabs'),list=el('ol','gb-list'),status=el('p','gb-status','Loading leaderboard…');
 const TABS=[['winners','Top winners','net'],['losers','Biggest losers','net'],['biggest','Biggest single win','biggestWin'],['active','Most wagered','wagered']];
 let data=null,tab='winners';
 function draw(){tabs.replaceChildren(...TABS.map(([id,label])=>{const b=el('button','',label);b.type='button';b.setAttribute('aria-pressed',String(id===tab));b.onclick=()=>{tab=id;draw()};return b}));
  list.replaceChildren();if(!data)return;const [,,field]=TABS.find(t=>t[0]===tab);const rows=data[tab]||[];status.textContent=rows.length?'':'No rounds yet. Be the first on the board.';
  rows.forEach((r,i)=>{const li=el('li','gb-row'+(i<3?' top'+(i+1):''));const av=el('span','gb-avatar',(r.name||'N')[0]);if(r.photo){const im=el('img');im.src=r.photo;im.alt='';im.loading='lazy';av.replaceChildren(im)}
   const dec=ctx.state.assets?.find(a=>a.id===r.decoration);if(dec){const im=el('img','gb-deco');im.src=dec.thumbnail||dec.src;im.alt='';av.append(im)}
   const name=el('strong','',r.name||'Nova member');if(r.nameRole){name.style.background='linear-gradient(90deg,'+r.nameRole.from+','+r.nameRole.to+')';name.style.backgroundClip='text';name.style.webkitBackgroundClip='text';name.style.color='transparent'}
   const v=r[field];const val=el('b',(field==='net'&&v<0)||tab==='losers'?'neg':'pos',(field==='net'?(v>=0?'+':'−'):'')+fmt(Math.abs(v)));
   const meta=el('small','',r.games+' games · '+fmt(r.wagered)+' wagered');
   li.append(el('span','gb-rank','#'+(i+1)),av,el('div','gb-who'),val);li.querySelector('.gb-who').append(name,meta);list.append(li)})}
 async function load(){try{data=await request(ctx,'arcadeFast',{op:'board'});draw()}catch(e){status.textContent='Leaderboard unavailable: '+(e.message||e)}}
 const refresh=el('button','gb-refresh','↻ Refresh');refresh.type='button';refresh.onclick=load;head.append(refresh);
 box.append(head,tabs,status,list);host.append(box);draw();load();
 return {load};
}
