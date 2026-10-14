import {withSharedBackend} from '../server/shared-backend.mjs';
import {randomUUID} from 'node:crypto';
import {services,validAccount,voiceNameKey} from '../server/voice-service.js';
import {isProtectedOwner} from '../server/protected-owners.mjs';
const profiles=new Map();
import {PUBLIC_VOICE_ROOMS,roomCapacity,voiceIceConfig} from '../server/voice-config.mjs';
async function visibleMembers(db,members,now){
 return Object.fromEntries(await Promise.all(Object.entries(members||{}).filter(([,m])=>m.expires>now).map(async([session,m])=>{
  let cached=profiles.get(m.account);if(!cached||cached.until<now){const profile=(await db.ref('novaChatV2/profiles/'+m.account).get()).val()||{};cached={until:now+15000,name:String(profile.displayName||profile.name||m.account).slice(0,100),picture:typeof profile.photo==='string'?profile.photo:''};if(profiles.size>256)profiles.clear();profiles.set(m.account,cached);}
  return [session,{account:m.account,id:m.uid,name:cached.name,picture:cached.picture,muted:!!m.muted,deafened:!!m.deafened,camera:!!m.camera,screen:!!m.screen}];
 })));
}
export const createVoiceHandler=(service=services)=>async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'Use POST.'});
 try{
  const {db,auth}=await service();
  let user;try{user=await auth.verifyIdToken((req.headers.authorization||'').replace(/^Bearer /,''),true);if(user.firebase?.sign_in_provider==='anonymous')throw Error();}catch{return res.status(401).json({error:'Sign in to your Nova account to use voice.'});}
  const account=user.uid;const profile=(await db.ref('novaAccounts/'+account).get()).val();if(!profile?.onboardingComplete)return res.status(403).json({error:'Complete your Nova account setup first.'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{},now=Date.now();
  if(body.action==='lobby'){const rooms={};for(const id of PUBLIC_VOICE_ROOMS){const room=(await db.ref('novaVoice/rooms/'+id).get()).val();rooms[id]={members:await visibleMembers(db,room?.members,now),capacity:roomCapacity(id)};}return res.json({rooms});}
  if(body.action==='peers'){
   if(!validAccount(body.target))return res.status(400).json({error:'Invalid friend.'});
   const friend=(await db.ref('novaChatV2/friends/'+account+'/'+body.target).get()).exists();if(!friend)return res.status(403).json({error:'You can call your Nova friends only.'});
   const target=(await db.ref('novaVoice/devices/'+body.target).get()).val();const p=(await db.ref('novaChatV2/profiles/'+body.target).get()).val()||{};
   return res.json({peers:target?.account===body.target&&target?.lastSeen>now-60000?[{id:body.target,name:p.name||'Nova friend',picture:p.photo||''}]:[]});
  }
  if(body.action==='invites'){
   await db.ref('novaVoice/devices/'+user.uid).set({account,lastSeen:now});
   await db.ref('novaVoice/directory/'+voiceNameKey(account)+'/'+user.uid).set(now);
   const invites=(await db.ref('novaVoiceInvites/'+user.uid).get()).val()||{};return res.json({invites:Object.entries(invites).filter(([,v])=>v.expires>now).map(([id,v])=>({id,...v})).slice(-5)});
  }
  if(body.action==='decline'){if(!/^[\w-]{1,80}$/.test(body.room||''))return res.status(400).json({error:'Invalid call.'});const invite=db.ref('novaVoiceInvites/'+user.uid+'/'+body.room);if(!(await invite.get()).exists())return res.status(404).json({error:'This invitation has expired.'});await db.ref('novaVoice/rooms/'+body.room+'/ended').set('declined');await invite.remove();return res.json({ok:true});}
  if(body.action!=='leave'){
   const [ban,siteBan,mute]=await Promise.all([db.ref('novaChatV2/bans/'+account).get(),db.ref('novaControl/siteBans/'+account).get(),db.ref('novaChatV2/mutes/'+account).get()]);
   if((!isProtectedOwner(account)&&(ban.exists()||siteBan.exists()))||Number(mute.val())>now)return res.status(403).json({error:'Voice is unavailable while your account is muted or restricted.'});
  }
  let room=body.room;
  if(body.action==='call'){
   const targetId=body.target;if(typeof targetId!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(targetId)||targetId===user.uid)return res.status(400).json({error:'Choose a different Nova voice ID.'});
   const targetDevice=(await db.ref('novaVoice/devices/'+targetId).get()).val();if(targetDevice?.account!==targetId||targetDevice.lastSeen<now-60000)return res.status(409).json({error:'That voice user is offline.'});const target=targetDevice.account;
   if(!(await db.ref('novaChatV2/friends/'+account+'/'+target).get()).exists())return res.status(403).json({error:'You can call your Nova friends only.'});
   const blocks=await Promise.all([db.ref('novaChatV2/blocked/'+account+'/'+target).get(),db.ref('novaChatV2/blocked/'+target+'/'+account).get()]);if(blocks.some(b=>b.exists()))return res.status(403).json({error:'This call is unavailable.'});
   const rate=await db.ref('novaVoice/rates/'+user.uid).transaction(last=>last&&now-last<30000?undefined:now);if(!rate.committed){res.setHeader('Retry-After','30');return res.status(429).json({error:'Wait 30 seconds before calling again.'});}
   room=randomUUID();await db.ref('novaVoice/rooms/'+room).set({allowed:[user.uid,targetId],caller:user.uid,recipient:targetId,label:'Direct call',created:now,ringUntil:now+60000});
   await db.ref('novaVoiceInvites/'+targetId+'/'+room).set({from:profile.name||'Nova friend',fromId:user.uid,room,expires:now+60000});return res.json({room});
  }
  if(!/^[\w-]{1,80}$/.test(room||''))return res.status(400).json({error:'Invalid room.'});
  const ref=db.ref('novaVoice/rooms/'+room),session=body.session;
  if(!/^[\w-]{1,80}$/.test(session||''))return res.status(400).json({error:'Invalid session.'});
  let record=(await ref.get()).val();
  if(!PUBLIC_VOICE_ROOMS.includes(room)&&(!record?.allowed?.includes(user.uid)||now-record.created>4*3600000))return res.status(403).json({error:'This call is not available to your account.'});
  if(!PUBLIC_VOICE_ROOMS.includes(room)&&body.action!=='leave'&&(record.ended||(!record.answered&&record.ringUntil&&record.ringUntil<now)))return res.status(410).json({error:record.ended==='declined'?'Your friend declined the call.':record.ended?'The call ended.':'No answer. Try calling again later.'});
  if(body.action==='join'){
   const result=await ref.transaction(value=>{
    const r=value||{label:room==='server-vc-2'?'VC#2':'VC#1',created:now};const members=Object.fromEntries(Object.entries(r.members||{}).filter(([,m])=>m.expires>now));
    if(Object.hasOwn(members,session)||Object.values(members).some(m=>m.uid===user.uid)||Object.keys(members).length>=roomCapacity(room))return;
    if(r.ended||(!r.answered&&r.ringUntil&&r.ringUntil<now))return;
    return {...r,...(r.recipient===user.uid?{answered:true}:{}),members:{...members,[session]:{uid:user.uid,account,expires:now+90000}}};
   });if(!result.committed)return res.status(409).json({error:'Room is full or you are already connected in another tab.'});
   await db.ref('novaVoiceInvites/'+user.uid+'/'+room).remove();
   return res.json({room,...voiceIceConfig(process.env,user.uid,now)});
  }
  if(record?.members?.[session]?.uid!==user.uid)return res.status(403).json({error:'You are not connected to this room.'});
  if(body.action==='leave'){if(!PUBLIC_VOICE_ROOMS.includes(room)){await ref.child('ended').set('ended');for(const uid of record.allowed||[])await db.ref('novaVoiceInvites/'+uid+'/'+room).remove();}await ref.child('members/'+session).remove();await ref.child('signals/'+session).remove();return res.json({ok:true});}
  if(record.members[session].expires<now)return res.status(409).json({error:'Your voice session expired. Join again.'});
  if(body.action==='poll'){
   const state={expires:now+90000,muted:body.muted===true,deafened:body.deafened===true,screen:body.screen===true,camera:body.camera===true};
   await ref.child('members/'+session).update(state);Object.assign(record.members[session],state);
   const signals=Object.entries(record.signals?.[session]||{}).filter(([,v])=>v.at>now-60000);
   // Explicit acknowledgement prevents dropping signals when a response is lost.
   const ack=[...new Set((Array.isArray(body.ack)?body.ack:[]).slice(0,100).filter(id=>typeof id==='string'&&/^[\w-]{1,80}$/.test(id)))];if(ack.length)await ref.child('signals/'+session).update(Object.fromEntries(ack.map(id=>[id,null])));
   return res.json({members:await visibleMembers(db,record.members,now),signals:signals.map(([id,v])=>({id,...v}))});
  }
  if(body.action==='signal'){
   if(typeof body.to!=='string'||!Object.hasOwn(record.members,body.to)||body.to===session||record.members[body.to].expires<now)return res.status(409).json({error:'The other user left.'});
   if(!['offer','answer','candidate','restart'].includes(body.signal?.type)||JSON.stringify(body.signal).length>30000)return res.status(400).json({error:'Invalid connection message.'});
   const queued=await ref.child('signals/'+body.to).transaction(value=>{const live=Object.fromEntries(Object.entries(value||{}).filter(([,v])=>v.at>now-60000));if(Object.keys(live).length>=160)return;return {...live,[randomUUID()]:{from:session,signal:body.signal,at:now}};});if(!queued.committed){res.setHeader('Retry-After','2');return res.status(429).json({error:'The connection queue is busy. Retrying shortly.'});}return res.json({ok:true});
  }
  return res.status(400).json({error:'Unknown voice action.'});
 }catch(e){console.error('Nova voice request failed',{action:typeof req.body==='object'?req.body?.action:'unknown',code:e.code||e.name});return res.status(503).json({error:e.message?.startsWith('Publish the supplied')||e.message?.startsWith('Add FIREBASE_')?e.message:'Voice could not complete this request. Please reconnect and try again.',code:'VOICE_REQUEST_FAILED'});}
};
export default withSharedBackend('voice',createVoiceHandler());
