import {readCache,writeCache,migrateAccountCaches,isUnreadableRecord} from './account-cache.js';
import {compactSlots,archived} from './account-slot-cache.js';
import {captureGames,restoreGames,captureWebSession,restoreWebSession} from './account-game-data.js';
import {auth} from './account-firebase.js';
const META='nova-account-data:',OWNER='nova-data-owner';
const identity=new Set(['nova_user','nova_username','nova_account_version']);
export const managed=key=>!identity.has(key)&&!/^nova_(pin|server_progress|server_coins|owner_code)/.test(key)&&!/(?:firebase|password|credential|access.?token|refresh.?token|auth.?token|cookie|session.?token)/i.test(key)&&(key==='monkeymart_config'||key.startsWith('nova_')||/^nova-(ai-chats|v2-favorites|v2-recent-|search)/.test(key)||key.includes('@'));
const snapshot=()=>Object.fromEntries(Object.keys(localStorage).filter(managed).map(key=>[key,localStorage.getItem(key)]));
const read=async uid=>(await readCache(META+uid))||{};
let uid=null,baseline={},pending={},timer,saving,restoring=false,gameCapture,lastGameCapture=0;
async function capture(){if(!gameCapture)gameCapture=captureGames().then(value=>{lastGameCapture=Date.now();return value}).finally(()=>gameCapture=null);return gameCapture;}
async function request(user,operation,entries){const response=await fetch('/api/owner-control',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await user.getIdToken()},signal:AbortSignal.timeout(15000),body:JSON.stringify({action:'accountData',operation,entries})});const data=await response.json();if(!response.ok)throw Error(data.error||'Account backup is unavailable.');return data;}
function saveLocal(){return uid?writeCache(META+uid,{values:snapshot(),pending:{...pending},localPin:localStorage.getItem('nova_pin')}):Promise.resolve();}
function localError(error){dispatchEvent(new CustomEvent('nova-sync-status',{detail:{state:'offline',message:'Local account backup could not be saved. '+error.message}}));}
function changed(){if(!uid||restoring)return;const now=snapshot();const keys=Object.keys(now);if(keys.length===Object.keys(baseline).length&&keys.every(key=>now[key]===baseline[key]))return;for(const key of new Set([...Object.keys(baseline),...Object.keys(now)])){if(baseline[key]!==now[key])pending[key]=now[key]??null;}baseline=now;saveLocal().catch(localError);clearTimeout(timer);if(Object.keys(pending).length)timer=setTimeout(()=>flush({captureGameSaves:false}).catch(()=>{}),1500);}
export async function flush({captureGameSaves=true}={}){clearTimeout(timer);if(saving){await saving;return flush({captureGameSaves});}if(!uid||auth.currentUser?.uid!==uid)return;
 if(captureGameSaves)await capture();await changedWithoutScheduling();const user=auth.currentUser,owner=uid;
 saving=(async()=>{let localGameOnly=false;try{localGameOnly=JSON.parse(localStorage.getItem('nova_game_save_manifest')||'{}').localOnly===true}catch{}const rows=Object.entries(pending).sort(([a,av],[b,bv])=>{const priority=(k,v)=>v===null?2:k==='nova_game_save_manifest'?1:0;return priority(a,av)-priority(b,bv)});let batch=[],size=0;
 async function send(){if(!batch.length)return;const sent=batch;await request(user,'save',sent);if(uid===owner)for(const {key,value}of sent)if(pending[key]===value)delete pending[key];batch=[];size=0;await saveLocal();}
 for(const [key,value]of rows){if(localGameOnly&&/^nova_game_save_(manifest|part_)/.test(key))continue;const entry={key,value},length=JSON.stringify(entry).length;if(length>180000){dispatchEvent(new CustomEvent('nova-sync-status',{detail:{state:'limited',message:'A large local save could not be backed up.'}}));continue;}if(size+length>190000||batch.length>=90)await send();batch.push(entry);size+=length;}
 await send();dispatchEvent(new CustomEvent('nova-sync-status',{detail:{state:localGameOnly?'limited':'saved',message:localGameOnly?'Large game saves are saved on this computer; other account data can sync.':undefined}}));})().catch(error=>{saveLocal().catch(localError);dispatchEvent(new CustomEvent('nova-sync-status',{detail:{state:'offline',message:error.message}}));throw error;}).finally(()=>saving=null);return saving;
}
function changedWithoutScheduling(){const now=snapshot();for(const key of new Set([...Object.keys(baseline),...Object.keys(now)]))if(baseline[key]!==now[key])pending[key]=now[key]??null;baseline=now;return saveLocal().catch(localError);}
export async function activate(user,{fresh=false}={}){
 if(parent!==window&&parent.NovaAccountData){await parent.NovaAccountData.activate(user);return;}
 if(uid===user.uid)return;await migrateAccountCaches();await compactSlots();restoring=true;
 try{
 const storageErrors=[];
 const recoverRead=async readValue=>{try{return await readValue()}catch(error){if(!isUnreadableRecord(error))throw error;storageErrors.push(error);return {};}};
 const previous=localStorage.getItem(OWNER)||localStorage.getItem('nova_user');
 const originalGameManifest=localStorage.getItem('nova_game_save_manifest');
 // Cloud I/O can run while local saves are captured. Apply it only after ownership checks.
 const cloudTask=request(user,'load').then(data=>({data}),error=>({error}));
 if(previous)try{await capture();if(previous!==user.uid)await captureWebSession(previous)}catch(error){restoring=false;if(previous===user.uid){uid=user.uid;baseline=snapshot();pending=(await recoverRead(()=>read(uid))).pending||{};if(storageErrors.length)pending={...baseline,...pending};localStorage.setItem(OWNER,uid);await saveLocal();dispatchEvent(new CustomEvent('nova-sync-status',{detail:{state:'limited',message:error.message}}));return;}throw error;}
 if(previous&&previous!==user.uid){const prior=await recoverRead(()=>read(previous)),values=snapshot(),queued={...(prior.pending||{})};for(const key of new Set([...Object.keys(prior.values||{}),...Object.keys(values)]))if(prior.values?.[key]!==values[key])queued[key]=values[key]??null;await writeCache(META+previous,{values,pending:queued,localPin:localStorage.getItem('nova_pin')});}
 const targetReadStart=storageErrors.length;
 const local=await recoverRead(()=>read(user.uid));if(!local.values){const legacy=await recoverRead(()=>archived(user.uid));if(Object.keys(legacy||{}).length)local.values=legacy;}const targetUnreadable=storageErrors.length>targetReadStart;if(!fresh&&previous===user.uid&&localStorage.getItem('nova_pin'))local.localPin=localStorage.getItem('nova_pin');let values=local.values||{};pending=local.pending||{};
 if(previous===user.uid&&local.values){const current=snapshot();for(const key of new Set([...Object.keys(local.values),...Object.keys(current)]))if(local.values[key]!==current[key])pending[key]=current[key]??null;values=current;}
 // Adopt existing browser data only for its established owner, never a new account.
 if(!fresh&&!local.values&&previous===user.uid){values=snapshot();pending={...values,...pending};}
 if(fresh){values={};pending={};}
 let cloudError;
 try{const result=await cloudTask;if(result.error)throw result.error;const cloud=result.data;values=Object.fromEntries((cloud.entries||[]).filter(e=>managed(e.key)&&typeof e.value==='string').map(e=>[e.key,e.value]));for(const [key,value]of Object.entries(pending)){if(value===null)delete values[key];else values[key]=value;}}
 catch(error){cloudError=error;}
 // Never clear the previous user's data when the target backup is unreadable
 // and its cloud copy is unavailable. The current owner can keep using live data.
 if(cloudError&&targetUnreadable&&previous!==user.uid&&!fresh&&!local.values)throw Error('Your local account backup could not be read, and cloud recovery is unavailable. Reconnect and try again; your current saves have been kept.');
 try{for(const key of Object.keys(localStorage).filter(managed))localStorage.removeItem(key);for(const [key,value]of Object.entries(values))if(managed(key))localStorage.setItem(key,value);uid=user.uid;localStorage.removeItem('nova_pin');if(!fresh&&local.localPin)localStorage.setItem('nova_pin',local.localPin);localStorage.setItem(OWNER,uid);baseline=snapshot();await saveLocal();if(previous!==user.uid||(!cloudError&&originalGameManifest!==localStorage.getItem('nova_game_save_manifest')))await restoreGames();if(previous!==user.uid)await restoreWebSession(user.uid);}
 finally{restoring=false;}
 dispatchEvent(new Event('storage'));dispatchEvent(new CustomEvent('nova-sync-status',{detail:{state:cloudError?'offline':storageErrors.length?'limited':'ready',message:cloudError?.message||(storageErrors.length?'An unreadable local backup was rebuilt from available account data. Any unsynced data stored only in that damaged backup may be unavailable.':undefined)}}));
 if(!cloudError&&Object.keys(pending).length)flush().catch(()=>{});
 }finally{restoring=false;}
}
// Polling also observes writes inside proxied frames, which have separate JS realms.
setInterval(()=>{if(uid&&!document.hidden)changed()},5000);
// Keep lightweight settings sync frequent; batch expensive binary game archives.
// Active sessions still receive periodic backups, spaced about five minutes apart.
function periodicGames(){if(!uid||document.hidden||restoring)return;const panel=document.getElementById?.('panel');const busy=panel&&!panel.hidden&&['game','app','cloud'].includes(panel.dataset.view);if(busy&&Date.now()-lastGameCapture<300000)return;capture().then(changed).catch(error=>dispatchEvent(new CustomEvent('nova-sync-status',{detail:{state:'limited',message:error.message}})));}
setInterval(periodicGames,60000);
addEventListener('nova-background-visibility',event=>{if(event.detail.visible)periodicGames()});
addEventListener('storage',event=>{if(event.key===OWNER&&uid&&event.newValue!==uid){uid=null;location.replace('home.html');return;}if(!restoring)changed()});
addEventListener('pagehide',()=>{if(uid){changedWithoutScheduling();flush().catch(()=>{})}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&uid){changedWithoutScheduling();flush().catch(()=>{})}});
window.NovaAccountData={activate,flush};
