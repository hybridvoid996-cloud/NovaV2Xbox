// Nova home: shows a notification when a friend invites you to a Nova Flip room.
import {auth,db} from './account-firebase.js';
import {ref,onChildAdded,onChildChanged,remove} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const shown=new Set();let stop=[];
function open(code,from){
 try{sessionStorage.setItem('novaflip-join',code)}catch{}
 const frame=document.getElementById('system');
 if(frame&&/novaflip\.html/.test(frame.getAttribute('src')||'')&&!frame.hidden){frame.contentWindow?.postMessage({novaAction:'novaFlipJoin',code,from},location.origin);try{sessionStorage.removeItem('novaflip-join')}catch{}}
 if(typeof window.openPage==='function')window.openPage('novaflip');else location.href='/novaflip.html?room='+encodeURIComponent(code)+'&from='+encodeURIComponent(from);
}
function notify(user,from,inv){
 if(!inv||typeof inv.code!=='string'||!/^[A-Z0-9]{5}$/.test(inv.code))return;
 if(Date.now()-Number(inv.at||0)>10*60000)return;
 const key=from+':'+inv.at;if(shown.has(key))return;shown.add(key);
 const item={sender:'novaflip-'+from,label:'Nova Flip invite',title:(inv.name||'A friend')+' invited you to play',text:'Join their room '+inv.code+' and play Nova Flip together.',art:typeof inv.photo==='string'&&/^(https:|data:image\/)/.test(inv.photo)?inv.photo:'',icon:'✦',hint:'Click to join',action:()=>{remove(ref(db,'novaFlip/invites/'+user.uid+'/'+from)).catch(()=>{});open(inv.code,from)}};
 if(window.NovaNotice)window.NovaNotice('chat',item);
}
auth.onAuthStateChanged(user=>{
 for(const s of stop)s();stop=[];
 if(!user||user.isAnonymous)return;
 const r=ref(db,'novaFlip/invites/'+user.uid);
 const handle=snap=>notify(user,snap.key,snap.val());
 stop.push(onChildAdded(r,handle,()=>{}),onChildChanged(r,handle,()=>{}));
});
