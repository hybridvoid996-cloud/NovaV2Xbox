import {remoteRelay} from '../server/remote-relay.mjs';
import {canUseComputer} from '../server/computer-access.mjs';
import {withSharedBackend} from '../server/shared-backend.mjs';
import {services} from '../server/voice-service.js';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
const checkedRules=new WeakMap();
async function privateRemoteRules(db){if(Date.now()-(checkedRules.get(db)||0)<60000)return;const {rules}=await db.getRulesJSON();const deny=node=>Object.entries(node||{}).every(([key,value])=>['.read','.write'].includes(key)?value===false:!value||typeof value!=='object'||deny(value));if(rules['.read']!==false||rules['.write']!==false||!deny(rules.novaRemote)||Object.entries(rules).some(([key,value])=>key.startsWith('$')&&!deny(value)))throw failure('Publish the private Nova Remote database rules first.',503);checkedRules.set(db,Date.now());}
const hash=s=>createHash('sha256').update(s).digest('hex'),secret=()=>randomBytes(32).toString('base64url');
const safe=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(s);
const clean=(s,max)=>String(s||'').trim().slice(0,max);
const failure=(message,status=400)=>Object.assign(Error(message),{status});
function matches(value,digest){if(typeof value!=='string'||typeof digest!=='string')return false;const a=Buffer.from(hash(value)),b=Buffer.from(digest);return a.length===b.length&&timingSafeEqual(a,b);}
export const createRemoteHandler=(service=services)=>async(req,res)=>{
 const reply=(status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value))};
 if(req.method!=='POST')return reply(405,{error:'Use POST.'});
 try{
  let b=req.body;if(!b){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>64000)throw failure('Request too large.',413)}b=JSON.parse(raw||'{}')}if(typeof b==='string')b=JSON.parse(b);if(!b||typeof b!=='object')throw failure('Invalid request.');
  const {db,auth}=await service(false),now=Date.now(),root='novaRemote/';await privateRemoteRules(db);
  const read=async path=>(await db.ref(root+path).get()).val(),write=(path,value)=>db.ref(root+path).set(value);
  const action=b.action;
  if(action==='pairStart'){
   const ip=hash(req.headers['x-forwarded-for']?.split(',')[0]||req.socket?.remoteAddress||'unknown');
   const rate=await db.ref(root+'limits/'+ip).transaction(old=>{const v=old&&old.until>now?old:{count:0,until:now+600000};return v.count>=8?undefined:{count:v.count+1,until:v.until}});
   if(!rate.committed)throw failure('Too many pairing attempts. Try again in ten minutes.',429);
   const code=randomBytes(9).toString('hex').toUpperCase(),token=secret();
   await write('pairing/'+code,{tokenHash:hash(token),name:clean(b.name,60)||'Windows PC',os:'Windows',expires:now+600000});return reply(200,{code,token,expires:now+600000});
  }
  if(['pairPoll','pairFinish'].includes(action)){
   if(!safe(b.code))throw failure('Invalid pairing code.');const pair=await read('pairing/'+b.code);
   if(!pair||pair.expires<now||!matches(b.token,pair.tokenHash))throw failure('Pairing expired. Start again.',401);
   if(action==='pairPoll')return reply(200,{claimed:!!pair.uid,owner:pair.owner||null});
   if(!pair.uid)throw failure('Approve the pairing code in your Nova account first.');
   if(!(await canUseComputer(db,pair.uid))||(await db.ref('novaControl/siteBans/'+pair.uid).get()).exists())throw failure('Nova Computer is currently available to owners and admins only.',403);
   // Only the local agent holding its private pairing token can finish registration.
   const credential=secret(),id='NOVA-'+randomBytes(16).toString('hex').toUpperCase();
   const claim=await db.ref(root+'pairing/'+b.code).transaction(value=>value===null?null:value&&!value.finished&&value.expires>now&&value.uid===pair.uid?{...value,finished:true}:undefined);
   if(!claim.committed||!claim.snapshot.val()?.finished)throw failure('This pairing code has already been used.',409);
   await write('devices/'+id,{uid:pair.uid,name:pair.name,os:pair.os,tokenHash:hash(credential),enabled:false,lastSeen:now,createdAt:now});
   await write('pairing/'+b.code,null);const account=(await db.ref('novaAccounts/'+pair.uid).get()).val()||{};return reply(200,{id,credential,name:pair.name,profile:{uid:pair.uid,name:clean(account.name,60)||'Nova player',photo:clean(account.photo,2000)}});
  }
  let uid,device,agent=false;const bearer=(req.headers.authorization||'').replace(/^Bearer /,'');
  if(bearer.startsWith('device:')){
   const [,id,token]=bearer.split(':');if(!safe(id))throw failure('Invalid device.',401);device=await read('devices/'+id);
   if(!device||!matches(token,device.tokenHash))throw failure('Device access revoked.',401);device={...device,id};uid=device.uid;agent=true;
  }else{let who;try{who=await auth.verifyIdToken(bearer,true)}catch{throw failure('Sign into Nova again.',401)}if(who.firebase?.sign_in_provider==='anonymous')throw failure('Use a Nova account.',403);uid=who.uid;}
  if(!(await db.ref('novaAccounts/'+uid).get()).exists()||(await db.ref('novaControl/siteBans/'+uid).get()).exists())throw failure('Account access unavailable.',403);
  if(!(await canUseComputer(db,uid)))throw failure('Nova Computer is currently available to owners and admins only.',403);
  const browserOnly=()=>{if(agent)throw failure('Use your Nova account for this action.',403)};
  const agentOnly=()=>{if(!agent)throw failure('Only the paired computer can approve this action.',403)};
  if(action==='registerDevice'){
   browserOnly();const account=(await db.ref('novaAccounts/'+uid).get()).val();const rows=(await db.ref(root+'devices').orderByChild('uid').equalTo(uid).get()).val()||{};if(Object.keys(rows).length>=20)throw failure('Remove an old computer before adding another.',409);
   const id='NOVA-'+randomBytes(16).toString('hex').toUpperCase(),credential=secret(),name=clean(b.name,60)||'Windows PC';
   await write('devices/'+id,{uid,name,os:'Windows',tokenHash:hash(credential),enabled:false,lastSeen:now,createdAt:now});return reply(200,{id,credential,name,profile:{uid,name:clean(account.name,60)||'Nova player',photo:clean(account.photo,2000)}});
  }
  if(action==='pairClaim'){
   browserOnly();const code=clean(b.code,30).replace(/[\s-]/g,'').toUpperCase();if(!safe(code))throw failure('Invalid pairing code.');const account=(await db.ref('novaAccounts/'+uid).get()).val();
   const result=await db.ref(root+'pairing/'+code).transaction(pair=>pair===null?null:pair&&pair.expires>now&&!pair.finished&&(!pair.uid||pair.uid===uid)?{...pair,uid,owner:clean(account.name,60)}:undefined);
   if(!result.committed||result.snapshot.val()?.uid!==uid)throw failure('Pairing code unavailable or expired. Generate a fresh code in Nova Remote and try again.');return reply(200,{ok:true});
  }
  const publicDevice=d=>({id:d.id,name:d.name,os:d.os,enabled:d.enabled,lastSeen:d.lastSeen,online:d.enabled&&now-d.lastSeen<30000,session:d.session||null});
  if(action==='list'){browserOnly();
   const maintenance=await db.ref(root+'maintenance').transaction(last=>!last||now-last>=600000?now:undefined);
   if(maintenance.committed){const expired={};for(const [path,field]of [['pairing','expires'],['sessions','expires'],['limits','until']]){const rows=(await db.ref(root+path).orderByChild(field).endAt(now).limitToFirst(100).get()).val()||{};for(const [id,row]of Object.entries(rows))if(Number.isFinite(row[field])&&row[field]<=now)expired[path+'/'+id]=null;}if(Object.keys(expired).length)await db.ref(root.slice(0,-1)).update(expired);}
   const all=(await db.ref(root+'devices').orderByChild('uid').equalTo(uid).get()).val()||{};return reply(200,{relayConfigured:remoteRelay().relayConfigured,relayTLSConfigured:remoteRelay().relayTLSConfigured,devices:Object.entries(all).filter(([,d])=>d.uid===uid).map(([id,d])=>publicDevice({...d,id}))});}
  if(action==='heartbeat'){
   agentOnly();await db.ref(root+'devices/'+device.id).update({lastSeen:now});let session=device.session?await read('sessions/'+device.session):null;
   if(session&&(session.expires<=now||session.status==='ended'||!device.enabled)){await db.ref(root+'devices/'+device.id).update({session:null});session=null;}
   const account=(await db.ref('novaAccounts/'+uid).get()).val();return reply(200,{profile:{uid,name:clean(account.name,60)||'Nova player',photo:clean(account.photo,2000)},device:publicDevice({...device,lastSeen:now}),session:session?{id:device.session,status:session.status,viewer:session.viewer,expires:session.expires}:null});
  }
  if(['rename','remove','disable','enable','connect'].includes(action)){
   if(!agent){if(!safe(b.id))throw failure('Invalid device.');const row=await read('devices/'+b.id);if(!row||row.uid!==uid)throw failure('Computer not found.',404);device={...row,id:b.id};}
   if(action==='rename'){browserOnly();const name=clean(b.name,60);if(!name)throw failure('Enter a computer name.');await db.ref(root+'devices/'+device.id).update({name});return reply(200,{ok:true});}
   if(action==='enable'){agentOnly();await db.ref(root+'devices/'+device.id).update({enabled:true,lastSeen:now});return reply(200,{ok:true});}
   if(action==='remove'||action==='disable'){
    if(action==='remove')browserOnly();if(device.session)await db.ref(root+'sessions/'+device.session).update({status:'ended',expires:now});
    if(action==='remove')await write('devices/'+device.id,null);else await db.ref(root+'devices/'+device.id).update({enabled:false,session:null});return reply(200,{ok:true});
   }
   browserOnly();const networkMode=b.networkMode==='relay'?'relay':'auto';if(networkMode==='relay'&&!remoteRelay().relayConfigured)throw failure('Nova’s remote desktop relay is unavailable. Try Automatic connection mode.',503);if(!device.enabled||now-device.lastSeen>=30000)throw failure('Computer is offline or remote access is disabled.');
   const id=secret();const lock=await db.ref(root+'devices/'+device.id).transaction(d=>d===null?null:d&&d.uid===uid&&d.enabled&&now-d.lastSeen<30000&&(!d.session||d.sessionUntil<=now)?{...d,session:id,sessionUntil:now+45000}:undefined);
   if(!lock.committed||lock.snapshot.val()?.session!==id)throw failure('This computer already has a connection request or session.',409);
   await write('sessions/'+id,{uid,device:device.id,status:'requested',networkMode,viewer:clean(b.viewer,100)||'Nova browser',expires:now+45000,createdAt:now,signals:{}});return reply(200,{session:id,expires:now+45000});
  }
  if(!safe(b.session))throw failure('Invalid session.');const session=await read('sessions/'+b.session);
  if(!session||session.uid!==uid||(agent&&session.device!==device.id))throw failure('Session not found.',404);
  const current=await read('devices/'+session.device);if(!current||current.uid!==uid)throw failure('Computer access revoked.',403);
  if(action==='disconnect'){await db.ref(root+'sessions/'+b.session).update({status:'ended',expires:now,signals:null});await db.ref(root+'devices/'+session.device).update({session:null,sessionUntil:null});return reply(200,{ok:true});}
  if(session.expires<=now||session.status==='ended'||!current.enabled||current.session!==b.session)throw failure('Session ended.',410);
  if(action==='approve'){
   agentOnly();if(session.status!=='requested')throw failure('Session has already been approved.',409);
   const approved=await db.ref(root+'sessions/'+b.session).transaction(row=>row===null?null:row&&row.status==='requested'&&row.expires>now?{...row,status:'active',expires:now+3600000}:undefined);if(!approved.committed||approved.snapshot.val()?.status!=='active')throw failure('Session ended before approval.',410);await db.ref(root+'devices/'+device.id).update({sessionUntil:now+3600000});return reply(200,{ok:true});
  }
  if(!['signal','poll'].includes(action))throw failure('Unknown remote action.');
  const side=agent?'host':'viewer',other=agent?'viewer':'host';
  if(action==='signal'){
   if(session.status!=='active')throw failure('Wait for approval on the computer.');const signal=b.signal;
   if(!signal||!['offer','answer','candidate'].includes(signal.type)||JSON.stringify(signal).length>22000)throw failure('Invalid signal.');
   if((['offer','answer'].includes(signal.type)&&typeof signal.sdp!=='string')||(signal.type==='candidate'&&(!signal.candidate||typeof signal.candidate.candidate!=='string')))throw failure('Invalid signal payload.');
   if(signal.type==='offer'&&!agent||signal.type==='answer'&&agent)throw failure('Invalid signaling direction.');
   const result=await db.ref(root+'sessions/'+b.session+'/signals/'+side).transaction(old=>{const rows=old||[];const previous=signal.type!=='candidate'&&rows.find(r=>r.type===signal.type);if(previous)return previous.sdp===signal.sdp?rows:undefined;return rows.length>=160?undefined:[...rows,signal]});if(!result.committed)throw failure('Signaling limit reached.',429);
  }
  const rows=await read('sessions/'+b.session+'/signals/'+other)||[];
  const offset=Number.isSafeInteger(b.offset)&&b.offset>=0?b.offset:0;
  const relay=remoteRelay({uid,expires:session.expires,mode:session.networkMode||'auto'});
  return reply(200,{status:session.status,expires:session.expires,signals:rows.slice(offset),offset:rows.length,...relay});
 }catch(error){return reply(error.status||400,{error:error.message||'Remote service unavailable.'})}
};
export default withSharedBackend('remote',createRemoteHandler());
