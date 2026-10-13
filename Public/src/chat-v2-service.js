import {auth,db} from './account-firebase.js';
import {ref,get,set,update,remove,push,onValue,query,limitToLast,serverTimestamp,onDisconnect,runTransaction} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
export const ROOT='novaChatV2';
export async function login(){await auth.authStateReady();const u=auth.currentUser;if(!u||u.isAnonymous)throw Error('Sign in with your new Nova account to use Chat.');const s=await get(ref(db,'novaAccounts/'+u.uid));if(!s.exists())throw Error('Complete your Nova account setup first.');return {uid:u.uid,email:u.email,...s.val()}}
export const read=async path=>(await get(ref(db,ROOT+'/'+path))).val();
export const write=(path,value)=>set(ref(db,ROOT+'/'+path),value);
export const patch=values=>update(ref(db,ROOT),values);
export const del=path=>remove(ref(db,ROOT+'/'+path));
export async function send(path,value,options={}){const message=push(ref(db,ROOT+'/'+path));if(options.slowMode>0&&/^channels\/[^/]+\/messages$/.test(path)){try{await set(ref(db,ROOT+'/channelSendClock/'+path.split('/')[1]+'/'+auth.currentUser.uid),{at:serverTimestamp(),key:message.key})}catch{throw Error('Slow mode: wait before sending again. If this is your first message, the owner needs to publish the updated chat rules.')}}try{await set(ref(db,ROOT+'/sendClock/'+auth.currentUser.uid),{at:serverTimestamp(),key:message.key,path})}catch(e){if(e.code==='PERMISSION_DENIED')throw Error('Please wait two seconds before sending again. If this persists, check the chat rules.');throw e}await set(message,{...value,createdAt:serverTimestamp()})}
export const watch=(path,fn,error,limit)=>onValue(limit?query(ref(db,ROOT+'/'+path),limitToLast(limit)):ref(db,ROOT+'/'+path),s=>fn(s.val()||{}),error);
export async function presence(uid){if(parent!==window)return ()=>{};const p=ref(db,ROOT+'/presence/'+uid);const stop=onValue(ref(db,'.info/connected'),async s=>{if(s.val()){await onDisconnect(p).remove();await update(p,{online:true,updatedAt:serverTimestamp()})}});return ()=>{stop();remove(p)}}
export async function saveAccount(uid,name,photo){await update(ref(db,'novaAccounts/'+uid),{name,photo,updatedAt:Date.now()});await update(ref(db,ROOT+'/profiles/'+uid),{name,photo});}
export async function resetPassword(){const {sendPasswordResetEmail}=await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');await sendPasswordResetEmail(auth,auth.currentUser.email)}
export async function claimOwner(code){const response=await fetch('/api/chat-owner',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await auth.currentUser.getIdToken()},body:JSON.stringify({code})});const data=await response.json();if(!response.ok)throw Error(data.error||'Owner setup failed.')}
import {watchMemberGroups} from './chat-group-list.js';
export const watchGroups=(uid,fn,error)=>watchMemberGroups(db,uid,fn,error);
export async function createGroup(uid,name,members){const key=push(ref(db,ROOT+'/groups')).key;await write('groups/'+key,{name,owner:uid,members:Object.fromEntries([uid,...members].map(id=>[id,true]))});await patch(Object.fromEntries([uid,...members].map(id=>['userGroups/'+id+'/'+key,true])));return key}

export async function toggleReaction(path,uid,emoji){const key=Array.from(emoji).map(c=>c.codePointAt(0).toString(16)).join('-');await runTransaction(ref(db,ROOT+'/reactions/'+path+'/'+uid),value=>{const next=typeof value==='string'?{[Array.from(value).map(c=>c.codePointAt(0).toString(16)).join('-')]:value}:{...(value||{})};if(next[key])delete next[key];else next[key]=emoji;return Object.keys(next).length?next:null})}

export async function changePassword(password){await auth.authStateReady();if(!auth.currentUser||auth.currentUser.isAnonymous)throw Error("Sign into Nova first.");const {updatePassword}=await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");await updatePassword(auth.currentUser,password)}
