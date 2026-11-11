import {connect,nova,identity,surface,refreshCoins,watchFriends,control,profileOf} from './nova.mjs';
import {createGame,canPlay,needsTarget,isWild,COLOR_NAMES,LABELS,cleanSettings,DEFAULT_SETTINGS,COLORS} from './engine.mjs';
import {HostedGame} from './session.mjs';
import {botNames} from './bot.mjs';
import {cardEl,colorHex} from './cards.mjs';
import {sfx,setSound} from './sound.mjs';
import {Room,watchLobbies,sendInvite,watchInvites,clearInvite,cleanCode,MAX_PLAYERS} from './online.mjs';

// ---------- tiny DOM helper ----------
function h(tag,props={},...kids){
 const el=document.createElement(tag);
 for(const [k,v]of Object.entries(props||{})){
  if(v==null||v===false)continue;
  if(k==='class')el.className=v;else if(k==='style'&&typeof v==='object'){for(const [p,val]of Object.entries(v))if(p.startsWith('--'))el.style.setProperty(p,val);else el.style[p]=val}
  else if(k.startsWith('on'))el.addEventListener(k.slice(2),v);else if(k==='html')el.innerHTML=v;
  else el.setAttribute(k,v===true?'':v);
 }
 for(const kid of kids.flat())if(kid!=null&&kid!==false)el.append(kid.nodeType?kid:document.createTextNode(String(kid)));
 return el;
}
const svg=d=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('aria-hidden','true');s.innerHTML=d;return s};
const ICON={
 back:'<path d="M15 18 9 12l6-6"/>',home:'<path d="M3 11 12 3l9 8M5 9.5V21h14V9.5"/>',
 solo:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 online:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
 star:'<path d="M12 2.5 14.6 9.4 21.5 12l-6.9 2.6L12 21.5l-2.6-6.9L2.5 12l6.9-2.6Z"/>',
 sound:'<path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
 mute:'<path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/>',
 copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',bot:'<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 17h6"/>',
 send:'<path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z"/>',door:'<path d="M14 3h5v18h-5M10 17l5-5-5-5M15 12H3"/>',
 arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 easy:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
 normal:'<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
 hard:'<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-4 5-4 7-1-1-2-2-2-4-2 2-3 5-3 9 0 4 3 7 7 7Z"/>',
 hand:'<rect x="3" y="6" width="10" height="14" rx="2" transform="rotate(-12 8 13)"/><rect x="11" y="4" width="10" height="14" rx="2" transform="rotate(8 16 11)"/>',
 stack:'<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17 9 5 9-5" opacity=".6"/>',
 chaos:'<path d="M12 2.5 14.6 9.4 21.5 12l-6.9 2.6L12 21.5l-2.6-6.9L2.5 12l6.9-2.6Z"/>',
 swap:'<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
 draw:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M12 8v8M8 12h8"/>',
 timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
 motion:'<path d="M3 12h4l3-8 4 16 3-8h4"/>'
};
const icon=n=>svg(ICON[n]);
const app=document.getElementById('app'),sky=document.querySelector('.nf-sky');
const fmt=n=>Number(n||0).toLocaleString();

// ---------- preferences ----------
const PREF_KEY='novaflip-prefs';
let prefs={settings:{...DEFAULT_SETTINGS},players:4,sound:true,reduced:false};
try{const saved=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');prefs={...prefs,...saved,settings:cleanSettings({...prefs.settings,...saved.settings})}}catch{}
const savePrefs=()=>{try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}catch{}};
setSound(prefs.sound);document.documentElement.classList.toggle('nf-reduced',!!prefs.reduced);

let localStats={wins:0,games:0,points:0};
try{localStats={...localStats,...JSON.parse(localStorage.getItem('novaflip-local-stats')||'{}')}}catch{}
const saveLocal=()=>{try{localStorage.setItem('novaflip-local-stats',JSON.stringify(localStats))}catch{}};

// ---------- toasts ----------
const toasts=h('div',{class:'nf-toasts','aria-live':'polite'});document.body.append(toasts);
function toast(text,{error=false,action,actionLabel,icon:ic,timeout=4500}={}){
 const t=h('div',{class:'nf-toast'+(error?' err':''),role:'status'},ic||null,h('span',{style:{flex:'1'}},text));
 if(action)t.append(h('button',{class:'nf-btn sm primary',onclick:()=>{t.remove();action()}},actionLabel||'Open'));
 t.append(h('button',{class:'nf-btn sm','aria-label':'Dismiss',onclick:()=>t.remove()},'×'));
 toasts.append(t);if(timeout)setTimeout(()=>t.remove(),timeout);if(error)sfx.bad();
 return t;
}
const fail=e=>toast(e?.message||String(e),{error:true});

// ---------- shared chrome ----------
let cleanup=[];
const onCleanup=fn=>cleanup.push(fn);
function screen(...nodes){for(const fn of cleanup.splice(0))try{fn()}catch{}document.body.classList.remove('nf-in-game');closeModal();app.replaceChildren(...nodes);app.scrollTop=0}
function wallet(){
 const coins=h('span',{class:'nf-pill',title:'Nova Coins'},h('i',{class:'coin'}),h('span',{},nova.coins==null?'—':fmt(nova.coins)));
 const pts=h('span',{class:'nf-pill',title:'Nova Flip points'},h('span',{class:'pts'},'✦'),h('span',{},fmt(nova.stats?.points??localStats.points)+' pts'));
 const paint=()=>{coins.lastChild.textContent=nova.coins==null?'—':fmt(nova.coins);pts.lastChild.textContent=fmt(nova.stats?.points??localStats.points)+' pts'};
 addEventListener('nf-wallet',paint);onCleanup(()=>removeEventListener('nf-wallet',paint));
 return [coins,pts];
}
function topBar({back,title,extra=[]}={}){
 const left=back?h('button',{class:'nf-icon-btn','aria-label':'Back',onclick:()=>{sfx.click();back()}},icon('back')):h('button',{class:'nf-icon-btn','aria-label':'Back to Nova',title:'Back to Nova',onclick:exitToNova},icon('home'));
 const chip=h('div',{class:'nf-chip',title:nova.signedIn?'Signed in to Nova':'Playing as a guest'},identity(nova.profile,{size:'sm'}));
 const soundBtn=h('button',{class:'nf-icon-btn','aria-label':prefs.sound?'Mute sounds':'Unmute sounds',onclick:()=>{prefs.sound=!prefs.sound;setSound(prefs.sound);savePrefs();soundBtn.replaceChildren(icon(prefs.sound?'sound':'mute'))}},icon(prefs.sound?'sound':'mute'));
 return h('div',{class:'nf-top'},left,title?h('b',{class:'nf-top-title'},title):null,h('div',{class:'spacer'}),...extra,...wallet(),soundBtn,chip);
}
function exitToNova(){if(parent!==window)parent.postMessage({novaAction:'closeApp'},location.origin);else location.href='/home.html'}

