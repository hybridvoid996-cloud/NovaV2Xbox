// Online rooms on the Nova Firebase Realtime Database.
// novaFlip/rooms/{code}     room: host, status, settings, players, kicked, game (public view, written by the server)
// novaFlip/hands/{code}/{uid}  private hand, written by the server, readable by that player only
// Games run on Nova's server (server/nova-flip-table.mjs): every player, the host included,
// sends moves to the API and shows what the server publishes.
// novaFlip/lobbies/{code}   open-room directory for the room browser
// novaFlip/invites/{uid}/{from} friend invites (rules require an accepted friendship)
import {nova,publicIdentity,control} from './nova.mjs?v=9';
import {cleanSettings} from './engine.mjs?v=9';
import {RemoteGame} from './session.mjs?v=9';
import {botNames} from './bot.mjs?v=9';

const ROOT='novaFlip';
function localTime(v){if(!v?.serverAt)return v;const skew=Date.now()-v.serverAt;return {...v,deadline:v.deadline?v.deadline+skew:0,oneCard:v.oneCard?{...v.oneCard,at:(v.oneCard.at||v.serverAt)+skew}:v.oneCard}}
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
  if(room.host===nova.user.uid){const host=new Room(code,{isHost:true});await onDisconnect(r('rooms/'+code+'/status')).set('closed');if(room.status==='closed')await set(r('rooms/'+code+'/status'),'lobby');host.listen();host.heartbeat();return host}
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
   if(this.isHost)this.hostTick(prev);
   this.clientTick(prev);
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
 }
 async kick(uid,ban=true){if(!this.isHost||uid===this.me)return;const {update}=fb();await update(r('rooms/'+this.code),{['players/'+uid]:null,...(ban?{['kicked/'+uid]:true}:{})})}
 async addBot(){if(this.players.length>=MAX_PLAYERS)return;const {set}=fb();const taken=this.players.map(p=>p.name);const [name]=botNames(1,taken);await set(r('rooms/'+this.code+'/players/bot-'+Math.random().toString(36).slice(2,8)),{name,bot:true,joinedAt:Date.now()})}
 async updateSettings(patch){const {set}=fb();await set(r('rooms/'+this.code+'/settings'),cleanSettings({...this.settings,...patch}))}
 async setMeta(patch){const {update}=fb();const p={};if('name' in patch)p.name=String(patch.name||'').slice(0,40)||'Nova Flip room';if('visibility' in patch)p.visibility=patch.visibility==='private'?'private':'public';await update(r('rooms/'+this.code),p);this.beat?.()}

 // Calls the Nova Flip API for this room (tests can swap in nova.serverCall).
 call(op,body={}){return (nova.serverCall||control)('novaFlip',{op,room:this.code,...body})}
 async start(){
  if(!this.isHost)return;
  if(this.players.length<2)throw Error('You need at least 2 players. Add a bot or invite a friend.');
  const res=await this.call('tableStart');this.gameId=res.gameId;
 }

 // ---- client side ----
 clientTick(prev){
  const g=this.data.game;
  if(this.data.status==='playing'||g&&g.gameId===this.data.gameId){
   if(!this.game||this.game.gameId!==this.data.gameId){
    this.startTicker();
    this.game?.close();
    const game=new RemoteGame({meId:this.me,send:move=>this.sendMove(move)});game.gameId=this.data.gameId;this.game=game;
    const {onValue}=fb();this.handStop?.();
    this.handStop=onValue(r('hands/'+this.code+'/'+this.me),snap=>{if(this.game===game)game.update(game.v,Object.values(snap.val()||{}))},()=>{});
    this.emit('game',{game});
   }
   // Only ever move forward: an older or repeated view must not replace what we already show.
   if(g&&g.gameId===this.game.gameId&&(!this.game.v||(g.rev||0)>(this.game.v.rev||0))){this.viewAt=Date.now();this.game.update(localTime(g))}
  }
 }
 // Moves go to the server, which checks them against the rules; send only set fields.
 // One move at a time: a double click (or auto-draw racing a click) must not send twice.
 async sendMove(move){
  const clean={};for(const [k,v]of Object.entries(move||{}))if(v!==undefined&&v!==null)clean[k]=v;
  if(this.sending&&clean.type!=='flip')return;
  if(clean.type!=='flip')this.sending=true;
  try{await this.call('tableMove',{gameId:this.data.gameId,move:clean})}
  catch(e){
   // Our view was behind the server. Ask it to republish and show the real turn instead of an error.
   if(/not your turn/i.test(e?.message||'')){this.resync();return}
   throw e;
  }
  finally{if(clean.type!=='flip')this.sending=false}
 }
 async resync(){
  try{await this.call('tableTick')}catch{}
  try{const {get}=fb();const g=(await get(r('rooms/'+this.code+'/game'))).val();if(g&&this.game&&g.gameId===this.game.gameId&&(g.rev||0)>=(this.game.v?.rev||0)){this.viewAt=Date.now();this.game.update(localTime(g))}}catch{}
 }
 // Bots, turn timers and missed last-card calls advance when a client asks the server to "tick".
 // The host ticks; others step in only if the game has gone quiet (e.g. the host lagged).
 startTicker(){
  if(this.ticker)return;
  let busy=false,last=0;
  this.ticker=setInterval(async()=>{
   const v=this.game?.v,now=Date.now();
   if(busy||!v||v.phase!=='play'||this.data?.status!=='playing'||now-last<700)return;
   const quiet=now-(this.viewAt||0);
   const due=(v.players[v.turn]?.bot&&quiet>800)||(v.deadline&&now>v.deadline+400)||(v.oneCard&&!v.oneCard.called&&now-(v.oneCard.at||0)>3300);
   if(!due||(!this.isHost&&quiet<2500))return;
   busy=true;last=now;try{await this.call('tableTick')}catch{}finally{busy=false}
  },300);
 }

 async leave(){
  if(this.left)return;this.left=true;
  const {remove,set,onDisconnect}=fb();
  try{
   if(this.isHost){await remove(r('lobbies/'+this.code));await set(r('rooms/'+this.code+'/status'),'closed')}
   else{await remove(r('rooms/'+this.code+'/players/'+this.me));onDisconnect(r('rooms/'+this.code+'/players/'+this.me)).cancel()}
  }catch{}
  this.dispose();
 }
 dispose(){clearInterval(this.beatTimer);clearInterval(this.ticker);this.ticker=null;for(const s of this.stops)s();this.stops=[];this.handStop?.();this.game?.close();this.listeners.clear()}
}
