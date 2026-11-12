// Nova round games (Mines, Crash, Chicken Crossing): an in-page board that matches the Nova Arcade.
// Rules and payouts are decided by the server (storeMines / storeArcade); this file only draws them.
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
const fmt=n=>Number(n||0).toLocaleString('en-US');
const short=n=>n>=1e6?+(n/1e6).toFixed(2)+'M':n>=1e4?+(n/1e3).toFixed(1)+'K':fmt(n);
const store=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch{return null}};
const quiet=()=>document.documentElement.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;
export const minesMult=(mines,picks)=>{let p=1;for(let i=0;i<picks;i++)p*=(25-mines-i)/(25-i);return picks?Math.min(3,Math.floor((1+Math.max(0,.97/p-1)*.35)*100)/100):1};
export const SAFE={easy:.85,normal:.75,hard:.6};
export const chickenMult=(d,s)=>s?Math.min(10,Math.floor(.97/Math.pow(SAFE[d]||.75,s)*100)/100):1;
export const crashMult=ms=>Math.min(10,Math.max(1,Math.floor(Math.exp(Math.max(0,ms)/7000)*100)/100));
const LANES=12;

// ---------- original art ----------
const GEM='<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="rg-gem" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8fff0"/><stop offset=".45" stop-color="#3fe08f"/><stop offset="1" stop-color="#0b7d55"/></linearGradient></defs><path d="M20 10h24l12 14-24 32L8 24z" fill="url(#rg-gem)" stroke="#e9fff6" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 24h48M20 10l6 14 6-14 6 14 6-14M26 24l6 32 6-32" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="1.2" stroke-linejoin="round"/><path d="M14 22l6-8h6z" fill="#fff" opacity=".7"/></svg>';
const MINE='<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="rg-mine" cx=".35" cy=".3"><stop offset="0" stop-color="#6b6f7a"/><stop offset=".6" stop-color="#22252c"/><stop offset="1" stop-color="#0b0c0f"/></radialGradient></defs><g stroke="#2a2d34" stroke-width="5" stroke-linecap="round"><path d="M32 6v10M32 48v10M6 32h10M48 32h10M13.6 13.6l7 7M43.4 43.4l7 7M13.6 50.4l7-7M43.4 20.6l7-7"/></g><circle cx="32" cy="32" r="17" fill="url(#rg-mine)" stroke="#ff5d6c" stroke-width="1.5"/><circle cx="32" cy="32" r="5" fill="#ff5d6c"><animate attributeName="opacity" values="1;.35;1" dur=".8s" repeatCount="indefinite"/></circle><circle cx="25" cy="25" r="4" fill="#fff" opacity=".35"/></svg>';
const ROCKET='<svg viewBox="0 0 80 40" aria-hidden="true"><defs><linearGradient id="rg-rk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#aeb5c2"/></linearGradient></defs><path class="rg-flame" d="M14 20c-8-6-12-4-14 0 2 4 6 6 14 0z" fill="#ffb547"/><path d="M14 13h36c10 0 20 3 26 7-6 4-16 7-26 7H14z" fill="url(#rg-rk)" stroke="#fff" stroke-width="1"/><circle cx="52" cy="20" r="4.5" fill="#5fb8ff" stroke="#16324a" stroke-width="1.5"/><path d="M22 13l-8-9h10l8 9zM22 27l-8 9h10l8-9z" fill="#ff5d6c"/></svg>';
const CHICK='<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="58" rx="16" ry="4" fill="#000" opacity=".35"/><path d="M24 50l-3 6m3-6 2 6m14-6-2 6m2-6 3 6" stroke="#ff9a3c" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="32" cy="36" rx="18" ry="17" fill="#ffd84a"/><ellipse cx="27" cy="30" rx="9" ry="7" fill="#fff3a6" opacity=".7"/><path d="M15 38c-6-2-7 5-2 7 3 1 6-1 7-3" fill="#f5c22c"/><circle cx="38" cy="30" r="3" fill="#15171c"/><circle cx="39" cy="29" r="1" fill="#fff"/><path d="M47 33l9 3-9 3z" fill="#ff8a1f"/><path d="M28 18c2-6 6-6 7-1 2-4 6-3 5 2" fill="#ff5d6c"/><circle cx="43" cy="37" r="2.6" fill="#ff8f8f" opacity=".6"/></svg>';
const car=c=>'<svg viewBox="0 0 44 80" aria-hidden="true"><rect x="2" y="14" width="6" height="14" rx="2" fill="#0d0f13"/><rect x="36" y="14" width="6" height="14" rx="2" fill="#0d0f13"/><rect x="2" y="54" width="6" height="14" rx="2" fill="#0d0f13"/><rect x="36" y="54" width="6" height="14" rx="2" fill="#0d0f13"/><rect x="6" y="3" width="32" height="74" rx="11" fill="'+c+'"/><rect x="6" y="3" width="32" height="74" rx="11" fill="url(#rg-carshine)"/><path d="M11 50h22l-3 13H14zM12 22l3-8h14l3 8v6H12z" fill="#13161c" opacity=".85"/><path d="M10 74h7m10 0h7" stroke="#ffe9a6" stroke-width="3" stroke-linecap="round"/></svg>';
const CAR_COLORS=['#ff5d6c','#5fb8ff','#ffffff','#ffb547','#3fe08f','#aeb5c2'];

