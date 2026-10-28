export const NITRO_PRICE=60000;
export function repriceNitro(root,uid,now){
 if(!root)return root;root.nitroReprice||={};if(root.nitroReprice[uid])return root;
 const active=root.nitro?.[uid]===true||root.nitro?.[uid]?.until>now||!!root.boosters?.[uid];if(!active)return root;
 const coins=Number(root.progress?.[uid]?.coins)||0;
 if(coins>=NITRO_PRICE){root.progress[uid].coins=coins-NITRO_PRICE;root.nitroReprice[uid]={at:now,status:'charged',amount:NITRO_PRICE}}
 else{if(root.nitro)delete root.nitro[uid];if(root.boosters)delete root.boosters[uid];root.nitroReprice[uid]={at:now,status:'removed',amount:0}}
 return root;
}
export async function upgradeNitro(db,uid,now){
 const existing=(await db.ref('novaControl/nitroReprice/'+uid).get()).val();let record=existing;
 if(!record){const [premium,booster]=await Promise.all([db.ref('novaControl/nitro/'+uid).get(),db.ref('novaControl/boosters/'+uid).get()]);const value=premium.val();if(!(value===true||value?.until>now||booster.val()))return null;const result=await db.ref('novaControl').transaction(root=>repriceNitro(root,uid,now));record=result.snapshot.val()?.nitroReprice?.[uid]}
 if(record?.status==='charged'&&!record.profileSyncedAt){await db.ref('novaChatV2/profiles/'+uid+'/nitroBooster').set(true);await db.ref('novaControl/nitroReprice/'+uid+'/profileSyncedAt').set(now)}
 if(record?.status==='removed'&&!record.profileSyncedAt){const premium=(await db.ref('novaControl/nitro/'+uid).get()).val();if(!(premium===true||premium?.until>now))await db.ref('novaChatV2/profiles/'+uid).update({nitroBooster:false,profileBorder:null,avatarBorder:null,displayName:null,usernameFont:'default',nitroAnimation:'none',profileTheme:'default'});await db.ref('novaControl/nitroReprice/'+uid+'/profileSyncedAt').set(now)}
 return record&&!record.seen&&['removed','charged'].includes(record.status)?record:null;
}
