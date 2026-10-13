import {createHash} from 'node:crypto';
export async function rewardCodes(db,uid,now){
 const [codes,audit,progress]=await Promise.all(['novaControl/codes','novaControl/audit','novaControl/progress/'+uid].map(p=>db.ref(p).get().then(s=>s.val()||{})));
 const history=new Map();for(const entry of Object.values(audit)){if(entry.action==='code'&&typeof entry.code==='string')history.set(createHash('sha256').update(entry.code.toUpperCase()).digest('hex'),entry);}
 const people=new Map(),result=[];for(const [hash,reward]of Object.entries(codes)){const old=history.get(hash),code=reward.code||old?.code;if(!code)continue;const ownerId=reward.createdBy||old?.actor;let name=reward.createdByName;if(!name&&ownerId){if(!people.has(ownerId))people.set(ownerId,(await db.ref('novaAccounts/'+ownerId).get()).val()?.name||'Nova owner');name=people.get(ownerId);}result.push({code,ownerName:name||'Nova owner',createdAt:reward.createdAt||old?.at||0,expiresAt:reward.expiresAt,coins:reward.coins||0,xp:reward.xp||0,levels:reward.levels||0,multiplier:reward.multiplier||1,minutes:reward.minutes||0,status:reward.disabled?'unavailable':reward.expiresAt<=now?'expired':progress.redeemed?.[hash]?'redeemed':'active'});}
 return {codes:result.sort((a,b)=>b.createdAt-a.createdAt).slice(0,60),serverNow:now};
}
