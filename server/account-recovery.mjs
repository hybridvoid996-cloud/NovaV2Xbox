import {createHash,randomBytes} from 'node:crypto';
import {isProtectedOwner} from './protected-owners.mjs';
const root='novaAccountRecovery/';
const digest=value=>createHash('sha256').update(value).digest('hex');
const name=value=>String(value||'').trim().toLowerCase();
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export async function requireRecoveryPrivacy(db){
 const {rules}=await db.getRulesJSON();
 const denied=node=>Object.entries(node||{}).every(([k,v])=>['.read','.write'].includes(k)?v===false:!v||typeof v!=='object'||denied(v));
 if(rules?.['.read']!==false||rules?.['.write']!==false||!denied(rules.novaAccountRecovery)||Object.entries(rules).some(([k,v])=>k.startsWith('$')&&!denied(v)))throw fail('Private account recovery storage is not configured.',503);
}
async function target(db,auth,uid,issuer){
 if(typeof uid!=='string'||!uid||uid.length>128||/[.#$\[\]/]/.test(uid))throw fail('Choose a valid account.');
 const [profile,ban,role]=await Promise.all(['novaAccounts/'+uid,'novaControl/siteBans/'+uid,'novaChatV2/roles/'+uid].map(path=>db.ref(path).get()));
 if(!profile.exists()||ban.exists())throw fail('This account cannot be recovered.',403);
 if((role.val()==='owner'||isProtectedOwner(uid))&&!isProtectedOwner(issuer))throw fail('Only primary owners can approve owner-account recovery.',403);
 const user=await auth.getUser(uid);if(user.disabled)throw fail('This account cannot be recovered.',403);
 return profile.val();
}
export async function issueAccountRecovery({db,auth,uid,issuer,now=Date.now()}){
 await requireRecoveryPrivacy(db);const profile=await target(db,auth,uid,issuer);
 const code=randomBytes(18).toString('hex').toUpperCase(),hash=digest(code),expiresAt=now+15*60000;
 const previous=(await db.ref(root+'accounts/'+uid).get()).val();
 const patch={['codes/'+hash]:{uid,username:name(profile.username||profile.name),issuer,expiresAt},['accounts/'+uid]:{hash,expiresAt,used:false}};
 if(/^[a-f0-9]{64}$/.test(previous?.hash||''))patch['codes/'+previous.hash]=null;
 await db.ref(root.slice(0,-1)).update(patch);
 await db.ref('novaControl/audit').push({action:'issueAccountRecovery',actor:issuer,target:uid,at:now,expiresAt});
 return {code:code.match(/.{6}/g).join('-'),expiresAt,username:profile.username||profile.name};
}
export async function revokeAccountRecovery({db,auth,uid,issuer,now=Date.now()}){
 await requireRecoveryPrivacy(db);if(typeof uid!=='string'||!uid||uid.length>128||/[.#$\[\]/]/.test(uid))throw fail('Choose a valid account.');
 await target(db,auth,uid,issuer);await db.ref(root+'accounts/'+uid).set(null);
 await db.ref('novaControl/audit').push({action:'revokeAccountRecovery',actor:issuer,target:uid,at:now});return {ok:true};
}
export async function redeemAccountRecovery({db,auth,username,code,ip='unknown',now=Date.now()}){
 await requireRecoveryPrivacy(db);
 const rate=await db.ref(root+'limits/'+digest(String(ip).slice(0,256))).transaction(old=>{const value=old&&old.until>now?old:{count:0,until:now+600000};return value.count>=30?undefined:{count:value.count+1,until:value.until}});
 if(!rate.committed)throw fail('Too many recovery attempts. Try again later.',429);
 const normalized=String(code||'').trim().toUpperCase().replace(/[\s-]/g,'');
 if(!/^[A-F0-9]{36}$/.test(normalized)||!name(username)||String(username).length>100)throw fail('The recovery details are invalid or expired.',401);
 const hash=digest(normalized),record=(await db.ref(root+'codes/'+hash).get()).val();
 if(!record||record.expiresAt<=now||record.username!==name(username))throw fail('The recovery details are invalid or expired.',401);
 const [issuerRole,issuerBan,issuerProfile]=await Promise.all(['novaChatV2/roles/'+record.issuer,'novaControl/siteBans/'+record.issuer,'novaAccounts/'+record.issuer].map(path=>db.ref(path).get()));
 if((!isProtectedOwner(record.issuer)&&issuerRole.val()!=='owner')||issuerBan.exists()||!issuerProfile.exists())throw fail('The recovery details are invalid or expired.',401);
 if((await auth.getUser(record.issuer)).disabled)throw fail('The recovery details are invalid or expired.',401);
 const profile=await target(db,auth,record.uid,record.issuer);if(name(profile.username||profile.name)!==record.username)throw fail('The recovery details are invalid or expired.',401);
 const claim=await db.ref(root+'accounts/'+record.uid).transaction(value=>value===null?null:value&&value.hash===hash&&!value.used&&value.expiresAt>now?{...value,used:true,usedAt:now}:undefined);
 if(!claim.committed||claim.snapshot.val()?.used!==true||claim.snapshot.val()?.hash!==hash)throw fail('The recovery details are invalid or expired.',401);
 const token=await auth.createCustomToken(record.uid);
 await db.ref('novaControl/audit').push({action:'redeemAccountRecovery',actor:record.uid,approvedBy:record.issuer,at:now});
 return {token};
}
