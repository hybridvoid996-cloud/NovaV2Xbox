// Account identity comes from the verified server account, never a caller-supplied UID.
export async function syncChatProfile(db,uid,account,now=Date.now()){
 const ref=db.ref('novaChatV2/profiles/'+uid),old=(await ref.get()).val()||{};
 const validTime=value=>Number.isFinite(value)&&value>0&&value<8640000000000000;
 const name=typeof account.name==='string'?account.name.trim():'';
 if(name.length<2||name.length>100)throw Error('Your Nova account needs a valid profile name.');
 const photo=typeof account.photo==='string'&&account.photo.length<=99999?account.photo:typeof old.photo==='string'&&old.photo.length<=99999?old.photo:'';
 const joined=validTime(old.joined)?old.joined:validTime(account.createdAt)?account.createdAt:now;
 if(old.name!==name||old.photo!==photo||old.joined!==joined||old.username!==(account.username||account.name))await ref.update({name,photo,joined,username:account.username||account.name});
 return {ok:true};
}
