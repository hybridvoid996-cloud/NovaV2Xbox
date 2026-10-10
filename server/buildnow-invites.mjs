import {lobbyDetails} from '../Public/src/buildnow-party-info.mjs';
import {randomUUID} from 'node:crypto';
export const partyCode=value=>{const code=String(value||'').trim();if(!/^[A-Za-z0-9_-]{1,32}$/.test(code))throw Error('Enter a valid BuildNow party code (1–32 letters or numbers).');return code;};
export async function buildNowInviteFeed({db,uid,now=Date.now()}){
 const invite=(await db.ref('novaControl/buildNowInvite').get()).val();if(!invite||invite.expiresAt<=now)return {invite:null,joins:[]};
 const authorRole=(await db.ref('novaChatV2/roles/'+invite.author).get()).val();
 const {isProtectedOwner}=await import('./protected-owners.mjs');if(authorRole!=='owner'&&!isProtectedOwner(invite.author))return {invite:null,joins:[]};
 const lobby=invite.lobby&&Number.isFinite(invite.lobby.at)&&now-invite.lobby.at>=0&&now-invite.lobby.at<=15000?lobbyDetails(invite.lobby):null;
 const own=(await db.ref('novaControl/buildNowInviteReplies/'+invite.id+'/'+uid).get()).val();
 const isHost=uid===invite.author,joins=isHost?Object.entries((await db.ref('novaControl/buildNowInviteReplies/'+invite.id).get()).val()||{}).filter(([,value])=>value.phase==='joined').map(([uid,value])=>({uid,name:value.name,photo:value.photo||'',joinedAt:value.joinedAt})).sort((a,b)=>a.joinedAt-b.joinedAt).slice(-500):[];
 return {invite:{id:invite.id,name:invite.name,photo:invite.photo,expiresAt:invite.expiresAt,author:invite.author,code:isHost?invite.code:undefined,phase:own?.phase||null,isHost,lobby},joins};
}
export async function buildNowInviteAction({action,b,db,uid,account,owner,now=Date.now()}){
 if(!action.startsWith('buildNowInvite'))return null;
 const reply=(status,body)=>({status,body}),get=p=>db.ref(p).get().then(s=>s.val());
 if(action==='buildNowInviteFeed')return reply(200,await buildNowInviteFeed({db,uid,now}));
 if(action==='buildNowInvitePublish'){
  if(!owner)return reply(403,{error:'Only owners can invite everyone to BuildNow.'});
  const code=partyCode(b.code),minutes=Number(b.minutes||10);if(!Number.isInteger(minutes)||minutes<1||minutes>60)throw Error('Choose an invite duration of 1–60 minutes.');
  const invite={id:randomUUID(),author:uid,name:account.name||'Nova Owner',photo:account.photo||'',code,createdAt:now,expiresAt:now+minutes*60000};
  await db.ref('novaControl/buildNowInvite').set(invite);await db.ref('novaControl/audit').push({action,actor:uid,at:now,inviteId:invite.id});return reply(200,{ok:true,id:invite.id});
 }
 const invite=await get('novaControl/buildNowInvite');
 if(action==='buildNowInviteEnd'){if(!owner)return reply(403,{error:'Only owners can end this invitation.'});if(invite&&b.id&&b.id!==invite.id)throw Error('This invitation has already been replaced.');await db.ref('novaControl/buildNowInvite').remove();return reply(200,{ok:true});}
 if(!invite||invite.id!==b.id||invite.expiresAt<=now)throw Error('This BuildNow invitation has ended.');
 const feed=await buildNowInviteFeed({db,uid,now});if(!feed.invite)throw Error('This invitation is no longer available.');
 if(action==='buildNowInviteLobby'){if(!owner||uid!==invite.author)return reply(403,{error:'Only the inviting owner can update the live lobby.'});if(partyCode(b.code)!==invite.code)return reply(403,{error:'Lobby code does not match this invitation.'});const lobby={...lobbyDetails(b.lobby),at:now};await db.ref('novaControl/buildNowInvite').transaction(current=>current?.id===invite.id?{...current,lobby}:undefined);return reply(200,{ok:true});}
 const path='novaControl/buildNowInviteReplies/'+invite.id+'/'+uid;
 if(action==='buildNowInviteAccept'){
  if(feed.invite.lobby&&(!feed.invite.lobby.available||feed.invite.lobby.full||!feed.invite.lobby.open))return reply(409,{error:feed.invite.lobby.full?'This BuildNow lobby is full.':!feed.invite.lobby.available?'The owner lobby is unavailable.':'This BuildNow lobby is closed.'});
  const nonce=randomUUID();let receipt;await db.ref(path).transaction(previous=>{if(['accepted','joined'].includes(previous?.phase)&&previous.nonce){receipt=previous;return undefined;}receipt={phase:'accepted',nonce,acceptedAt:now,name:account.name||'Nova member',photo:account.photo||''};return receipt;});
  return reply(200,{ok:true,invite:{id:invite.id,code:invite.code,expiresAt:invite.expiresAt,uid,nonce:receipt.nonce,joined:receipt.phase==='joined'}});
 }
 if(action==='buildNowInviteDecline'){await db.ref(path).transaction(previous=>previous?.phase==='joined'?undefined:{phase:'declined',at:now});return reply(200,{ok:true});}
 if(action==='buildNowInviteJoined'){
  if(partyCode(b.code)!==invite.code)return reply(403,{error:'The joined party does not match the owner code.'});
  const receipt=await get(path);if(!receipt||receipt.nonce!==b.nonce||!['accepted','joined'].includes(receipt.phase))return reply(403,{error:'Accept the invitation before joining.'});
  const result=await db.ref(path).transaction(previous=>previous?.phase==='accepted'&&previous.nonce===b.nonce?{...previous,phase:'joined',joinedAt:now,name:account.name||'Nova member',photo:account.photo||''}:undefined);
  return reply(200,{ok:true,alreadyJoined:!result.committed});
 }
 return reply(400,{error:'Unknown BuildNow invitation action.'});
}
