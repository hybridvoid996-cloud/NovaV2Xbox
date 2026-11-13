// Nova home: shows a notification when a friend invites you to a Nova created game
// (Nova Flip rooms and Nova Weed co-op sessions).
import {auth,db} from './account-firebase.js';
import {ref,onChildAdded,onChildChanged,remove,get} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const GAMES=[
 {root:'novaFlip',page:'novaflip',name:'Nova Flip',store:'novaflip-join',action:'novaFlipJoin',icon:'✦',text:code=>'Join their room '+code+' and play Nova Flip together.'},
 {root:'novaWeed',page:'novaweed',name:'Nova Weed',store:'novaweed-join',action:'novaWeedJoin',icon:'🌿',text:code=>'Join their session '+code+' and build an empire together in Nova City.'}
];
const shown=new Set();let stop=[];
function open(game,code,from){
 try{sessionStorage.setItem(game.store,code)}catch{}
 const frame=document.getElementById('system');
 if(frame&&new RegExp(game.page+'\\.html').test(frame.getAttribute('src')||'')&&!frame.hidden){frame.contentWindow?.postMessage({novaAction:game.action,code,from},location.origin);try{sessionStorage.removeItem(game.store)}catch{}}
 if(typeof window.openPage==='function')window.openPage(game.page);else location.href='/'+game.page+'.html?room='+encodeURIComponent(code)+'&from='+encodeURIComponent(from);
}
function notify(game,user,from,inv){
 if(!inv||typeof inv.code!=='string'||!/^[A-Z0-9]{5}$/.test(inv.code))return;
 if(Date.now()-Number(inv.at||0)>10*60000)return;
 const key=game.root+':'+from+':'+inv.at;if(shown.has(key))return;shown.add(key);
 const item={sender:game.page+'-'+from,label:game.name+' invite',title:(inv.name||'A friend')+' invited you to play',text:game.text(inv.code),art:typeof inv.photo==='string'&&/^(https:|data:image\/)/.test(inv.photo)?inv.photo:'',icon:game.icon,hint:'Click to join',action:()=>{remove(ref(db,game.root+'/invites/'+user.uid+'/'+from)).catch(()=>{});open(game,inv.code,from)}};
 if(game.root==='novaFlip'){void flipInvite(game,user,from,inv,item);return}
 if(window.NovaNotice)window.NovaNotice('chat',item);
}

