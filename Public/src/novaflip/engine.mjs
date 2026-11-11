// Nova Flip rules engine. Pure state machine: the local game and the online host
// both run this; clients only ever see `publicView` plus their own hand.
export const COLORS=['r','y','g','b'];
export const COLOR_NAMES={r:'Red',y:'Yellow',g:'Green',b:'Blue',w:'Wild'};
export const DRAW_VALUE={d2:2,w4:4,w6:6,w10:10,w16:16};
export const LABELS={skip:'Skip',rev:'Reverse',d2:'+2',skipall:'Skip All',discard:'Color Dump',wild:'Wild',w4:'+4',swap:'Swap',w6:'+6',w10:'+10',w16:'+16'};
export const DEFAULT_SETTINGS={handSize:7,stacking:true,chaos:true,sevenZero:false,drawRule:'one',turnTimer:30,botLevel:'normal'};

export function cleanSettings(s={}){
 const n=(v,min,max,d)=>Number.isInteger(Number(v))&&Number(v)>=min&&Number(v)<=max?Number(v):d;
 return {
  handSize:n(s.handSize,4,12,7),
  stacking:s.stacking!==false,
  chaos:s.chaos!==false,
  sevenZero:s.sevenZero===true,
  drawRule:s.drawRule==='until'?'until':'one',
  turnTimer:[0,15,30,60].includes(Number(s.turnTimer))?Number(s.turnTimer):30,
  botLevel:['easy','normal','hard'].includes(s.botLevel)?s.botLevel:'normal'
 };
}

export function buildDeck(settings){
 const deck=[];let id=0;const add=(c,v)=>deck.push({id:'c'+(id++),c,v});
 for(const c of COLORS){
  add(c,'0');
  for(let i=0;i<2;i++){for(let n=1;n<=9;n++)add(c,String(n));add(c,'skip');add(c,'rev');add(c,'d2')}
  if(settings.chaos){add(c,'skipall');add(c,'discard')}
 }
 for(let i=0;i<4;i++){add('w','wild');add('w','w4')}
 if(settings.chaos){for(let i=0;i<2;i++){add('w','swap');add('w','w6')}add('w','w10');add('w','w16')}
 return deck;
}

export function shuffle(list,rand=Math.random){for(let i=list.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[list[i],list[j]]=[list[j],list[i]]}return list}

export function cardPoints(card){
 if(/^\d$/.test(card.v))return Number(card.v);
 if(card.c!=='w')return 20;
 return ['wild','w4'].includes(card.v)?50:60;
}
export const isWild=card=>card.c==='w';
export const isDraw=card=>card.v in DRAW_VALUE;

export function createGame(players,settings={},rand=Math.random){
 settings=cleanSettings(settings);
 if(players.length<2||players.length>4)throw Error('Nova Flip needs 2 to 4 players.');
 const deck=shuffle(buildDeck(settings),rand);
 const state={players:players.map(p=>({id:p.id,name:p.name,bot:!!p.bot,hand:[]})),deck,discard:[],color:'r',dir:1,turn:0,pending:null,drawn:null,oneCard:null,settings,phase:'play',winner:null,log:[],seq:0,startedAt:Date.now()};
 for(let r=0;r<settings.handSize;r++)for(const p of state.players)p.hand.push(state.deck.pop());
 // Start on a plain number so nobody is punished before their first turn.
 let first=state.deck.findIndex(c=>/^\d$/.test(c.v));if(first<0)first=state.deck.length-1;
 const [top]=state.deck.splice(first,1);state.discard.push(top);state.color=top.c;
 state.turn=Math.floor(rand()*state.players.length);
 note(state,'Game started · '+state.players[state.turn].name+' goes first');
 return state;
}

const top=s=>s.discard[s.discard.length-1];
const nextIndex=(s,from=s.turn,steps=1)=>{const n=s.players.length;return ((from+s.dir*steps)%n+n)%n};
function note(s,text,extra={}){s.log.push({text,at:Date.now(),...extra});if(s.log.length>30)s.log.splice(0,s.log.length-30)}