const GAMES=[
 {id:'mines',name:'Nova Mines',icon:'◆',sub:'Find gems · dodge mines',action:'storeMines'},
 {id:'crash',name:'Nova Crash',icon:'🚀',sub:'Cash out before it blows',action:'storeArcade'},
 {id:'chicken',name:'Chicken Crossing',icon:'🐤',sub:'Cross lanes · up to 10×',action:'storeArcade'}
];

export function mountRoundGames(host,ctx,{request,onBalance=()=>{},refresh=()=>Promise.resolve()}){
 const root=el('section','rg arc');host.append(root);
 const svgDefs=el('div');svgDefs.innerHTML='<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="rg-carshine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs></svg>';root.append(svgDefs.firstChild);
 const S={mines:{round:null,count:+store('nova_rg_mines')||3,loaded:false},crash:{round:null,auto:store('nova_rg_auto')??'2',offset:0,history:[],loaded:false},chicken:{round:null,difficulty:store('nova_rg_diff')||'normal',loaded:false}};
 const seq={mines:0,crash:0,chicken:0};
 let cur=GAMES.some(g=>g.id===store('nova_rg_game'))?store('nova_rg_game'):'mines',pending=null,retry=null,ticker=0,poller=0;

 // ---------- layout ----------
 const tabs=el('div','arc-tabs rg-tabs'),board=el('div','arc-board'),controls=el('div','arc-controls'),stage=el('div','arc-stage rg-stage');
 tabs.setAttribute('role','tablist');board.append(controls,stage);root.append(tabs,board);
 for(const g of GAMES){const t=el('button','arc-tab');t.type='button';t.dataset.game=g.id;t.setAttribute('role','tab');t.append(el('i','',g.icon),el('span','',g.name),el('small','',g.sub));t.onclick=()=>{if(pending)return;cur=g.id;store('nova_rg_game',cur);retry=null;err.textContent='';build()};tabs.append(t)}
 const bet=el('input','arc-bet');bet.type='number';bet.min=100;bet.max=5000000;bet.step=100;bet.inputMode='numeric';bet.value=store('nova_rg_bet')||'1000';bet.setAttribute('aria-label','Bet in Nova Coins');
 const coins=()=>Number(ctx.state.store?.coins)||0;
 const chips=el('div','arc-chips');
 for(const [label,fn]of [['½',v=>v/2],['2×',v=>v*2],['1K',()=>1000],['10K',()=>10000],['100K',()=>100000],['Max',()=>coins()]]){const b=el('button','',label);b.type='button';b.onclick=()=>{bet.value=String(Math.max(100,Math.min(5000000,Math.floor(fn(+bet.value||0)))));store('nova_rg_bet',bet.value);paint()};chips.append(b)}
 bet.oninput=()=>{store('nova_rg_bet',bet.value);paint()};
 const betField=el('div','arc-field');betField.append(el('label','','Bet · Nova Coins'),bet,chips);
 const opts=el('div','arc-field rg-opts'),info=el('p','arc-info'),err=el('p','arc-err'),alt=el('button','rg-alt'),main=el('button','arc-play'),note=el('p','arc-note','Nova Coins only · 100–5,000,000 per round · no daily limit. Closing the page keeps your round.');
 alt.type=main.type='button';err.setAttribute('role','alert');
 controls.append(betField,opts,info,err,alt,main,note);
 const result=el('div','arc-result');result.setAttribute('aria-live','polite');

 function setCoins(n){if(!Number.isSafeInteger(n))return;if(ctx.state.store)ctx.state.store.coins=n;onBalance(n);dispatchEvent(new CustomEvent('nova-server-progress',{detail:{coins:n}}))}
 function seg(values,current,onPick,disabled){const s=el('div','arc-seg');for(const [v,label]of values){const b=el('button','',label);b.type='button';b.setAttribute('aria-pressed',String(String(v)===String(current)));b.disabled=disabled;b.onclick=()=>{onPick(v);build()};s.append(b)}return s}
 function showResult(kind,big,small){result.className='arc-result '+kind;result.replaceChildren(el('b','',big),el('small','',small))}
 function clearResult(){result.className='arc-result';result.replaceChildren()}

 // ---------- server calls ----------
 const timeout=(p,ms=12000)=>{let t;return Promise.race([p,new Promise((_,r)=>{t=setTimeout(()=>r(Error('Connection interrupted. Press Retry to safely recover your round.')),ms)})]).finally(()=>clearTimeout(t))};
 async function call(game,body,{silent=false}={}){
  const g=GAMES.find(x=>x.id===game),turn=++seq[game];
  if(!silent){pending=body.op;err.textContent='';paint()}
  try{
   const data=await timeout(request(ctx,g.action,game==='mines'?body:{game,...body}));
   if(!data?.ok)throw Error('Round could not be verified. Press Retry.');
   if(turn!==seq[game])return;
   const before=S[game].round;S[game].round=data.round||null;S[game].loaded=true;
   if(data.serverNow)S[game].offset=data.serverNow-Date.now();
   setCoins(data.coins);if(!silent)retry=null;
   if(before?.state==='active'&&data.round&&data.round.state!=='active')finished(game,data.round);
   else if(body.op==='start')clearResult();
  }catch(e){
   if(silent)return;
   err.textContent=e.message||'Something went wrong.';
   if(body.op!=='status'&&(!e.status||e.status>=500))retry={game,body};
  }finally{if(!silent)pending=null;if(game===cur)paint()}
 }
 function act(op,extra={}){
  if(pending||retry)return;
  const r=S[cur].round;
  if(op==='start'){const v=+bet.value;if(!Number.isSafeInteger(v)||v<100||v>5000000){err.textContent='Choose 100–5,000,000 whole Nova Coins.';return}if(v>coins()){err.textContent='You do not have enough Nova Coins.';return}}
  const body={op,requestId:crypto.randomUUID(),...extra};
  if(op!=='start')body.roundId=r?.id;
  if(op==='start'){body.coins=+bet.value;if(cur==='mines')body.mines=S.mines.count;if(cur==='crash'){const a=Number(S.crash.auto)||0;body.autoCashout=a?Math.round(a*100)/100:0}if(cur==='chicken')body.difficulty=S.chicken.difficulty}
  call(cur,body);
 }
 function finished(game,r){
  const won=r.state==='collected'&&r.payout>0,net=(r.payout||0)-r.stake;
  if(game==='crash')S.crash.history=[{m:r.multiplier,won},...S.crash.history].slice(0,10);
  if(game===cur){
   if(won)showResult(net>=0?'win':'even',(net>=0?'+':'−')+fmt(Math.abs(net)),'Cashed out at '+Number(r.multiplier||1).toFixed(2)+'× · '+fmt(r.payout)+' coins');
   else showResult('lose','−'+fmt(r.stake),game==='mines'?'Boom. You hit a mine.':game==='crash'?'Crashed at '+Number(r.multiplier||1).toFixed(2)+'×':'Hit on lane '+((r.steps||0)+1));
  }
  refresh().catch(()=>{});
 }

 // ---------- per-game stages ----------
 let view={};
 function buildMines(){
  const hud=el('div','rg-hud'),grid=el('div','rg-mines');
  const stat=(k)=>{const s=el('div','rg-stat');s.append(el('small','',k),el('b','','—'));hud.append(s);return s.lastChild};
  view={mult:stat('Multiplier'),next:stat('Next gem'),gems:stat('Gems found'),grid,tiles:[]};
  for(let i=0;i<25;i++){const t=el('button','rg-tile');t.type='button';t.setAttribute('aria-label','Tile '+(i+1));t.append(el('span','rg-face'));t.onclick=()=>{const r=S.mines.round;if(r?.state!=='active'||pending||retry||r.picks?.includes(i))return;view.probe=i;act('reveal',{tile:i})};grid.append(t);view.tiles.push(t)}
  stage.append(hud,grid);
 }
 function paintMines(){
  const r=S.mines.round,active=r?.state==='active',picks=r?.picks||[];
  view.mult.textContent=r?.state==='lost'?'Busted':(r?Number(r.multiplier||1):1).toFixed(2)+'×';
  view.next.textContent=active||!r?minesMult(r?.mines||S.mines.count,picks.length+1).toFixed(2)+'×':'—';
  view.gems.textContent=picks.length+' / '+(25-(r?.mines||S.mines.count));
  view.grid.classList.toggle('over',!!r&&!active);view.grid.classList.toggle('live',active);
  view.tiles.forEach((t,i)=>{const s=r&&r.hit===i?'boom':picks.includes(i)?'gem':pending==='reveal'&&view.probe===i?'probe':'';
   if(t.dataset.s!==s){t.dataset.s=s;t.className='rg-tile'+(s?' '+s:'');t.firstChild.innerHTML=s==='gem'?GEM:s==='boom'?MINE:''}
   t.disabled=!active||!!pending||!!retry||picks.includes(i)});
 }
 function buildCrash(){
  const hist=el('div','rg-crash-hist'),wrap=el('div','rg-crash'),big=el('div','rg-crash-mult','1.00×'),msg=el('small','rg-crash-msg','Place a bet to launch');
  wrap.innerHTML='<svg viewBox="0 0 600 320" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="rg-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><g class="rg-grid"></g><path class="rg-area" fill="url(#rg-area)"/><path class="rg-line" fill="none"/></svg>';
  const g=wrap.querySelector('.rg-grid');for(let i=1;i<5;i++)g.insertAdjacentHTML('beforeend','<path d="M0 '+(i*64)+'H600"/><path d="M'+(i*120)+' 0V320"/>');
  const rocket=el('div','rg-rocket');rocket.innerHTML=ROCKET;const center=el('div','rg-crash-center');center.append(big,msg);wrap.append(rocket,center);
  view={hist,wrap,big,msg,rocket,line:wrap.querySelector('.rg-line'),area:wrap.querySelector('.rg-area')};stage.append(hist,wrap);
 }
 function drawCurve(m,elapsed){
  const T=Math.max(9000,elapsed*1.12),top=Math.max(2,m*1.18),X=t=>20+t/T*560,Y=v=>300-(v-1)/(top-1)*270;
  let d='M20 300';const n=28;for(let i=1;i<=n;i++){const t=elapsed*i/n;d+=' L'+X(t).toFixed(1)+' '+Y(crashMult(t)).toFixed(1)}
  const x=X(elapsed),y=Y(m),px=X(elapsed*.94),py=Y(crashMult(elapsed*.94));
  view.line.setAttribute('d',d);view.area.setAttribute('d',d+' L'+x.toFixed(1)+' 300Z');
  const ang=elapsed>0?Math.atan2((py-y)*(view.wrap.clientHeight/320),(x-px)*(view.wrap.clientWidth/600))*-180/Math.PI:0;
  view.rocket.style.left=(x/6)+'%';view.rocket.style.top=(y/3.2)+'%';view.rocket.style.transform='translate(-60%,-50%) rotate('+Math.max(-70,Math.min(0,ang))+'deg)';
 }
 function paintCrash(){
  const r=S.crash.round,active=r?.state==='active';
  view.hist.replaceChildren(...S.crash.history.map(h=>el('span','arc-pill '+(h.won?'win':'lose'),h.m.toFixed(2)+'×')));
  view.wrap.classList.toggle('live',active);view.wrap.classList.toggle('boom',r?.state==='lost');view.wrap.classList.toggle('cashed',r?.state==='collected');
  if(!active){const m=Number(r?.multiplier||1);view.big.textContent=m.toFixed(2)+'×';view.msg.textContent=!r?'Place a bet to launch':r.state==='lost'?'CRASHED':'CASHED OUT · '+fmt(r.payout);drawCurve(m,r?Math.log(Math.max(1,m))*7000:0)}
 }
 function tickCrash(){
  const r=S.crash.round;if(cur!=='crash'||r?.state!=='active')return;
  const elapsed=Date.now()+S.crash.offset-r.startedAt,m=crashMult(elapsed);
  if(elapsed<0){view.big.textContent='1.00×';view.msg.textContent='Launching in '+(Math.ceil(-elapsed/100)/10).toFixed(1)+'s';drawCurve(1,0)}
  else{view.big.textContent=m.toFixed(2)+'×';view.msg.textContent=r.autoCashout?'Auto cash out at '+Number(r.autoCashout).toFixed(2)+'×':'Cash out any time';drawCurve(m,elapsed)}
  if(!pending&&!retry){main.textContent=elapsed<0?'Launching…':'Cash out · '+short(Math.floor(r.stake*m));main.disabled=elapsed<0}
 }
 function buildChicken(){
  const road=el('div','rg-road'),track=el('div','rg-track'),chick=el('div','rg-chick');chick.innerHTML=CHICK;
  const start=el('div','rg-curb rg-start');start.append(el('small','','START'));track.append(start);
  const lanes=[];for(let i=0;i<LANES;i++){const lane=el('div','rg-lane');const c=el('div','rg-car');c.innerHTML=car(CAR_COLORS[i%CAR_COLORS.length]);lane.style.setProperty('--d',(1.1+((i*37)%9)/10)+'s');lane.style.setProperty('--dl',(-((i*53)%17)/10)+'s');lane.append(c,el('b','rg-lane-mult'),el('small','rg-lane-no',String(i+1)),el('i','rg-cone'));track.append(lane);lanes.push(lane)}
  const end=el('div','rg-curb rg-end');end.append(el('small','','10×'));track.append(end,chick);road.append(track);
  const hud=el('div','rg-hud');const stat=k=>{const s=el('div','rg-stat');s.append(el('small','',k),el('b','','—'));hud.append(s);return s.lastChild};
  view={road,track,chick,lanes,mult:stat('Multiplier'),next:stat('Next lane'),risk:stat('Safe chance')};stage.append(hud,road);
 }
 function paintChicken(){
  const r=S.chicken.round,active=r?.state==='active',d=r?.difficulty||S.chicken.difficulty,steps=r?.steps||0,lost=r?.state==='lost';
  view.lanes.forEach((lane,i)=>{lane.querySelector('.rg-lane-mult').textContent=chickenMult(d,i+1).toFixed(2)+'×';lane.className='rg-lane'+(i<steps?' crossed':'')+(active&&i===steps?' next':'')+(lost&&i===steps?' hit':'')});
  const pos=lost?steps+1:steps,W=view.lanes[0]?.offsetWidth||96;
  view.chick.style.left=(pos*W+W/2)+'px';view.chick.className='rg-chick'+(lost?' splat':'')+(r?.state==='collected'?' safe':'');
  const shift=Math.max(0,Math.min(pos*W-W*1.5,(LANES+2)*W-view.road.clientWidth));view.track.style.transform='translateX('+(-shift)+'px)';
  view.mult.textContent=lost?'Busted':(r?Number(r.multiplier||1):1).toFixed(2)+'×';view.next.textContent=active||!r?chickenMult(d,steps+1).toFixed(2)+'×':'—';view.risk.textContent=Math.round(SAFE[d]*100)+'% per lane';
  if(Number(view.chick.dataset.steps)!==steps&&!quiet()){view.chick.animate([{translate:'-50% 0'},{translate:'-50% -26px'},{translate:'-50% 0'}],{duration:320,easing:'cubic-bezier(.3,1.6,.6,1)'})}view.chick.dataset.steps=steps;
 }

 // ---------- build + paint ----------
 function build(){
  for(const t of tabs.children)t.setAttribute('aria-selected',String(t.dataset.game===cur));
  stage.replaceChildren();stage.dataset.game=cur;clearResult();
  if(cur==='mines')buildMines();else if(cur==='crash')buildCrash();else buildChicken();
  stage.append(result);
  if(!S[cur].loaded)call(cur,{op:'status'},{silent:true});
  paint();
 }
 function paint(){
  const r=S[cur].round,active=r?.state==='active',busy=!!pending;
  for(const t of tabs.children)t.disabled=busy;
  bet.disabled=chips.disabled=active||busy;for(const b of chips.children)b.disabled=active||busy;
  opts.replaceChildren();
  if(cur==='mines'){opts.append(el('label','','Mines on the board'),seg([[1,'1'],[3,'3'],[5,'5'],[10,'10'],[15,'15'],[20,'20']],r&&active?r.mines:S.mines.count,v=>{S.mines.count=v;store('nova_rg_mines',v)},active||busy));info.textContent='First gem pays '+minesMult(S.mines.count,1).toFixed(2)+'× · cashes out automatically at 3.00×.'}
  if(cur==='crash'){const a=el('input','arc-bet rg-auto');a.type='number';a.min=0;a.max=10;a.step=.1;a.value=S.crash.auto;a.disabled=active||busy;a.setAttribute('aria-label','Auto cash out multiplier, 0 for off');a.onchange=()=>{let v=Number(a.value)||0;v=v&&Math.min(10,Math.max(1.1,Math.round(v*100)/100));S.crash.auto=String(v);store('nova_rg_auto',S.crash.auto);a.value=S.crash.auto};
   opts.append(el('label','','Auto cash out (0 = off)'),a,seg([[0,'Off'],[1.5,'1.5×'],[2,'2×'],[3,'3×'],[5,'5×']],S.crash.auto,v=>{S.crash.auto=String(v);store('nova_rg_auto',S.crash.auto)},active||busy));info.textContent='The multiplier climbs on Nova’s clock up to 10×. Cash out before the crash.'}
  if(cur==='chicken'){opts.append(el('label','','Road difficulty'),seg([['easy','Easy'],['normal','Normal'],['hard','Hard']],r&&active?r.difficulty:S.chicken.difficulty,v=>{S.chicken.difficulty=v;store('nova_rg_diff',v)},active||busy));const d=S.chicken.difficulty;info.textContent=Math.round(SAFE[d]*100)+'% safe per lane · lane 1 pays '+chickenMult(d,1).toFixed(2)+'× · 12 lanes, max 10×.'}
  // buttons
  alt.hidden=true;
  if(retry&&retry.game===cur){main.textContent=busy?'Retrying…':'Retry';main.disabled=busy;main.onclick=()=>{const x=retry;retry=null;call(x.game,x.body)};}
  else if(!active){main.textContent=busy?'Starting…':(r?'Play again · ':'Bet ')+short(+bet.value||0);main.disabled=busy||!S[cur].loaded;main.onclick=()=>act('start')}
  else{
   const canCash=cur==='mines'?(r.picks?.length>0):cur==='chicken'?r.steps>0:true;
   main.textContent=busy&&pending==='collect'?'Cashing out…':'Cash out · '+short(r.collect||0);main.disabled=busy||!canCash;main.onclick=()=>act('collect');
   if(cur==='chicken'){alt.hidden=false;alt.textContent=busy&&pending==='step'?'Crossing…':'Cross lane '+(r.steps+1)+' → '+Number(r.nextMultiplier||chickenMult(r.difficulty,r.steps+1)).toFixed(2)+'×';alt.disabled=busy;alt.onclick=()=>act('step',{step:r.steps})}
   if(cur==='mines'){alt.hidden=false;alt.textContent='Pick a random tile';alt.disabled=busy;alt.onclick=()=>{const free=[...Array(25).keys()].filter(i=>!r.picks?.includes(i));const i=free[Math.floor(Math.random()*free.length)];view.probe=i;act('reveal',{tile:i})}}
  }
  stage.classList.toggle('rolling',busy);
  if(cur==='mines')paintMines();else if(cur==='crash'){paintCrash();tickCrash()}else paintChicken();
  // crash clock + server polling (detects the crash / auto cash out)
  clearInterval(ticker);clearInterval(poller);
  if(cur==='crash'&&S.crash.round?.state==='active'){ticker=setInterval(()=>{if(!root.isConnected)return clearInterval(ticker);tickCrash()},40);poller=setInterval(()=>{if(!root.isConnected)return clearInterval(poller);if(!pending&&!retry&&!document.hidden)call('crash',{op:'status'},{silent:true})},900)}
 }
 addEventListener('resize',()=>{if(root.isConnected&&cur==='chicken')paintChicken()});
 build();
 return {refresh:()=>{for(const g of GAMES)S[g.id].loaded=false;build()}};
}