// ---- Nova Flip: its own invite card (cards, room details, pot, countdown) ----
const FLIP_CSS=`.nfi{position:fixed;right:18px;top:18px;z-index:2147483000;width:min(360px,calc(100vw - 24px));padding:16px;border-radius:22px;color:#f4f4f8;font:14px system-ui,Segoe UI,sans-serif;background:radial-gradient(120% 100% at 100% 0,#7c4dff33,transparent 55%),radial-gradient(120% 100% at 0 100%,#ff4b6e26,transparent 60%),#121218f2;border:1px solid #ffffff22;box-shadow:0 22px 60px #000b;overflow:hidden;animation:nfi-in .45s cubic-bezier(.16,1,.3,1)}
.nfi:before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,#e3262f,#f4b400,#1f9d49,#1c63d4)}
.nfi-top{display:flex;gap:12px;align-items:center}
.nfi-cards{position:relative;width:58px;height:58px;flex:none}
.nfi-cards i{position:absolute;left:16px;top:6px;width:28px;height:42px;border-radius:5px;border:2.5px solid #fff;box-shadow:0 3px 8px #0008;transform-origin:50% 120%}
.nfi-cards i:nth-child(1){background:#e3262f;transform:rotate(-22deg)}.nfi-cards i:nth-child(2){background:#f4b400;transform:rotate(-7deg)}.nfi-cards i:nth-child(3){background:#1f9d49;transform:rotate(8deg)}.nfi-cards i:nth-child(4){background:#1c63d4;transform:rotate(23deg)}
.nfi-av{position:absolute;right:-4px;bottom:-4px;width:26px;height:26px;border-radius:50%;border:2px solid #121218;background:#2b2b35 center/cover;display:grid;place-items:center;font-size:12px;font-weight:800}
.nfi small{display:block;color:#b9a8ff;font-weight:800;letter-spacing:.14em;font-size:10px}
.nfi h3{margin:2px 0 0;font-size:16px;line-height:1.25}
.nfi-room{margin-top:12px;display:flex;flex-wrap:wrap;gap:6px}
.nfi-room span{padding:4px 10px;border-radius:999px;background:#ffffff10;border:1px solid #ffffff18;font-size:12px}
.nfi-room .pot{color:#ffd36e;border-color:#ffc23d55;background:#ffc23d14;font-weight:800}
.nfi-actions{display:flex;gap:8px;margin-top:14px}
.nfi-actions button{flex:1;padding:11px;border-radius:12px;font:inherit;font-weight:800;cursor:pointer;border:1px solid #ffffff26;background:#ffffff0d;color:#fff}
.nfi-actions .join{background:linear-gradient(90deg,#8b5cff,#ff4b8b);border:0}
.nfi-bar{position:absolute;left:0;bottom:0;height:3px;background:#ffffff55;animation:nfi-bar linear forwards}
@keyframes nfi-in{from{opacity:0;transform:translateY(-12px) scale(.97)}to{opacity:1;transform:none}}
@keyframes nfi-bar{from{width:100%}to{width:0}}
@media(prefers-reduced-motion:reduce){.nfi{animation:none}}
html.reduce-motion .nfi,html.reduce-motion .nfi-bar{animation:none}`;
async function flipInvite(game,user,from,inv,item){
 if(!document.getElementById('nfi-style')){const st=document.createElement('style');st.id='nfi-style';st.textContent=FLIP_CSS;document.head.append(st)}
 let room=null;try{room=(await get(ref(db,'novaFlip/rooms/'+inv.code))).val()}catch{}
 if(room&&room.status==='closed')return;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
 const box=el('section','nfi');box.setAttribute('role','alertdialog');box.setAttribute('aria-label','Nova Flip invite from '+(inv.name||'a friend'));
 const cards=el('div','nfi-cards');for(let i=0;i<4;i++)cards.append(el('i'));
 const av=el('span','nfi-av');if(item.art)av.style.backgroundImage='url("'+item.art.replace(/"/g,'')+'")';else av.textContent=(inv.name||'N')[0].toUpperCase();cards.append(av);
 const copy=el('div');copy.append(el('small','','NOVA FLIP INVITE'),el('h3','',(inv.name||'A friend')+' wants you at their table'));
 const top=el('div','nfi-top');top.append(cards,copy);
 const details=el('div','nfi-room');
 const players=Object.values(room?.players||{}),stakes=Object.values(room?.wagers||{}),pot=stakes.reduce((a,w)=>a+(Number(w?.amount)||0),0);
 details.append(el('span','',(room?.name||'Room')+' · '+inv.code),el('span','',Math.max(1,players.length)+'/4 players'));
 if(room?.settings?.wagers)details.append(el('span','pot',pot?'Pot '+pot.toLocaleString()+' coins':'Betting on · min 5,000'));
 if(room?.settings?.stacking)details.append(el('span','','Stacking'));
 const join=el('button','join','Join game'),decline=el('button','','Decline'),actions=el('div','nfi-actions');actions.append(join,decline);
 const seconds=60,bar=el('i','nfi-bar');bar.style.animationDuration=seconds+'s';
 box.append(top,details,actions,bar);document.body.append(box);
 const close=()=>{clearTimeout(timer);box.remove()};
 const timer=setTimeout(close,seconds*1000);
 join.onclick=()=>{close();item.action()};
 decline.onclick=()=>{close();remove(ref(db,game.root+'/invites/'+user.uid+'/'+from)).catch(()=>{})};
}
auth.onAuthStateChanged(user=>{
 for(const s of stop)s();stop=[];
 if(!user||user.isAnonymous)return;
 for(const game of GAMES){
  const r=ref(db,game.root+'/invites/'+user.uid);
  const handle=snap=>notify(game,user,snap.key,snap.val());
  stop.push(onChildAdded(r,handle,()=>{}),onChildChanged(r,handle,()=>{}));
 }
});