// ---------- modal ----------
let modal;
function closeModal(){modal?.remove();modal=null}
function openModal(content,{dismissable=true}={}){
 closeModal();modal=h('div',{class:'nf-modal',onclick:e=>{if(dismissable&&e.target===modal)closeModal()}},content);
 document.body.append(modal);requestAnimationFrame(()=>content.querySelector('button,input')?.focus());return modal;
}
addEventListener('keydown',e=>{if(e.key==='Escape'&&modal&&!modal.dataset.locked)closeModal()});

// ---------- floating background cards ----------
function floaters(){
 const box=h('div',{class:'nf-floaters'});
 const picks=[{c:'r',v:'7'},{c:'b',v:'rev'},{c:'w',v:'w16'},{c:'g',v:'skip'},{c:'y',v:'d2'},{c:'w',v:'swap'},{c:'b',v:'3'},{c:'r',v:'skipall'}];
 picks.forEach((card,i)=>{const el=cardEl({...card,id:'f'+i});el.style.left=(6+i*12)%92+'%';el.style.top=(10+(i*37)%75)+'%';el.style.setProperty('--rot',(i%2?-1:1)*(10+i*7)+'deg');el.style.animationDelay=-i*2.7+'s';box.append(el)});
 sky.append(box);
}

// =====================================================================
// MENU
// =====================================================================
// 3D tilt + glare + rainbow edge, following the pointer.
function tilt(el,max=9){
 el.classList.add('nf-tilt');el.append(h('span',{class:'nf-ring','aria-hidden':'true'}),h('span',{class:'nf-glare','aria-hidden':'true'}));
 if(prefs.reduced||matchMedia('(pointer:coarse)').matches)return el;
 el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;el.classList.add('tilting');el.style.setProperty('--ry',((x-.5)*max*2).toFixed(2)+'deg');el.style.setProperty('--rx',((.5-y)*max*2).toFixed(2)+'deg');el.style.setProperty('--gx',x*100+'%');el.style.setProperty('--gy',y*100+'%')});
 el.addEventListener('pointerleave',()=>{el.classList.remove('tilting');el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg')});
 return el;
}
function bigButton(label,sub,ic,tint,onclick){return tilt(h('button',{class:'nf-big',style:{'--tint':tint},onclick:()=>{sfx.click();onclick()}},h('span',{class:'ico'},icon(ic)),h('span',{class:'txt'},label,h('small',{},sub)),h('span',{class:'arrow'},icon('arrow'))),6)}
function logo(){
 const stack=h('div',{class:'stack'},cardEl({c:'r',v:'7',id:'l1'}),cardEl({c:'y',v:'rev',id:'l2'}),cardEl({c:'w',v:'w16',id:'l3'}),cardEl({c:'b',v:'d2',id:'l4'}));
 return h('div',{class:'nf-logo',role:'img','aria-label':'Nova Flip'},h('div',{class:'orbit'}),stack,h('div',{class:'nf-wordmark'},h('small',{},'NOVA'),h('b',{},'FL',h('i',{},'I'),'P')));
}
function profileCard(){
 const s=nova.stats||{},wins=s.wins??localStats.wins,games=s.games??localStats.games,points=s.points??localStats.points;
 const card=h('section',{class:'nf-profile','aria-label':'Your Nova profile'});
 const body=h('div',{class:'nf-profile-body'},identity(nova.profile,{size:'lg'}),
  h('div',{class:'nf-stats'},h('div',{class:'nf-stat'},h('b',{},fmt(wins)),h('small',{},'Wins')),h('div',{class:'nf-stat'},h('b',{},fmt(games)),h('small',{},'Games')),h('div',{class:'nf-stat'},h('b',{},fmt(points)),h('small',{},'Points'))));
 if(nova.signedIn){
  const limit=s.dailyLimit||15,today=s.dayWins||0;
  body.append(h('div',{},h('p',{class:'nf-note'},'Every win pays 1,000+ Nova Coins · '+today+'/'+limit+' coin wins today'),h('div',{class:'nf-progress',style:{marginTop:'8px'}},h('i',{style:{width:Math.min(100,today/limit*100)+'%'}}))));
 }else body.append(h('p',{class:'nf-note'},'Playing as a guest. Sign in to Nova to use your username, earn Nova Coins and play online with friends.'));
 card.append(body);surface(card,nova.profile);
 return card;
}
function showMenu(){
 screen(topBar(),h('main',{class:'nf-menu'},
  h('div',{class:'nf-brand'},logo(),h('p',{class:'nf-tagline'},'Match colors, stack draws, swap hands and call UNO! before anyone catches you.'),
   h('nav',{class:'nf-buttons','aria-label':'Main menu'},
    bigButton('Single Player','2–4 players vs Nova bots','solo','#ff4b6e',showSingle),
    bigButton('Online','Rooms, codes & friends','online','#3f8cff',()=>nova.signedIn?showOnline():toast('Sign in to Nova to play online.',{error:true})),
    bigButton('Settings','House rules, sound & motion','gear','#f5a70f',showSettings),
    bigButton('Credits','Who made Nova Flip','star','#16c58a',showCredits))),
  profileCard()));
}

// =====================================================================
// SINGLE PLAYER
// =====================================================================
// Seat layouts for the mini 3D table previews (you are always the bottom seat).
const MINI_SEATS={2:[[50,96],[50,4]],3:[[50,96],[6,40],[94,40]],4:[[50,96],[4,50],[50,4],[96,50]]};
const SEAT_COLORS=['#ff4b6e','#3f8cff','#ffc23d'];
function miniTable(n){const t=h('div',{class:'nf-mini','aria-hidden':'true'},h('div',{class:'felt'}));MINI_SEATS[n].forEach(([x,y],i)=>t.append(h('span',{class:'seat'+(i?'':' you'),style:{left:x+'%',top:y+'%','--sc':SEAT_COLORS[(i-1)%3]}})));return t}
function ruleChips(s){
 const chip=(ic,text,c,off)=>h('span',{class:'nf-rule'+(off?' off':''),style:{'--c':c}},icon(ic),text);
 return h('div',{class:'nf-rules'},chip('hand',s.handSize+' cards','#fff'),chip('stack','Stacking','#3f8cff',!s.stacking),chip('chaos','Chaos cards','#ffc23d',!s.chaos),chip('swap','7-0 swaps','#ff4b6e',!s.sevenZero),chip('draw',s.drawRule==='until'?'Draw until playable':'Draw one','#27e0a0'),chip('timer',s.turnTimer?s.turnTimer+'s turns':'No timer','#7fd7ff'));
}
function showSingle(){
 let count=prefs.players||4;
 const opts=h('div',{class:'nf-seats-pick',role:'radiogroup','aria-label':'Number of players'});
 const paintSeats=()=>opts.replaceChildren(...[2,3,4].map(n=>tilt(h('button',{class:'nf-seat-opt',role:'radio','aria-pressed':String(n===count),'aria-checked':String(n===count),onclick:()=>{count=n;prefs.players=n;savePrefs();sfx.click();paintSeats()}},miniTable(n),h('b',{},n+' players'),h('small',{},'You + '+(n-1)+' bot'+(n>2?'s':''))),8)));
 paintSeats();
 const diff=h('div',{class:'nf-diff',role:'radiogroup','aria-label':'Bot difficulty'});
 const LEVELS=[['easy','Easy','Relaxed bots that make mistakes','#16c58a'],['normal','Normal','Solid play, the odd slip','#3f8cff'],['hard','Hard','Ruthless stackers, never forget','#ff4b6e']];
 const paintDiff=()=>diff.replaceChildren(...LEVELS.map(([v,label,sub,tint])=>tilt(h('button',{class:'nf-diff-opt',role:'radio','aria-pressed':String(prefs.settings.botLevel===v),'aria-checked':String(prefs.settings.botLevel===v),style:{'--tint':tint},onclick:()=>{prefs.settings.botLevel=v;savePrefs();sfx.click();paintDiff()}},h('span',{class:'ico'},icon(v)),h('b',{},label),h('small',{},sub)),7)));
 paintDiff();
 const fan=h('div',{class:'fan'});[['r','7'],['y','d2'],['w','w16'],['g','swap'],['b','rev']].forEach(([c,v],i)=>{const el=cardEl({c,v,id:'s'+i});el.style.setProperty('--a',(i-2)*14+'deg');fan.append(el)});
 screen(topBar({back:showMenu,title:'Single Player'}),h('main',{class:'nf-screen'},
  h('header',{},h('div',{},h('span',{class:'nf-eyebrow'},'VS NOVA BOTS'),h('h1',{},'Single Player'),h('p',{},'Pick your table, choose how tough the bots are, and deal.'))),
  h('div',{class:'nf-wrap nf-solo'},
   h('div',{class:'nf-solo-col'},
    h('section',{class:'nf-panel'},h('h2',{},'Table size'),opts),
    h('section',{class:'nf-panel'},h('h2',{},'Bot difficulty'),diff)),
   h('aside',{class:'nf-panel nf-summary'},h('h2',{},'Your table'),h('div',{class:'nf-summary-hero'},fan),
    h('div',{},h('b',{style:{display:'block',marginBottom:'10px'}},'House rules'),ruleChips(prefs.settings)),
    h('button',{class:'nf-btn',onclick:showSettings},icon('gear'),'Change rules'),
    h('button',{class:'nf-btn go nf-deal',onclick:()=>startSolo(count)},'Deal cards',icon('arrow'))))));
}
function segmented(options,value,onchange){
 const seg=h('div',{class:'nf-seg',role:'group'});
 const paint=()=>seg.replaceChildren(...options.map(([v,label])=>h('button',{'aria-pressed':String(v===value),onclick:()=>{value=v;onchange(v);sfx.click();paint()}},label)));
 paint();return seg;
}
function startSolo(count){
 const me={id:nova.user?.uid||'me',name:nova.profile.name||'You'};
 const bots=botNames(count-1,[me.name]).map((name,i)=>({id:'bot'+i,name,bot:true}));
 const state=createGame([me,...bots],prefs.settings);
 const session=new HostedGame(state,{meId:me.id});
 const profiles={[me.id]:nova.profile};bots.forEach(b=>profiles[b.id]={name:b.name,bot:true});
 playTable(session,{mode:'solo',profiles,onExit:showSingle,again:()=>startSolo(count)});
}

// =====================================================================
// SETTINGS
// =====================================================================
function showSettings(){
 const s=prefs.settings;const save=()=>{prefs.settings=cleanSettings(s);savePrefs()};
 const ico=(name,tint)=>h('span',{class:'nf-set-icon',style:{'--tint':tint}},icon(name));
 const row=(ic,tint,title,sub,control,extra)=>h('div',{class:'nf-setting'},ico(ic,tint),h('div',{},h('b',{},title),h('small',{},sub),extra||null),control);
 const toggle=(ic,tint,title,sub,get,set,extra)=>{const sw=h('button',{class:'nf-switch',role:'switch','aria-checked':String(get()),'aria-label':title,onclick:()=>{set(!get());sw.setAttribute('aria-checked',String(get()));save();sfx.click()}});return row(ic,tint,title,sub,sw,extra)};
 const choice=(ic,tint,title,sub,opts,get,set)=>row(ic,tint,title,sub,segmented(opts,get(),v=>{set(v);save()}));
 const peek=h('div',{class:'peek','aria-hidden':'true'},...[['w','swap'],['r','skipall'],['g','discard'],['w','w6'],['w','w10'],['w','w16']].map(([c,v],i)=>cardEl({c,v,id:'p'+i})));
 const group=(ic,tint,title,...rows)=>h('section',{class:'nf-panel nf-set-group'},h('h2',{},title),h('div',{class:'nf-set-list'},...rows));
 screen(topBar({back:showMenu,title:'Settings'}),h('main',{class:'nf-screen'},
  h('header',{},h('div',{},h('span',{class:'nf-eyebrow'},'HOUSE RULES'),h('h1',{},'Settings'),h('p',{},'Rules apply to single player and to rooms you host.')),h('div',{style:{flex:'1'}}),
   h('button',{class:'nf-btn',onclick:()=>{prefs.settings={...DEFAULT_SETTINGS};savePrefs();showSettings();toast('Rules reset to default.')}},'Reset to defaults')),
  h('div',{class:'nf-wrap nf-set-groups'},
   group('hand','#fff','Deck & rules',
    choice('hand','#ff4b6e','Starting hand','Cards dealt to each player',[[5,'5'],[7,'7'],[10,'10']],()=>s.handSize,v=>s.handSize=v),
    toggle('stack','#3f8cff','Stack draw cards','Answer a +2 with a +2 or bigger',()=>s.stacking,v=>s.stacking=v),
    toggle('chaos','#f5a70f','Chaos cards','Swap, Skip All, Color Dump, +6, +10, +16',()=>s.chaos,v=>s.chaos=v,peek),
    toggle('swap','#16c58a','7-0 rule','7 swaps hands, 0 rotates every hand',()=>s.sevenZero,v=>s.sevenZero=v),
    choice('draw','#a0a0ad','Drawing','When you can’t play',[['one','Draw 1'],['until','Until playable']],()=>s.drawRule,v=>s.drawRule=v)),
   group('timer','#fff','Pace',
    choice('timer','#7fd7ff','Turn timer','Auto-draw when time runs out',[[0,'Off'],[15,'15s'],[30,'30s'],[60,'60s']],()=>s.turnTimer,v=>s.turnTimer=v),
    choice('bot','#ff4b6e','Bot difficulty','How sharp the Nova bots play',[['easy','Easy'],['normal','Normal'],['hard','Hard']],()=>s.botLevel,v=>s.botLevel=v)),
   group('sound','#fff','Experience',
    toggle('sound','#3f8cff','Sound effects','Card snaps, draws and UNO! chimes',()=>prefs.sound,v=>{prefs.sound=v;setSound(v);savePrefs()}),
    toggle('motion','#16c58a','Reduce motion','Turn off 3D tilt, card flights and floating effects',()=>prefs.reduced,v=>{prefs.reduced=v;document.documentElement.classList.toggle('nf-reduced',v);savePrefs()})))));
}

// =====================================================================
// CREDITS
// =====================================================================
function showCredits(){
 const gallery=h('div',{class:'nf-card-gallery'});
 for(const [c,v,label]of [['r','5','Number'],['y','skip','Skip'],['g','rev','Reverse'],['b','d2','+2'],['w','wild','Wild'],['w','w4','+4'],['r','skipall','Skip All'],['g','discard','Color Dump'],['w','swap','Swap'],['w','w6','+6'],['w','w10','+10'],['w','w16','+16']])gallery.append(h('figure',{},cardEl({c,v,id:'g'+v+c}),h('figcaption',{},label)));
 screen(topBar({back:showMenu,title:'Credits'}),h('main',{class:'nf-screen'},h('div',{class:'nf-credits'},logo(),
  h('h3',{},'Created for'),h('p',{},'Nova'),
  h('h3',{},'Game design & development'),h('p',{},'The Nova team'),
  h('h3',{},'Card art & interface'),h('p',{},'Original Nova Flip designs, drawn entirely in code'),
  h('h3',{},'Powered by'),h('p',{},'Nova accounts, Nova Coins and Nova friends'),
  h('h3',{},'The deck'),gallery,
  h('p',{class:'nf-note',style:{marginTop:'24px'}},'Nova Flip is an original shedding card game. Thanks for playing ✦'))));
}

// =====================================================================
// ONLINE HUB
// =====================================================================
let friends=[];let stopFriends=null;
function ensureFriends(){if(!stopFriends&&nova.signedIn)stopFriends=watchFriends(list=>{friends=list;dispatchEvent(new Event('nf-friends'))})}
function friendList({room}={}){
 const box=h('div',{class:'nf-list'});
 const paint=()=>{
  if(!friends.length){box.replaceChildren(h('div',{class:'nf-empty'},'No friends yet. Add friends in Nova Chat to invite them here.'));return}
  box.replaceChildren(...friends.map(f=>{
   const inRoom=room?.data?.players?.[f.uid];
   const btn=h('button',{class:'nf-btn sm'+(f.online?' primary':''),disabled:inRoom||undefined,onclick:async()=>{btn.disabled=true;try{let r=room;if(!r){r=await Room.create({visibility:'private',settings:prefs.settings});await sendInvite(f.uid,r.code);showLobby(r)}else await sendInvite(f.uid,r.code);toast('Invite sent to '+f.name+'.');btn.textContent='Invited ✓'}catch(e){btn.disabled=false;fail(e.code==='PERMISSION_DENIED'?Error('Invites need the updated Firebase rules to be published.'):e)}}},icon('send'),inRoom?'In room':room?'Invite':'Host & invite');
   return h('div',{class:'nf-item'},identity(f,{size:'sm',status:f.online?'online':'offline'}),h('div',{class:'grow'},h('small',{},f.online?(f.activity||'Online'):'Offline')),h('span',{class:'nf-dot'+(f.online?' on':'')}),btn);
  }));
 };
 paint();addEventListener('nf-friends',paint);onCleanup(()=>removeEventListener('nf-friends',paint));
 if(room){const off=room.on(e=>e.type==='update'&&paint());onCleanup(off)}
 return box;
}
function showOnline(){
 ensureFriends();
 const code=h('input',{class:'nf-input nf-code-input',maxlength:'5',placeholder:'CODE','aria-label':'Room code',autocomplete:'off',spellcheck:'false',oninput:e=>{e.target.value=cleanCode(e.target.value)},onkeydown:e=>{if(e.key==='Enter')joinCode()}});
 const joinCode=async()=>{try{showLobby(await Room.join(code.value))}catch(e){fail(e)}};
 const rooms=h('div',{class:'nf-list'},h('div',{class:'nf-empty'},'Looking for open rooms…'));
 const stop=watchLobbies(list=>{rooms.replaceChildren(...(list.length?list.map(l=>h('div',{class:'nf-item'},h('span',{class:'nf-room-code'},l.code),h('div',{class:'grow'},h('b',{},l.name),h('small',{},'Host '+l.host+' · '+(l.chaos?'Chaos':'Classic')+(l.stacking?' · Stacking':''))),h('span',{class:'nf-pill'},l.count+'/'+l.max),h('button',{class:'nf-btn sm primary',disabled:l.count>=l.max||undefined,onclick:async()=>{try{showLobby(await Room.join(l.code))}catch(e){fail(e)}}},l.count>=l.max?'Full':'Join'))):[h('div',{class:'nf-empty'},'No open rooms right now. Host one and invite your friends!')]))});
 onCleanup(stop);
 const invites=h('div',{class:'nf-list'});
 const offInv=watchInvites(list=>invites.replaceChildren(...list.map(inv=>h('div',{class:'nf-invite'},identity({name:inv.name,photo:inv.photo},{size:'sm'}),h('div',{class:'grow',style:{flex:'1'}},h('b',{},inv.name+' invited you'),h('small',{style:{display:'block',color:'var(--muted)'}},'Room '+inv.code)),h('button',{class:'nf-btn sm go',onclick:async()=>{clearInvite(inv.from);try{showLobby(await Room.join(inv.code))}catch(e){fail(e)}}},'Join'),h('button',{class:'nf-btn sm',onclick:()=>clearInvite(inv.from)},'Decline')))));
 onCleanup(offInv);
 let visibility='public';
 const name=h('input',{class:'nf-input',maxlength:'40',value:(nova.profile.name||'My')+'’s room','aria-label':'Room name'});
 screen(topBar({back:showMenu,title:'Online'}),h('main',{class:'nf-screen'},
  h('header',{},h('div',{},h('h1',{},'Play Online'),h('p',{},'Host a room, share the code, or jump into an open table.'))),
  h('div',{class:'nf-wrap',style:{display:'grid',gap:'18px'}},invites,
   h('div',{class:'nf-grid-2'},
    h('div',{style:{display:'grid',gap:'18px'}},
     h('section',{class:'nf-panel'},h('h2',{},'Host a room'),h('div',{style:{display:'grid',gap:'12px'}},h('label',{class:'nf-field'},h('span',{},'Room name'),name),h('div',{class:'nf-row'},segmented([['public','Public'],['private','Invite only']],visibility,v=>visibility=v),h('div',{style:{flex:'1'}}),h('button',{class:'nf-btn primary',onclick:async e=>{e.currentTarget.disabled=true;try{showLobby(await Room.create({name:name.value,visibility,settings:prefs.settings}))}catch(err){e.currentTarget.disabled=false;fail(err.code==='PERMISSION_DENIED'?Error('Online rooms need the updated Firebase rules to be published.'):err)}}},icon('plus'),'Create room')))),
     h('section',{class:'nf-panel'},h('h2',{},'Join with a code'),h('div',{class:'nf-row',style:{flexWrap:'nowrap'}},code,h('button',{class:'nf-btn go',onclick:joinCode},'Join'))),
     h('section',{class:'nf-panel'},h('h2',{},'Open rooms'),rooms)),
    h('section',{class:'nf-panel'},h('h2',{},'Friends'),friendList())))));
}

// =====================================================================
// LOBBY
// =====================================================================
function showLobby(room){
 ensureFriends();
 const seats=h('div',{class:'nf-seats'}),controls=h('div',{style:{display:'grid',gap:'12px'}}),status=h('p',{class:'nf-note'});
 const leave=async()=>{await room.leave();showOnline()};
 const popMenu=(e,p)=>{
  e.stopPropagation();document.querySelector('.nf-menu-pop')?.remove();
  const pop=h('div',{class:'nf-menu-pop',role:'menu'},h('button',{role:'menuitem',class:'danger',onclick:async()=>{pop.remove();try{await room.kick(p.id,!p.bot);toast(p.name+(p.bot?' removed.':' was kicked.'))}catch(err){fail(err)}}},p.bot?'Remove bot':'Kick '+p.name));
  const r=e.currentTarget.getBoundingClientRect();pop.style.left=Math.min(r.left,innerWidth-200)+'px';pop.style.top=r.bottom+6+'px';document.body.append(pop);
  setTimeout(()=>addEventListener('click',()=>pop.remove(),{once:true}));
 };
 const paint=()=>{
  if(!room.data)return;
  const players=room.players;
  seats.replaceChildren(...Array.from({length:MAX_PLAYERS},(_,i)=>{
   const p=players[i];
   if(!p)return h('div',{class:'nf-seat empty'},room.isHost?h('button',{class:'nf-btn sm',onclick:()=>room.addBot().catch(fail)},icon('bot'),'Add bot'):'Open seat');
   const isHost=p.id===room.data.host,isMe=p.id===nova.user.uid;
   const id=identity(p,{size:'md'});
   const seat=h('div',{class:'nf-seat'},h('span',{class:'tag'+(isHost?' host':'')},isHost?'HOST':p.bot?'BOT':isMe?'YOU':'PLAYER'));
   if(room.isHost&&!isMe){const b=h('button',{class:'nf-id',title:'Manage '+p.name,onclick:e=>popMenu(e,p)},...id.childNodes);seat.append(b)}else seat.append(id);
   if(!p.bot)surface(seat,p);
   return seat;
  }));
  const s=room.settings;
  status.textContent=room.data.status==='playing'?'Game in progress…':room.isHost?(players.length<2?'Add a bot or invite a friend to start.':'Ready when you are.'):'Waiting for the host to start…';
  controls.replaceChildren();
  if(room.isHost){
   controls.append(
    h('div',{class:'nf-row'},segmented([['public','Public'],['private','Invite only']],room.data.visibility,v=>room.setMeta({visibility:v}).catch(fail))),
    hostToggle('Stacking',s.stacking,v=>room.updateSettings({stacking:v})),
    hostToggle('Chaos cards',s.chaos,v=>room.updateSettings({chaos:v})),
    hostToggle('7-0 rule',s.sevenZero,v=>room.updateSettings({sevenZero:v})),
    h('div',{class:'nf-row'},h('span',{class:'nf-note',style:{flex:'1'}},'Hand size'),segmented([[5,'5'],[7,'7'],[10,'10']],s.handSize,v=>room.updateSettings({handSize:v}).catch(fail))),
    h('div',{class:'nf-row'},h('span',{class:'nf-note',style:{flex:'1'}},'Turn timer'),segmented([[15,'15s'],[30,'30s'],[60,'60s']],s.turnTimer||30,v=>room.updateSettings({turnTimer:v}).catch(fail))),
    h('div',{class:'nf-row'},h('span',{class:'nf-note',style:{flex:'1'}},'Bots'),segmented([['easy','Easy'],['normal','Normal'],['hard','Hard']],s.botLevel,v=>room.updateSettings({botLevel:v}).catch(fail))),
    h('button',{class:'nf-btn go',style:{fontSize:'17px',padding:'14px'},disabled:players.length<2||room.data.status==='playing'||undefined,onclick:()=>room.start().catch(fail)},'Start game  →'));
  }else controls.append(h('p',{class:'nf-note'},[s.handSize+' cards',s.stacking?'stacking':'no stacking',s.chaos?'chaos cards':'classic deck',s.sevenZero?'7-0 rule':'',(s.turnTimer||30)+'s turns'].filter(Boolean).join(' · ')));
  const last=room.data.lastResult;
  if(last&&Date.now()-last.at<120000)controls.prepend(h('div',{class:'nf-invite'},h('b',{},'🏆 '+last.winnerName+' won the last round · '+fmt(last.points)+' pts')));
 };
 const copy=()=>{navigator.clipboard?.writeText(room.code).then(()=>toast('Room code copied.'),()=>toast('Code: '+room.code))};
 screen(topBar({back:leave,title:'Room'}),h('main',{class:'nf-screen'},
  h('header',{},h('div',{class:'nf-lobby-code'},h('div',{},h('p',{style:{margin:'0',color:'var(--muted)',fontWeight:'700',letterSpacing:'.14em',fontSize:'12px'}},'ROOM CODE'),h('span',{class:'code'},room.code)),h('button',{class:'nf-btn',onclick:copy},icon('copy'),'Copy'),h('div',{style:{flex:'1'}}),h('button',{class:'nf-btn danger',onclick:leave},icon('door'),room.isHost?'Close room':'Leave'))),
  h('div',{class:'nf-wrap nf-grid-2'},
   h('div',{style:{display:'grid',gap:'18px'}},h('section',{class:'nf-panel'},h('h2',{},room.data?.name||'Players'),seats,status)),
   h('div',{style:{display:'grid',gap:'18px'}},h('section',{class:'nf-panel'},h('h2',{},room.isHost?'Room settings':'Rules'),controls),h('section',{class:'nf-panel'},h('h2',{},'Invite friends'),friendList({room})))))) ;
 paint();
 const off=room.on(e=>{
  if(e.type==='update')paint();
  else if(e.type==='game')playOnline(room,e.game);
  else if(e.type==='kicked'){toast('The host removed you from the room.',{error:true});showOnline()}
  else if(e.type==='closed'){toast('The host closed the room.');showOnline()}
  else if(e.type==='removed'){showOnline()}
  else if(e.type==='error'){fail(Error('Lost access to the room. Make sure the latest Firebase rules are published.'))}
 });
 onCleanup(off);
}
function hostToggle(label,value,onchange){const sw=h('button',{class:'nf-switch',role:'switch','aria-checked':String(value),'aria-label':label,onclick:()=>{onchange(!value).catch?.(fail)}});return h('div',{class:'nf-row'},h('span',{class:'nf-note',style:{flex:'1'}},label),sw)}

function playOnline(room,game){
 const profiles=()=>Object.fromEntries(room.players.map(p=>[p.id,p]));
 playTable(game,{mode:'online',room,profiles,onExit:()=>showLobby(room)});
}

// =====================================================================
// GAME TABLE
// =====================================================================
const POSITIONS={2:['top'],3:['left','right'],4:['left','top','right']};
function playTable(session,{mode,room,profiles,onExit,again}){
 screen();document.body.classList.add('nf-in-game');
 const profileFor=id=>(typeof profiles==='function'?profiles():profiles)[id]||{name:'Player'};
 let reward=registerGame(session,mode,room);
 const table=h('div',{class:'nf-table'}),felt=h('div',{class:'nf-felt'}),log=h('div',{class:'nf-log','aria-live':'polite'});
 const center=h('div',{class:'nf-center'}),dir=h('div',{class:'nf-dir'},svg('<circle cx="12" cy="12" r="11"/>'));
 const drawPile=h('button',{class:'nf-pile nf-draw','aria-label':'Draw a card'},cardEl(null,{back:true}),cardEl(null,{back:true}),cardEl(null,{back:true}),h('span',{class:'nf-deck-count'}));
 const discard=h('div',{class:'nf-pile nf-discard','aria-label':'Discard pile'}),ring=h('div',{class:'nf-color-ring'}),colorName=h('span',{class:'nf-color-name'});
 discard.append(ring,colorName);center.append(dir,drawPile,discard);
 const me=h('div',{class:'nf-me'}),bar=h('div',{class:'nf-me-bar'}),hand=h('div',{class:'nf-hand',role:'list','aria-label':'Your hand'});
 const turnLabel=h('span',{class:'nf-turn-label'}),passBtn=h('button',{class:'nf-btn',hidden:true},'Pass'),flipBtn=h('button',{class:'nf-flip-btn',disabled:true,title:'Call UNO! when you are down to one card'},'UNO!');
 const myCard=h('div',{class:'nf-seat-card'}),myCount=h('span',{class:'nf-count'}),myTimer=h('div',{class:'nf-timer'},h('i'));
 myCard.append(identity(profileFor(session.meId||nova.user?.uid),{size:'sm'}),myCount,myTimer);surface(myCard,profileFor(session.meId||nova.user?.uid));
 bar.append(myCard,turnLabel,passBtn,flipBtn);me.append(hand,bar);
 const opps=new Map();
 const leave=()=>{
  const go=async()=>{closeModal();session.close?.();if(mode==='online'){await room.leave();showOnline()}else onExit()};
  if(session.view?.phase==='over')return go();
  openModal(h('div',{class:'nf-dialog'},h('h2',{},'Leave this game?'),h('p',{},mode==='online'?(room.isHost?'You are the host. Leaving closes the room for everyone.':'A bot will take your seat.'):'Your progress in this round will be lost.'),h('div',{class:'nf-row',style:{justifyContent:'flex-end'}},h('button',{class:'nf-btn',onclick:closeModal},'Keep playing'),h('button',{class:'nf-btn danger',onclick:go},'Leave'))));
 };
 const extra=room?[h('span',{class:'nf-pill'},'Room ',h('span',{class:'nf-room-code'},room.code))]:[];
 app.append(topBar({back:leave,extra}),table);
 table.append(felt,log,center,me);

 const seatEl=seat=>seat===session.mySeat?myCard:opps.get(seat)?.card;
 let prevHand=new Set(),lastTurnMine=false,shownResult=false,bubbles=new Map();

 function buildOpps(v){
  if(opps.size)return;
  const n=v.players.length,order=[];for(let i=1;i<n;i++)order.push((session.mySeat+i)%n);
  order.forEach((seat,i)=>{
   const p=v.players[seat],prof=profileFor(p.id),pos=POSITIONS[n][i];
   const card=h('div',{class:'nf-seat-card'}),count=h('span',{class:'nf-count'}),timer=h('div',{class:'nf-timer'},h('i'));
   card.append(identity({...prof,name:prof.name||p.name},{size:'sm'}),count,timer);if(!prof.bot)surface(card,prof);
   const backs=h('div',{class:'nf-backs'}),wrap=h('div',{class:'nf-opp','data-pos':pos},pos==='top'?[card,backs]:[card,backs]);
   table.append(wrap);opps.set(seat,{card,count,timer,backs,wrap});
  });
 }
 function setTimer(el,v,seat){
  const bar=el.firstChild;const total=(v.settings.turnTimer||0)*1000;
  if(!total||v.turn!==seat||!v.deadline||v.phase!=='play'){bar.style.transition='none';bar.style.width='0';return}
  const left=Math.max(0,v.deadline-Date.now());
  bar.style.transition='none';bar.style.width=(left/total*100)+'%';bar.offsetWidth;bar.style.transition='width '+left+'ms linear';bar.style.width='0';
 }
 function render(event={}){
  const v=session.view;if(!v||!v.players)return;
  buildOpps(v);
  const mine=session.mySeat,myTurn=v.turn===mine&&v.phase==='play',handCards=session.myHand||[];
  const cur=colorHex[v.color]||'#ffffff';table.style.setProperty('--cur',cur);discard.style.setProperty('--cur',cur);dir.style.setProperty('--cur',cur);
  dir.classList.toggle('ccw',v.dir<0);
  // opponents
  for(const [seat,o]of opps){
   const p=v.players[seat];o.count.textContent=p.count;o.card.classList.toggle('turn',v.turn===seat&&v.phase==='play');o.card.style.setProperty('--turn',cur);
   const show=Math.min(p.count,o.wrap.dataset.pos==='top'?12:8);
   if(o.backs.childElementCount!==show){o.backs.replaceChildren(...Array.from({length:show},()=>cardEl(null,{back:true,small:true})));if(o.wrap.dataset.pos!=='top'){o.backs.style.flexDirection='column';[...o.backs.children].forEach((c,i)=>{c.style.marginLeft='0';c.style.marginTop=i?'-48px':'0'})}}
   setTimer(o.timer,v,seat);
  }
  // center piles
  drawPile.lastChild.textContent=v.deckCount+' left';
  drawPile.classList.toggle('can',myTurn&&!v.drawn);
  const pile=discard.querySelectorAll('.nf-card'),oldTop=pile[pile.length-1];
  if(!oldTop||oldTop.dataset.id!==v.top.id){
   const el=cardEl(v.top);el.style.transform='rotate('+((parseInt(v.top.id.slice(1),10)*37)%24-12)+'deg)';
   if(pile.length>2)pile[0].remove();
   discard.insertBefore(el,colorName);
   if(event.type==='play'&&event.seat!=null&&!prefs.reduced)fly(el,event.seat,event.fromRect);
  }
  colorName.textContent=v.top.c==='w'||v.pending?COLOR_NAMES[v.color]+(v.pending?' · draw '+v.pending.amount:''):'';
  discard.querySelector('.nf-pending')?.remove();
  if(v.pending)discard.append(h('span',{class:'nf-pending'},'+'+v.pending.amount));
  // my hand
  hand.classList.toggle('my-turn',myTurn);
  const n=handCards.length,overlap=n<=7?-18:n<=12?-42:n<=20?-58:-68;hand.style.setProperty('--overlap',overlap+'px');
  const fresh=new Set();for(const c of handCards)if(prevHand.size&&!prevHand.has(c.id))fresh.add(c.id);
  hand.replaceChildren(...handCards.map((c,i)=>{
   const el=cardEl(c);el.setAttribute('role','listitem');
   const ok=myTurn&&canPlayView(v,c,mine);el.classList.toggle('ok',ok);
   if(ok){el.tabIndex=0;el.setAttribute('role','button');el.onclick=()=>choose(c,el);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(c,el)}}}
   const mid=(n-1)/2;el.style.setProperty('--tilt',n>1?((i-mid)*Math.min(3,30/n))+'deg':'0deg');
   if(fresh.has(c.id)&&!prefs.reduced)el.classList.add('fresh');
   return el;
  }));
  prevHand=new Set(handCards.map(c=>c.id));
  myCount.textContent=n;myCard.classList.toggle('turn',myTurn);myCard.style.setProperty('--turn',cur);setTimer(myTimer,v,mine);
  // controls
  turnLabel.classList.toggle('mine',myTurn);
  turnLabel.textContent=v.phase!=='play'?'Game over':myTurn?(v.pending?'Stack a draw card or take +'+v.pending.amount:v.drawn?'Play the card you drew or pass':'Your turn'):v.players[v.turn].name+'’s turn';
  passBtn.hidden=!(myTurn&&v.drawn);
  const lastCall=v.oneCard&&v.oneCard.player===mine&&!v.oneCard.called&&n===1;
  flipBtn.disabled=!(lastCall||(myTurn&&n===2));flipBtn.classList.toggle('urgent',!!lastCall);
  // log
  log.replaceChildren(...(v.log||[]).slice(-5).map(l=>h('p',{},l.text)));
  if(myTurn&&!lastTurnMine)sfx.turn();lastTurnMine=myTurn;
  if(v.phase==='over'&&!shownResult){shownResult=true;setTimeout(()=>showResult(v),700)}
 }
 function canPlayView(v,card,seat){
  // mirrors engine.canPlay using only public data
  if(v.phase!=='play'||v.turn!==seat)return false;
  if(v.drawn&&v.drawnId&&v.drawnId!==card.id)return false;
  if(v.pending){if(!v.settings.stacking||!(card.v in {d2:1,w4:1,w6:1,w10:1,w16:1}))return false;const val={d2:2,w4:4,w6:6,w10:10,w16:16};return val[card.v]>=val[v.pending.top]}
  return card.c==='w'||card.c===v.color||card.v===v.top.v;
 }
 function fly(target,seat,fromRect){
  const from=fromRect||seatEl(seat)?.getBoundingClientRect();if(!from)return;
  const to=target.getBoundingClientRect();
  target.style.opacity='0';
  const ghost=target.cloneNode(true);ghost.classList.add('nf-fly');ghost.style.opacity='1';ghost.style.left=to.left+'px';ghost.style.top=to.top+'px';ghost.style.width=to.width+'px';ghost.style.height=to.height+'px';
  document.body.append(ghost);
  const dx=from.left+from.width/2-(to.left+to.width/2),dy=from.top+from.height/2-(to.top+to.height/2);
  const a=ghost.animate([{transform:`translate(${dx}px,${dy}px) scale(.7) rotate(-25deg)`},{transform:target.style.transform||'none'}],{duration:420,easing:'cubic-bezier(.16,1,.3,1)'});
  a.finished.finally(()=>{ghost.remove();target.style.opacity=''});
 }
 async function choose(card,el){
  const v=session.view;let color,target;
  try{
   if(isWild(card)){color=await pickColor();if(!color)return}
   if(needsTarget({settings:v.settings},card)&&session.myHand.length>1){target=await pickTarget(v);if(target==null)return}
   pendingFrom=el.getBoundingClientRect();
   await session.act({type:'play',cardId:card.id,color,target});sfx.play();
  }catch(e){fail(e)}
 }
 let pendingFrom=null;
 drawPile.onclick=async()=>{const v=session.view;if(!(v.turn===session.mySeat&&v.phase==='play'&&!v.drawn))return;try{await session.act({type:'draw'});sfx.draw()}catch(e){fail(e)}};
 passBtn.onclick=async()=>{try{await session.act({type:'pass'})}catch(e){fail(e)}};
 flipBtn.onclick=async()=>{try{await session.act({type:'flip'});sfx.flip();bubble(session.mySeat)}catch(e){fail(e)}};
 function bubble(seat){const el=seatEl(seat);if(!el)return;el.querySelector('.nf-bubble')?.remove();const b=h('span',{class:'nf-bubble'},'UNO!');el.append(b);clearTimeout(bubbles.get(seat));bubbles.set(seat,setTimeout(()=>b.remove(),2200))}

 const off=session.on(event=>{
  if(event.type==='play'&&event.seat===session.mySeat)event.fromRect=pendingFrom;
  if(event.type==='play'&&event.seat!==session.mySeat)sfx.play();
  if(event.type==='flip'){bubble(event.seat);if(event.seat!==session.mySeat)sfx.flip()}
  if(event.type==='caught'&&event.seat===session.mySeat)toast('You forgot to call UNO! · +2 cards',{error:true});
  if(event.type==='timeout'&&event.seat===session.mySeat)toast('Time ran out · auto move');
  if(event.type==='left')toast(session.view.players[event.seat].name+' left · a bot took over');
  const v=session.view;const last=v?.log?.[v.log.length-1];if(last?.flip!=null&&event.type==='sync')bubble(last.flip);
  render(event);pendingFrom=null;
 });
 onCleanup(()=>{off();for(const t of bubbles.values())clearTimeout(t);if(mode==='solo')session.close()});
 if(mode==='online'){const offRoom=room.on(e=>{if(e.type==='kicked'){toast('The host removed you from the room.',{error:true});showOnline()}else if(e.type==='closed'){toast('The host closed the room.');showOnline()}});onCleanup(offRoom)}
 render();

 // ---------- result ----------
 async function showResult(v){
  const winner=v.players[v.winner],prof=profileFor(winner.id),iWon=v.winner===session.mySeat;
  if(iWon){sfx.win();confetti()}else sfx.bad();
  if(!nova.signedIn||mode==='solo'){localStats.games++;if(iWon){localStats.wins++;localStats.points+=v.points}saveLocal()}
  const top=h('div',{class:'nf-result-top'},identity(prof,{size:'lg'}),h('h2',{},iWon?'You win!':winner.name+' wins'));if(!prof.bot)surface(top,prof);
  const coinsBox=h('div',{class:'nf-reward coins'},h('b',{},iWon&&nova.signedIn?'…':'0'),h('small',{},'Nova Coins'));
  const note=h('p',{class:'claim-note'});
  const actions=h('div',{class:'actions'});
  if(again)actions.append(h('button',{class:'nf-btn go',onclick:()=>{closeModal();again()}},'Play again'));
  actions.append(h('button',{class:'nf-btn primary',onclick:()=>{closeModal();if(mode==='online')showLobby(room);else onExit()}},mode==='online'?'Back to room':'New table'),h('button',{class:'nf-btn',onclick:()=>{closeModal();if(mode==='online')room.leave().then(showMenu);else showMenu()}},'Main menu'));
  const dlg=h('div',{class:'nf-dialog nf-result'},top,h('div',{class:'rewards'},h('div',{class:'nf-reward points'},h('b',{},iWon?'+'+fmt(v.points):'0'),h('small',{},'Points')),coinsBox),note,actions);
  openModal(dlg,{dismissable:false}).dataset.locked='1';
  if(!iWon){note.textContent='Win a round to earn 1,000+ points and Nova Coins.';return}
  if(!nova.signedIn){coinsBox.firstChild.textContent='0';note.textContent='Sign in to Nova to turn wins into Nova Coins.';return}
  try{
   const {token}=await reward;
   const res=await control('novaFlip',{op:'claim',token,points:v.points});
   countUp(coinsBox.firstChild,res.coinsWon);
   nova.coins=res.coins;nova.stats=res.stats;dispatchEvent(new Event('nf-wallet'));
   note.textContent=res.limited?'Daily coin limit reached: points still count, coins reset tomorrow.':res.bonus?'Includes a +'+fmt(res.bonus)+' online bonus for beating real players.':'Coins added to your Nova account.';
  }catch(e){coinsBox.firstChild.textContent='0';note.textContent='Coins could not be added: '+(e.message||e)}
 }
}
function registerGame(session,mode,room){
 if(!nova.signedIn)return Promise.reject(Error('guest'));
 const v=session.view;
 const p=control('novaFlip',{op:'start',mode,players:v?.players?.length||session.s?.players.length||2,room:room?.code,gameId:session.gameId||room?.gameId||room?.data?.gameId});
 p.catch(()=>{});return p;
}
function countUp(el,to){const start=performance.now(),dur=900;const step=t=>{const k=Math.min(1,(t-start)/dur);el.textContent='+'+fmt(Math.round(to*(1-Math.pow(1-k,3))));if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)}
function pickColor(){return new Promise(resolve=>{const dlg=h('div',{class:'nf-dialog'},h('h2',{},'Choose a color'),h('p',{},'The next player must match it.'),h('div',{class:'nf-colors'},...COLORS.map(c=>h('button',{'data-c':c,onclick:()=>{done=true;closeModal();resolve(c)}},COLOR_NAMES[c]))));let done=false;openModal(dlg);const m=modal;new MutationObserver((_,o)=>{if(!m.isConnected){o.disconnect();if(!done)resolve(null)}}).observe(document.body,{childList:true})})}
function pickTarget(v){return new Promise(resolve=>{let done=false;const list=h('div',{class:'nf-list'},...v.players.map((p,k)=>k===v.turn?null:h('button',{class:'nf-item',onclick:()=>{done=true;closeModal();resolve(k)}},h('b',{class:'grow'},p.name),h('span',{class:'nf-pill'},p.count+' cards'))));openModal(h('div',{class:'nf-dialog'},h('h2',{},'Swap hands with…'),h('p',{},'You will trade your whole hand with this player.'),list));const m=modal;new MutationObserver((_,o)=>{if(!m.isConnected){o.disconnect();if(!done)resolve(null)}}).observe(document.body,{childList:true})})}
function confetti(){
 if(prefs.reduced)return;const c=h('canvas',{class:'nf-confetti'});document.body.append(c);const x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;
 const cols=Object.values(colorHex).concat('#ffffff','#ffe08a');const bits=Array.from({length:160},()=>({x:innerWidth/2,y:innerHeight/2,vx:(Math.random()-.5)*16,vy:-Math.random()*16-4,r:Math.random()*6+3,c:cols[Math.floor(Math.random()*cols.length)],a:Math.random()*6}));
 const start=performance.now();const frame=t=>{x.clearRect(0,0,c.width,c.height);for(const b of bits){b.vy+=.35;b.x+=b.vx;b.y+=b.vy;b.a+=.2;x.save();x.translate(b.x,b.y);x.rotate(b.a);x.fillStyle=b.c;x.fillRect(-b.r/2,-b.r/4,b.r,b.r/2);x.restore()}if(t-start<3200)requestAnimationFrame(frame);else c.remove()};requestAnimationFrame(frame);
}

