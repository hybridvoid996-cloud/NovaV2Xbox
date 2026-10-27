import {randomBytes,createHash} from 'node:crypto';
import {claimStreak,restoreStreak,streakStatus,utcDay,INVITE_REWARD} from '../Public/src/streak-core.mjs';
const DAY=86400000,validToken=t=>typeof t==='string'&&/^[a-f0-9]{32}$/.test(t);
const deviceHash=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value)?createHash('sha256').update('nova-device-v1:'+value).digest('hex'):null;
const mailbox=email=>{if(typeof email!=='string'||!email)return null;let [name,host]=email.toLowerCase().split('@');if(['gmail.com','googlemail.com'].includes(host)){name=name.split('+')[0].replaceAll('.','');host='gmail.com'}return createHash('sha256').update(name+'@'+host).digest('hex')};
const state=root=>{root.referrals||={};const r=root.referrals;for(const key of ['links','users','claimed','devices','mailboxes','outbox'])r[key]||={};root.progress||={};return r};
const notice=(r,uid,id,subject,text,now)=>{r.outbox[uid]||={};r.outbox[uid][id]={author:'nova-bot',kind:'account-update',subject,text,staffName:'Nova',staffRole:'member',createdAt:now}};
export function createReferral(root,uid,{token,device,name},now){
 if(root.siteBans?.[uid])throw Error('Invites are unavailable while Nova access is suspended.');const r=state(root),day=utcDay(now),user=r.users[uid]||={};if(Number(user.day)>day)throw Error('Invite day changed. Refresh and try again.');if(user.day!==day){user.day=day;user.created=0;user.rewarded=0}if(user.created>=5)throw Error('You can create five invite links per UTC day.');
 if(!device)throw Error('Enable browser storage to create an invite.');user.created++;user.links||={};user.links[token]=now;r.devices[device]||=uid;r.links[token]={from:uid,name:String(name||'A Nova friend').slice(0,100),device,at:now,expiresAt:now+7*DAY,status:'pending'};
 notice(r,uid,'invite-pending-'+token,'Your friend invite is pending','Your invite is ready. We are waiting for your friend to create their first Nova account.',now);return root;
}
export function settleReferral(root,uid,{token,device,creationTime,emailHash,firstVisit,joinerName},now){
 const r=state(root),link=r.links[token];if(!link)throw Error('This invite link is not valid.');if(link.status==='completed'&&link.joined===uid)return root;
 if(root.siteBans?.[uid]||root.siteBans?.[link.from])throw Error('This invite is no longer available.');if(link.status!=='pending'||link.expiresAt<now)throw Error('This invite has expired or already been used.');if(link.from===uid)throw Error('You cannot use your own invite.');
 if(!firstVisit||!device||device===link.device||r.devices[device]&&r.devices[device]!==uid)throw Error('Invite bonuses are for first-time Nova visitors on a new browser, not alternate accounts.');
 if(!Number.isFinite(creationTime)||creationTime<Math.floor(link.at/1000)*1000||creationTime>now+5000||now-creationTime>DAY)throw Error('Only a brand-new Nova account created after this invite can receive the bonus.');
 if(r.claimed[uid])throw Error('This account has already used a friend invite.');if(emailHash&&r.mailboxes[emailHash]&&r.mailboxes[emailHash]!==uid)throw Error('This account is not eligible for another invite bonus.');
 const inviter=r.users[link.from]||={},day=utcDay(now);if(Number(inviter.day)>day)throw Error('Invite day changed. Refresh and try again.');if(inviter.day!==day){inviter.day=day;inviter.created=0;inviter.rewarded=0}if((inviter.rewarded||0)>=3)throw Error('Your inviter has reached today’s three-friend bonus limit. Try again after midnight UTC.');
 inviter.rewarded=(inviter.rewarded||0)+1;r.users[link.from]=inviter;r.claimed[uid]=token;r.devices[device]=uid;if(emailHash)r.mailboxes[emailHash]=uid;link.status='completed';link.joined=uid;link.joinedName=String(joinerName||'Your friend').slice(0,100);link.completedAt=now;
 for(const id of [uid,link.from]){root.progress[id]||={xp:0,coins:0,challenges:[]};root.progress[id].coins=(Number(root.progress[id].coins)||0)+INVITE_REWARD}
 notice(r,link.from,'invite-complete-'+token,'Your friend joined Nova!',link.joinedName+' created their account. You both received 300,000 Nova Coins.',now);
 notice(r,uid,'invite-welcome-'+token,'You were invited to Nova',link.name+' invited you to Nova. You received 300,000 Nova Coins. Have fun!',now);return root;
}
async function flushNotices(db,uid){const rows=(await db.ref('novaControl/referrals/outbox/'+uid).get()).val()||{};const updates={};for(const [id,n]of Object.entries(rows)){updates['novaChatV2/botMessages/'+uid+'/'+id]=n;updates['novaControl/referrals/outbox/'+uid+'/'+id]=null}if(Object.keys(updates).length)await db.ref().update(updates)}
export async function dailyRewards({db,auth,uid,account,action,b={},now=Date.now()}){
 const device=deviceHash(b.device);
 if(action==='streakClaim'||action==='streakRestore'){
  let awarded=0;const tx=await db.ref('novaControl/progress/'+uid).transaction(old=>{const p=old||{xp:0,coins:0,challenges:[]};if(action==='streakRestore')return restoreStreak(p,now);const result=claimStreak(p,now);awarded=result.awarded;return result.progress});const p=tx.snapshot.val();return {streak:streakStatus(p.streak,now),coins:p.coins,awarded};
 }
 if(action==='friendInviteCreate'){
  const sender=await auth.getUser(uid);if(!Number.isFinite(Date.parse(sender.metadata?.creationTime))||now-Date.parse(sender.metadata.creationTime)<DAY)throw Error('Your account must be at least 24 hours old before creating invite links.');const token=randomBytes(16).toString('hex');await db.ref('novaControl').transaction(root=>createReferral(root||{},uid,{token,device,name:account.name},now));await flushNotices(db,uid);return {token,expiresAt:now+7*DAY};
 }
 if(action==='friendInviteClaim'){
  if(!validToken(b.token))throw Error('Invalid invite.');if(account.onboardingComplete!==true)throw Error('Finish setting up your Nova account first.');const user=await auth.getUser(uid),creationTime=Date.parse(user.metadata?.creationTime),emailHash=mailbox(user.email);
  const link=(await db.ref('novaControl/referrals/links/'+b.token).get()).val();if(link?.from===uid)throw Error('You cannot use your own invite.');if(link?.from){const sender=await auth.getUser(link.from);if(sender.disabled)throw Error('This invite is no longer available.');if(mailbox(sender.email)&&mailbox(sender.email)===emailHash)throw Error('You cannot invite another account using the same mailbox.');}
  const result=await db.ref('novaControl').transaction(root=>settleReferral(root||{},uid,{token:b.token,device,creationTime,emailHash,firstVisit:b.firstVisit===true,joinerName:account.name},now));await Promise.all([flushNotices(db,uid),...(link?.from?[flushNotices(db,link.from)]:[])]);return {ok:true,coins:result.snapshot.val().progress[uid].coins,inviterName:link?.name||'A Nova friend'};
 }
 if(action==='dailyRewardsStatus'){
  await flushNotices(db,uid);if(device)await db.ref('novaControl/referrals/devices/'+device).transaction(owner=>owner||uid);
  const [progress,user]=await Promise.all([db.ref('novaControl/progress/'+uid).get(),db.ref('novaControl/referrals/users/'+uid).get()]);const p=progress.val()||{},tokens=Object.entries(user.val()?.links||{}).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([token])=>token);const invites=await Promise.all(tokens.map(async token=>{const link=(await db.ref('novaControl/referrals/links/'+token).get()).val();return link?{token,status:link.status==='pending'&&link.expiresAt<now?'expired':link.status,at:link.at,completedAt:link.completedAt||null,name:link.joinedName||''}:null}));return {streak:streakStatus(p.streak,now),coins:Number(p.coins)||0,invites:invites.filter(Boolean),serverNow:now};
 }
 if(action==='streakProfile'){
  const id=b.uid||uid;if(typeof id!=='string'||id.length>128||/[.#$\[\]\/]/.test(id))throw Error('Choose a Nova profile.');const s=(await db.ref('novaControl/progress/'+id+'/streak').get()).val();const status=streakStatus(s||{},now);return {streak:{count:status.count,broken:status.broken}};
 }
}