function refill(s){
 if(s.deck.length)return true;
 if(s.discard.length<=1)return false;
 const keep=s.discard.pop();
 s.deck=shuffle(s.discard);s.discard=[keep];
 return s.deck.length>0;
}
export function drawCards(s,p,count){
 const got=[];for(let i=0;i<count;i++){if(!refill(s))break;const card=s.deck.pop();s.players[p].hand.push(card);got.push(card)}
 return got;
}

export function canPlay(s,p,card){
 if(s.phase!=='play'||s.turn!==p)return false;
 if(s.drawn&&s.drawn!==card.id)return false;
 const t=top(s);
 if(s.pending){
  if(!s.settings.stacking||!isDraw(card))return false;
  return DRAW_VALUE[card.v]>=DRAW_VALUE[s.pending.top];
 }
 if(isWild(card))return true;
 return card.c===s.color||card.v===t.v;
}
export const playable=(s,p)=>s.players[p].hand.filter(c=>canPlay(s,p,c));
export const needsTarget=(s,card)=>card.v==='swap'||(s.settings.sevenZero&&card.v==='7');

function assertTurn(s,p){if(s.phase!=='play')throw Error('The game is over.');if(s.turn!==p)throw Error('It is not your turn.')}
function advance(s,steps=1){s.turn=nextIndex(s,s.turn,steps);s.drawn=null;s.moves=(s.moves||0)+1}

export function play(s,p,cardId,{color,target}={}){
 assertTurn(s,p);
 const hand=s.players[p].hand,i=hand.findIndex(c=>c.id===cardId);
 if(i<0)throw Error('That card is not in your hand.');
 const card=hand[i];
 if(!canPlay(s,p,card))throw Error('That card cannot be played right now.');
 if(isWild(card)&&!COLORS.includes(color))throw Error('Choose a color.');
 const wantsTarget=needsTarget(s,card)&&hand.length>1;
 if(wantsTarget&&(!Number.isInteger(target)||target===p||!s.players[target]))throw Error('Choose a player to swap with.');
 hand.splice(i,1);s.discard.push(card);s.color=isWild(card)?color:card.c;s.drawn=null;
 const me=s.players[p];
 note(s,me.name+' played '+describe(card)+(isWild(card)?' → '+COLOR_NAMES[color]:''),{player:p,card:card.id});
 s.seq++;
 if(!hand.length){finish(s,p);return s}
 if(card.v==='discard'){
  const dumped=hand.filter(c=>c.c===card.c);
  if(dumped.length){me.hand=hand.filter(c=>c.c!==card.c);s.discard.splice(s.discard.length-1,0,...dumped);note(s,me.name+' dumped '+dumped.length+' '+COLOR_NAMES[card.c]+' card'+(dumped.length>1?'s':''));if(!me.hand.length){finish(s,p);return s}}
 }
 if(wantsTarget){const other=s.players[target];[me.hand,other.hand]=[other.hand,me.hand];note(s,me.name+' swapped hands with '+other.name)}
 if(s.settings.sevenZero&&card.v==='0'){const hands=s.players.map(x=>x.hand);s.players.forEach((x,k)=>{x.hand=hands[nextIndex(s,k,-1)]});note(s,'Everyone passed their hand '+(s.dir>0?'left':'right'))}
 if(s.oneCard&&s.players[s.oneCard.player].hand.length!==1)s.oneCard=null;
 if(me.hand.length===1){s.oneCard={player:p,called:s.preCalled===p,at:Date.now()};if(s.preCalled===p)note(s,me.name+' called UNO!',{flip:p})}
 s.preCalled=null;
 if(isDraw(card)){
  const amount=DRAW_VALUE[card.v];
  if(s.settings.stacking){s.pending={amount:(s.pending?.amount||0)+amount,top:card.v};advance(s)}
  else{const victim=nextIndex(s);drawCards(s,victim,amount);note(s,s.players[victim].name+' drew '+amount+' and was skipped');advance(s,2)}
  return s;
 }
 if(card.v==='skip'){note(s,s.players[nextIndex(s)].name+' was skipped');advance(s,2);return s}
 if(card.v==='rev'){s.dir*=-1;if(s.players.length===2)advance(s,2);else advance(s);return s}
 if(card.v==='skipall'){note(s,'Everyone was skipped · '+me.name+' goes again');s.drawn=null;s.moves=(s.moves||0)+1;return s}
 advance(s);return s;
}