// =====================================================================
// Invites while in the game, deep links, boot
// =====================================================================
let seenInvites=new Set();
function listenInvites(){
 watchInvites(list=>{for(const inv of list){const key=inv.from+':'+inv.at;if(seenInvites.has(key))continue;seenInvites.add(key);if(document.body.classList.contains('nf-in-game'))continue;
  toast(inv.name+' invited you to Nova Flip',{icon:identity({name:inv.name,photo:inv.photo},{size:'sm',effect:false}),action:()=>joinFromInvite(inv.code,inv.from),actionLabel:'Join',timeout:15000})}});
}
async function joinFromInvite(code,from){if(from)clearInvite(from);try{showLobby(await Room.join(code))}catch(e){fail(e)}}
addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.novaAction==='novaFlipJoin'&&e.data.code)joinFromInvite(e.data.code,e.data.from)});
addEventListener('nova-server-progress',e=>{if(Number.isSafeInteger(e.detail?.coins)){nova.coins=e.detail.coins;dispatchEvent(new Event('nf-wallet'))}});

(async function boot(){
 floaters();
 app.replaceChildren(h('div',{style:{flex:'1',display:'grid',placeItems:'center'}},h('div',{style:{textAlign:'center'}},logo(),h('p',{class:'nf-note'},'Connecting to Nova…'))));
 await connect();
 showMenu();
 if(nova.signedIn){
  refreshCoins().then(()=>{if(app.querySelector('.nf-menu'))showMenu()});
  listenInvites();
  const q=new URLSearchParams(location.search);let code=q.get('room');
  try{code=code||sessionStorage.getItem('novaflip-join');sessionStorage.removeItem('novaflip-join')}catch{}
  if(code)joinFromInvite(cleanCode(code),q.get('from'));
 }
})();
