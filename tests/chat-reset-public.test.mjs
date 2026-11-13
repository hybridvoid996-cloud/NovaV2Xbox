import test from 'node:test';import assert from 'node:assert/strict';
import {manageServer} from '../server/chat-server.mjs';
function memoryDb(tree){
 const parts=p=>p.split('/').filter(Boolean),at=p=>parts(p).reduce((n,k)=>n==null?n:n[k],tree);
 const put=(p,v)=>{const k=parts(p),last=k.pop();let n=tree;for(const key of k){if(typeof n[key]!=='object'||n[key]===null)n[key]={};n=n[key]}if(v==null)delete n[last];else n[last]=v};
 return {tree,ref:(p='')=>({get:async()=>({val:()=>at(p)??null,exists:()=>at(p)!=null}),set:async v=>put(p,v),remove:async()=>put(p,null),update:async patch=>{for(const [k,v]of Object.entries(patch))put((p?p+'/':'')+k,v)}})};
}
const seed=()=>({novaChatV2:{roles:{own:'owner',mod:'moderator'},serverChannels:{memes:{name:'memes'},rules:{name:'rules',readOnly:true}},
 channels:{general:{messages:{a:{text:'hi'}}},announcements:{messages:{b:{text:'news'}}},'owner-lounge':{messages:{c:{text:'staff'}}},memes:{messages:{d:{text:'lol'}}},rules:{messages:{e:{text:'be nice'}}}},
 dms:{own:{x:{messages:{f:{text:'dm'}}}}},groupMessages:{g1:{h:{text:'group'}}},feedback:{u:{r1:{text:'report'}}}}});
test('owner clears public chat but keeps owner channels, reports, DMs and groups',async()=>{
 const db=memoryDb(seed());
 await assert.rejects(manageServer(db,'own',{kind:'resetPublic'}),/CLEAR PUBLIC CHAT/);
 const r=await manageServer(db,'own',{kind:'resetPublic',confirm:'CLEAR PUBLIC CHAT'});
 const ch=db.tree.novaChatV2.channels;
 assert.equal(ch.general,undefined);assert.equal(ch.memes,undefined);
 assert.ok(ch.announcements&&ch['owner-lounge']&&ch.rules);
 assert.ok(db.tree.novaChatV2.dms.own.x.messages.f&&db.tree.novaChatV2.groupMessages.g1.h&&db.tree.novaChatV2.feedback.u.r1);
 assert.ok(r.cleared.includes('general')&&r.cleared.includes('memes')&&!r.cleared.includes('rules'));
});
test('only the owner can clear public chat',async()=>{
 const db=memoryDb(seed());
 await assert.rejects(manageServer(db,'mod',{kind:'resetPublic',confirm:'CLEAR PUBLIC CHAT'}),/Only owners/);
});
