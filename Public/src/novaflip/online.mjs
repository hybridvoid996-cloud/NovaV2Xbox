// Online rooms on the Nova Firebase Realtime Database.
// novaFlip/rooms/{code}     room: host, status, settings, players, kicked, game (public view), actions
// novaFlip/hands/{code}/{uid}  private hand: readable by that player and the host only
// novaFlip/lobbies/{code}   open-room directory for the room browser
// novaFlip/invites/{uid}/{from} friend invites (rules require an accepted friendship)
import {nova,publicIdentity} from './nova.mjs?v=5';
import {createGame,cleanSettings} from './engine.mjs?v=5';
import {HostedGame,RemoteGame} from './session.mjs?v=5';
import {botNames} from './bot.mjs?v=5';

const ROOT='novaFlip';
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MAX_PLAYERS=4;
const fb=()=>nova.fb,r=path=>fb().ref(nova.db,ROOT+'/'+path);
const newCode=()=>Array.from(crypto.getRandomValues(new Uint32Array(5)),n=>ALPHABET[n%ALPHABET.length]).join('');
export const cleanCode=code=>String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
const seatOrder=players=>Object.entries(players||{}).map(([id,p])=>({id,...p})).sort((a,b)=>(a.joinedAt||0)-(b.joinedAt||0));

export function watchLobbies(cb){
 const {onValue}=fb();
 return onValue(r('lobbies'),snap=>{const now=Date.now();cb(Object.entries(snap.val()||{}).map(([code,l])=>({code,...l})).filter(l=>now-(l.updatedAt||0)<75000&&l.status==='lobby').sort((a,b)=>b.updatedAt-a.updatedAt))},()=>cb([]));
}

export async function sendInvite(friendUid,code){
 const {set}=fb();const me=nova.profile;
 await set(r('invites/'+friendUid+'/'+nova.user.uid),{code,name:me.name,photo:typeof me.photo==='string'&&me.photo.length<2000?me.photo:'',at:Date.now()});
}
export function watchInvites(cb){
 if(!nova.signedIn)return ()=>{};
 const {onValue}=fb();
 return onValue(r('invites/'+nova.user.uid),snap=>cb(Object.entries(snap.val()||{}).map(([from,v])=>({from,...v})).filter(v=>Date.now()-v.at<10*60000)),()=>{});
}
export const clearInvite=from=>fb().remove(r('invites/'+nova.user.uid+'/'+from)).catch(()=>{});

