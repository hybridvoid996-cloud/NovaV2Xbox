import {syncChatProfile} from './chat-profile-sync.mjs';
const valid=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
export async function chatDirectoryAction(db,uid,action,b,now=Date.now()){
 if((await db.ref('novaChatV2/bans/'+uid).get()).exists())throw Error('Your Chat access is suspended.');
 if(action==='chatDirectory'){
  let query=db.ref('novaAccounts').orderByKey();if(valid(b.after))query=query.startAt(b.after);const rows=Object.entries((await query.limitToFirst(81).get()).val()||{}).filter(([id])=>id!==b.after).slice(0,80);
  const users=rows.map(([id,a])=>({uid:id,name:String(a.name||'Nova member').slice(0,100),photo:typeof a.photo==='string'&&/^(https:\/\/|data:image\/(?:png|jpeg|webp|gif);base64,)/.test(a.photo)&&a.photo.length<100000?a.photo:'',joined:Number(a.createdAt)||0}));
  return {users,next:rows.length===80?rows.at(-1)[0]:null};
 }
 if(action==='chatMutualFriends'){const other=b.uid;if(!valid(other))throw Error('Choose a Nova profile.');const [mine,theirs]=await Promise.all([db.ref('novaChatV2/friends/'+uid).get(),db.ref('novaChatV2/friends/'+other).get()]);const own=mine.val()||{},target=theirs.val()||{};return {friends:Object.keys(own).filter(id=>own[id]&&target[id]&&id!==uid&&id!==other).slice(0,200)}}
 if(action==='chatRequests')return {requests:(await db.ref('novaChatV2/messageRequests/'+uid).get()).val()||{}};
 const other=b.uid;if(!valid(other)||other===uid)throw Error('Choose another Nova user.');
 if(action==='chatFriendRequest'){const account=(await db.ref('novaAccounts/'+other).get()).val();if(!account||(await db.ref('novaChatV2/bans/'+other).get()).exists())throw Error('This user is unavailable.');await syncChatProfile(db,other,account,now);if(!(await db.ref('novaChatV2/friends/'+uid+'/'+other).get()).val())await db.ref('novaChatV2/requests/'+other+'/'+uid).set({createdAt:now});return {ok:true}}
 if(action==='chatRequestSend'){
  const text=String(b.text||'').trim().slice(0,1000);if(!text)throw Error('Write a message first.');
  if(!(await db.ref('novaAccounts/'+other).get()).exists()||(await db.ref('novaChatV2/bans/'+other).get()).exists())throw Error('This user is unavailable.');
  if((await db.ref('novaChatV2/friends/'+uid+'/'+other).get()).val())throw Error('You are already friends. Open your conversation.');
  const throttle=await db.ref('novaChatV2/requestClock/'+uid).transaction(old=>old&&now-old.at<30000?undefined:{at:now});if(!throttle.committed)throw Error('Wait 30 seconds before sending another request.');
  const result=await db.ref('novaChatV2/messageRequests/'+other+'/'+uid).transaction(old=>old||{text,createdAt:now});return {ok:true,pending:!!result.snapshot.val()};
 }
 if(!['chatRequestAccept','chatRequestIgnore'].includes(action))throw Error('Unknown Chat action.');
 const path='novaChatV2/messageRequests/'+uid+'/'+other,request=(await db.ref(path).get()).val();if(!request)return {ok:true};
 const patch={[path]:null};if(action==='chatRequestAccept'){
  patch['novaChatV2/friends/'+uid+'/'+other]=true;patch['novaChatV2/friends/'+other+'/'+uid]=true;
  const [a,z]=[uid,other].sort();const key='request-'+other;patch['novaChatV2/dms/'+a+'/'+z+'/messages/'+key]={author:other,text:String(request.text).slice(0,1000),createdAt:request.createdAt||now};
 }await db.ref().update(patch);return {ok:true};
}
