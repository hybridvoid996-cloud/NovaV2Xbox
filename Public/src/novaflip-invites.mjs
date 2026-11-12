// Nova home: shows a notification when a friend invites you to a Nova created game
// (Nova Flip rooms and Nova Weed co-op sessions).
import {auth,db} from './account-firebase.js';
import {ref,onChildAdded,onChildChanged,remove} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

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
 if(window.NovaNotice)window.NovaNotice('chat',item);
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