// A room as seen by any member. `isHost` decides who runs the engine.
export class Room{
 constructor(code,{isHost}){this.code=code;this.isHost=isHost;this.me=nova.user.uid;this.data=null;this.listeners=new Set();this.stops=[];this.game=null;this.left=false}
 on(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn)}
 emit(type,extra){for(const fn of this.listeners)fn({type,room:this,...extra})}
 get players(){return seatOrder(this.data?.players)}
 get settings(){return cleanSettings(this.data?.settings)}

 static async create({name,visibility,settings}){
  const {runTransaction,set,onDisconnect,serverTimestamp}=fb();
  let code;
  for(let i=0;i<6&&!code;i++){
   const candidate=newCode();
   const res=await runTransaction(r('rooms/'+candidate),cur=>cur?undefined:{host:nova.user.uid,code:candidate,status:'lobby',name:String(name||nova.profile.name+'’s room').slice(0,40),visibility:visibility==='private'?'private':'public',settings:cleanSettings(settings),createdAt:Date.now(),updatedAt:Date.now(),players:{[nova.user.uid]:{...publicIdentity(),joinedAt:Date.now()}}});
   if(res.committed)code=candidate;
  }
  if(!code)throw Error('Could not create a room. Try again.');
  const room=new Room(code,{isHost:true});
  await onDisconnect(r('rooms/'+code+'/status')).set('closed');
  await onDisconnect(r('lobbies/'+code)).remove();
  room.listen();room.heartbeat();
  return room;
 }

 static async join(code){
  code=cleanCode(code);if(code.length!==5)throw Error('Room codes are 5 characters.');
  const {get,set,onDisconnect}=fb();
  let snap;try{snap=await get(r('rooms/'+code))}catch{throw Error('That room does not exist.')}
  const room=snap.val();
  if(!room||room.status==='closed')throw Error('That room does not exist or has closed.');
  if(room.kicked?.[nova.user.uid])throw Error('The host removed you from this room.');
  const already=!!room.players?.[nova.user.uid];
  if(!already&&room.status!=='lobby')throw Error('That game already started. Wait for the next round.');
  if(!already&&Object.keys(room.players||{}).length>=MAX_PLAYERS)throw Error('That room is full.');
  if(room.host===nova.user.uid){const host=new Room(code,{isHost:true});await onDisconnect(r('rooms/'+code+'/status')).set('closed');await set(r('rooms/'+code+'/status'),room.status==='closed'?'lobby':room.status);host.listen();host.heartbeat();return host}
  if(!already)await set(r('rooms/'+code+'/players/'+nova.user.uid),{...publicIdentity(),joinedAt:Date.now()});
  await onDisconnect(r('rooms/'+code+'/players/'+nova.user.uid)).remove();
  const joined=new Room(code,{isHost:false});joined.listen();return joined;
 }

 listen(){
  const {onValue}=fb();
  this.stops.push(onValue(r('rooms/'+this.code),snap=>{
   const prev=this.data;this.data=snap.val();
   if(!this.data||this.data.status==='closed'){if(!this.isHost){this.emit('closed');this.dispose()}return}
   if(!this.isHost&&prev?.players?.[this.me]&&!this.data.players?.[this.me]){this.emit(this.data.kicked?.[this.me]?'kicked':'removed');this.dispose();return}
   if(this.isHost)this.hostTick(prev);else this.clientTick(prev);
   this.emit('update');
  },e=>{this.emit('error',{error:e});}));
 }

 heartbeat(){
  const beat=()=>{if(this.left||!this.data)return;const {update,set,remove}=fb();const players=this.players;
   update(r('rooms/'+this.code),{updatedAt:Date.now()}).catch(()=>{});
   if(this.data.visibility==='public'&&this.data.status==='lobby')set(r('lobbies/'+this.code),{name:this.data.name,host:nova.profile.name,hostUid:nova.user.uid,count:players.length,max:MAX_PLAYERS,status:'lobby',updatedAt:Date.now(),chaos:this.settings.chaos,stacking:this.settings.stacking}).catch(()=>{});
   else remove(r('lobbies/'+this.code)).catch(()=>{});
  };
  this.beat=beat;beat();this.beatTimer=setInterval(beat,20000);
 }

 // ---- host side ----
 hostTick(prev){
  const players=this.players;
  // Enforce the seat limit: newest extras are removed.
  if(this.data.status==='lobby'&&players.length>MAX_PLAYERS)for(const p of players.slice(MAX_PLAYERS))this.kick(p.id,false);
  if(!prev||prev.status!==this.data.status||prev.visibility!==this.data.visibility||Object.keys(prev.players||{}).length!==players.length)this.beat?.();
  if(this.game){
   // Players who disconnect mid-game are replaced by bots so the match continues.
   for(const p of this.game.s.players)if(!p.bot&&!this.data.players?.[p.id])this.game.replaceWithBot(p.id);
   this.pullActions();
  }
 }
 async kick(uid,ban=true){if(!this.isHost||uid===this.me)return;const {update}=fb();await update(r('rooms/'+this.code),{['players/'+uid]:null,...(ban?{['kicked/'+uid]:true}:{})})}
 async addBot(){if(this.players.length>=MAX_PLAYERS)return;const {set}=fb();const taken=this.players.map(p=>p.name);const [name]=botNames(1,taken);await set(r('rooms/'+this.code+'/players/bot-'+Math.random().toString(36).slice(2,8)),{name,bot:true,joinedAt:Date.now()})}
 async updateSettings(patch){const {set}=fb();await set(r('rooms/'+this.code+'/settings'),cleanSettings({...this.settings,...patch}))}
 async setMeta(patch){const {update}=fb();const p={};if('name' in patch)p.name=String(patch.name||'').slice(0,40)||'Nova Flip room';if('visibility' in patch)p.visibility=patch.visibility==='private'?'private':'public';await update(r('rooms/'+this.code),p);this.beat?.()}

 async start(){
  if(!this.isHost)return;
  const seats=this.players;if(seats.length<2)throw Error('You need at least 2 players. Add a bot or invite a friend.');
  const {update,remove}=fb();
  const state=createGame(seats.map(p=>({id:p.id,name:p.name||'Player',bot:!!p.bot})),this.settings);
  const gameId=crypto.randomUUID();this.gameId=gameId;
  this.game?.close();
  this.game=new HostedGame(state,{meId:this.me,publish:g=>this.publish(g)});
  await remove(r('actions/'+this.code)).catch(()=>{});
  await update(r('rooms/'+this.code),{status:'playing',gameId,startedAt:Date.now(),lastResult:null});
  this.emit('game',{game:this.game});
 }
 publish(g){
  if(!this.gameId)return;
  const {update}=fb();const s=g.s;
  const view=JSON.parse(JSON.stringify({...g.view,gameId:this.gameId}));
  const patch={['rooms/'+this.code+'/game']:view};
  for(const p of s.players)if(!p.bot)patch['hands/'+this.code+'/'+p.id]=p.hand.length?p.hand:null;
  if(s.phase==='over'){
   const w=s.players[s.winner];
   patch['rooms/'+this.code+'/status']='lobby';
   patch['rooms/'+this.code+'/lastResult']={gameId:this.gameId,winner:w.id,winnerName:w.name,points:s.points,at:Date.now(),humans:s.players.filter(p=>!p.bot).length};
  }
  update(fb().ref(nova.db,ROOT),patch).catch(e=>console.error('Nova Flip publish failed',e));
 }
 pullActions(){
  // Actions live at rooms/{code}/actions/{uid}/{push}; the host consumes them in order.
  const acts=this.data.actions||{};const {update}=fb();const clear={};
  for(const [uid,list]of Object.entries(acts))for(const [key,move]of Object.entries(list||{}).sort((a,b)=>(a[1].at||0)-(b[1].at||0))){
   clear['actions/'+uid+'/'+key]=null;
   if(!this.game||move.gameId!==this.gameId)continue;
   const seat=this.game.seatOf(uid);
   try{this.game.apply(seat,{type:move.type,cardId:move.cardId,color:move.color,target:move.target})}catch(e){/* stale or illegal move: ignore */}
  }
  if(Object.keys(clear).length)update(r('rooms/'+this.code),clear).catch(()=>{});
 }

 // ---- client side ----
 clientTick(prev){
  const g=this.data.game;
  if(this.data.status==='playing'||g&&g.gameId===this.data.gameId){
   if(!this.game||this.game.gameId!==this.data.gameId){
    this.game?.close();
    const game=new RemoteGame({meId:this.me,send:move=>this.sendMove(move)});game.gameId=this.data.gameId;this.game=game;
    const {onValue}=fb();this.handStop?.();
    this.handStop=onValue(r('hands/'+this.code+'/'+this.me),snap=>{if(this.game===game)game.update(game.v,Object.values(snap.val()||{}))},()=>{});
    this.emit('game',{game});
   }
   if(g&&g.gameId===this.game.gameId&&g.seq!==this.game.v?.seq||g&&!this.game.v)this.game.update(g);
  }
 }
 // Firebase rejects undefined values, and plain cards have no color/target; send only set fields.
 async sendMove(move){const {push}=fb();const clean={};for(const [k,v]of Object.entries(move||{}))if(v!==undefined&&v!==null)clean[k]=v;await push(r('rooms/'+this.code+'/actions/'+this.me),{...clean,gameId:this.data.gameId,at:Date.now()})}

 async leave(){
  if(this.left)return;this.left=true;
  const {remove,set,onDisconnect}=fb();
  try{
   if(this.isHost){await remove(r('lobbies/'+this.code));await set(r('rooms/'+this.code+'/status'),'closed');await remove(r('hands/'+this.code)).catch(()=>{});}
   else{await remove(r('rooms/'+this.code+'/players/'+this.me));onDisconnect(r('rooms/'+this.code+'/players/'+this.me)).cancel()}
  }catch{}
  this.dispose();
 }
 dispose(){clearInterval(this.beatTimer);for(const s of this.stops)s();this.stops=[];this.handStop?.();this.game?.close();this.listeners.clear()}
}