export function draw(s,p){
 assertTurn(s,p);
 if(s.drawn)throw Error('Play the card you drew or pass.');
 s.seq++;
 if(s.pending){const n=s.pending.amount;const got=drawCards(s,p,n);note(s,s.players[p].name+' drew '+got.length);s.pending=null;clearOne(s,p);advance(s);return {cards:got,ended:true}}
 const got=[];
 do{const [card]=drawCards(s,p,1);if(!card)break;got.push(card);if(canPlayIgnoringDrawn(s,p,card)){s.drawn=card.id;break}}while(s.settings.drawRule==='until');
 clearOne(s,p);
 note(s,s.players[p].name+' drew '+(got.length===1?'a card':got.length+' cards'));
  if(!s.drawn)advance(s);else s.moves=(s.moves||0)+1;
 return {cards:got,ended:!s.drawn};
}
function canPlayIgnoringDrawn(s,p,card){const saved=s.drawn;s.drawn=null;const ok=canPlay(s,p,card);s.drawn=saved;return ok}
function clearOne(s,p){if(s.oneCard?.player===p&&s.players[p].hand.length!==1)s.oneCard=null}

export function pass(s,p){assertTurn(s,p);if(!s.drawn)throw Error('Draw a card first.');s.seq++;note(s,s.players[p].name+' passed');advance(s);return s}

// "FLIP!" — the last-card call. Calling is allowed with two cards on your turn
// (pre-call) or any time you are sitting on one card.
export function callFlip(s,p){
 const n=s.players[p].hand.length;
 if(n===1){s.oneCard={player:p,called:true,at:Date.now()};note(s,s.players[p].name+' called UNO!',{flip:p});s.seq++;return true}
 if(n===2&&s.turn===p){s.preCalled=p;return true}
 return false;
}
export function catchMissed(s,p){
 const o=s.oneCard;if(!o||o.called||s.players[o.player].hand.length!==1)return false;
 drawCards(s,o.player,2);note(s,s.players[o.player].name+' forgot to call UNO! · +2');s.oneCard=null;s.seq++;return true;
}

function finish(s,p){
 s.phase='over';s.winner=p;s.pending=null;s.drawn=null;s.oneCard=null;
 s.points=scoreFor(s,p);
 note(s,s.players[p].name+' wins! +'+s.points.toLocaleString()+' points',{win:p});
}
export function scoreFor(s,p){return 1000+s.players.reduce((sum,x,k)=>k===p?sum:sum+x.hand.reduce((a,c)=>a+cardPoints(c),0),0)}

export function describe(card){return (card.c==='w'?'':COLOR_NAMES[card.c]+' ')+(LABELS[card.v]||card.v)}

// Everything a seat may see. Hands are replaced by counts.
export function publicView(s){
 return {
  players:s.players.map(p=>({id:p.id,name:p.name,bot:p.bot,count:p.hand.length})),
  top:top(s),color:s.color,dir:s.dir,turn:s.turn,pending:s.pending,drawn:!!s.drawn,drawnId:s.drawn,
  oneCard:s.oneCard,phase:s.phase,winner:s.winner,points:s.points||0,deckCount:s.deck.length,
  log:s.log.slice(-12),seq:s.seq,settings:s.settings,startedAt:s.startedAt
 };
}

// Turn timeout: take the safest automatic action for the seat.
export function autoMove(s,p){
 if(s.drawn)return pass(s,p);
 return draw(s,p);
}
