export function rewardSummary(r){const parts=[];if(r.coins)parts.push(r.coins.toLocaleString('en-US')+' Nova Coins');if(r.xp)parts.push(r.xp.toLocaleString('en-US')+' XP');if(r.levels)parts.push(r.levels+' level'+(r.levels===1?'':'s'));if(r.multiplier>1)parts.push(r.multiplier+'× XP for '+r.minutes+' minutes');return parts.join(' · ')||'No rewards';}
export async function announceCode(db,hash,reward,photo=''){
 const summary=rewardSummary(reward),announcement={id:hash,code:reward.code,ownerName:reward.createdByName,photo,author:reward.createdBy,createdAt:reward.createdAt,expiresAt:reward.expiresAt,rewards:summary};
 const text=reward.createdByName+' has added the code '+reward.code+'!\nRewards: '+summary+'\nExpires: '+new Date(reward.expiresAt).toISOString().replace('T',' ').replace('.000Z',' UTC')+'\nRedeem it from the Nova code notification or Reward Codes.';
 await db.ref().update({['novaControl/codeAnnouncements/'+hash]:announcement,['novaChatV2/channels/announcements/messages/code-'+hash]:{author:'nova-bot',kind:'reward-code',code:reward.code,text,createdAt:reward.createdAt}});
 return announcement;
}
export async function codeAnnouncementFeed(db,since,now){
 if(!Number.isFinite(since)||since<now-60000)return [];
 const all=(await db.ref('novaControl/codeAnnouncements').get()).val()||{};
 return Object.values(all).filter(n=>n.createdAt>=since&&n.createdAt<=now&&n.createdAt>now-60000&&n.expiresAt>now).sort((a,b)=>a.createdAt-b.createdAt).slice(-8);
}
