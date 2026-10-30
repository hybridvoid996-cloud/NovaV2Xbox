import {compactSlots} from './account-slot-cache.js';
import {activate,flush} from './account-data.js?v=20261029-gamebackup406';
import {app,auth} from './account-firebase.js';
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {getAuth,updateCurrentUser,setPersistence,browserLocalPersistence} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
const key='nova-account-slots';
export const slots=()=>{try{return (()=>{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(p=>p&&typeof p.uid==='string'&&p.uid&&typeof p.name==='string').filter((p,i,list)=>list.findIndex(x=>x.uid===p.uid)===i).slice(0,2):[]})()}catch{return []}};
const prefs=()=>Object.fromEntries(Object.keys(localStorage).filter(k=>(/^nova_/.test(k)||['nova-ai-chats','nova-v2-favorites'].includes(k))&&!['nova_user','nova_username','nova_account_version'].includes(k)).map(k=>[k,localStorage.getItem(k)]));
async function slotAuth(index){const name='nova-slot-'+index;const a=getApps().find(a=>a.name===name)||initializeApp(app.options,name);const result=getAuth(a);await result.authStateReady();await setPersistence(result,browserLocalPersistence);return result}
export async function remember(user,profile){await compactSlots();const list=slots();let index=list.findIndex(p=>p.uid===user.uid);if(index<0){if(list.length>=2)return false;index=list.length}await updateCurrentUser(await slotAuth(index),user);list[index]={uid:user.uid,name:profile?.name||user.displayName||'Player',photo:profile?.photo||''};localStorage.setItem(key,JSON.stringify(list));return true;}
export async function switchAccount(index){const list=slots(),target=list[index];if(!target)return;await compactSlots();const saved=await slotAuth(index);if(!saved.currentUser){location.href='account.html';return}await flush().catch(()=>{});sessionStorage.setItem('nova-manual-account-once','true');sessionStorage.setItem('nova-account-switch-notice','true');await updateCurrentUser(auth,saved.currentUser);localStorage.setItem('nova_user',target.uid);localStorage.setItem('nova_account_version','2');location.replace('home.html');}
export async function addAccount(){if(slots().length>=2)return;await flush().catch(()=>{});await auth.authStateReady();if(auth.currentUser)await remember(auth.currentUser,window.novaHomeProfile||{name:auth.currentUser.displayName||'Player'});sessionStorage.setItem('nova-adding-account','true');location.href='account.html?add=1';}
export async function restoreSavedAccount(){
 await auth.authStateReady();if(auth.currentUser)return auth.currentUser;
 if(localStorage.getItem('nova-login-handoff-signed-out')||sessionStorage.getItem('nova-adding-account'))return null;
 const list=slots(),expected=localStorage.getItem('nova_user')||localStorage.getItem('nova-main-default-account');
 const index=expected?list.findIndex(p=>p.uid===expected):list.length===1?0:-1;if(index<0)return null;
 const saved=await slotAuth(index),user=saved.currentUser;if(!user||user.isAnonymous||user.uid!==list[index].uid)return null;
 // Restore only a Firebase-managed saved session, never a password or profile cache.
 await updateCurrentUser(auth,user);return auth.currentUser;
}
