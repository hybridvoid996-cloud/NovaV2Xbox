// Normal game loading does not depend on the Nova account SDK. Load it only for an accepted invite.
const pendingKey='nova_buildnow_party_join_v1';let currentAuth;
const auth={get currentUser(){return currentAuth?.currentUser||null;},async authStateReady(){currentAuth||=(await import('./account-firebase.js')).auth;await currentAuth.authStateReady();}};
const control=async(...args)=>(await import('./control-client.js')).control(...args);
export function startPartyJoin(runtime){
 function shell(){let w=window;for(let i=0;i<8;i++){try{if(w.NovaBuildNowInvite)return w.NovaBuildNowInvite;if(!w.parent||w.parent===w)break;if(w.parent.location.origin!==window.location.origin)break;w=w.parent}catch{break}}return null}
 async function checkAccount(pending){if(shell()?.read()?.uid===pending.uid)return;await auth.authStateReady();if(auth.currentUser?.uid!==pending.uid)throw Error('This invitation belongs to a different Nova account.')}
 function clearPending(id){shell()?.clear(id);try{sessionStorage.removeItem(pendingKey)}catch{}}
 let active='',busy=false,attempted=false,leaving=false,started=0,complete=false,nextAck=0,ackFailures=0,attemptedAt=0,nativeStarted=0,fatal=false;
 const host=document.createElement('section');host.id='nova-party-join-status';host.hidden=true;host.style.cssText='position:fixed;inset:20px 20px auto auto;z-index:2147483647;max-width:320px;padding:18px;border:1px solid #ffffff30;border-radius:14px;background:linear-gradient(135deg,#ffffff12,#ffffff04),#09090cde;backdrop-filter:blur(22px);color:white;font:14px/1.5 system-ui;box-shadow:0 12px 40px #0007';const title=document.createElement('strong'),note=document.createElement('p'),retry=document.createElement('button');title.textContent='Owner lobby invitation';retry.textContent='Try again';retry.hidden=true;retry.style.cssText='padding:8px 12px;border:1px solid #ffffff35;border-radius:8px;background:#ffffff18;color:white;cursor:pointer';host.append(title,note,retry);document.body.append(host);
 const codeCopy=document.createElement('button');codeCopy.textContent='Copy party code';codeCopy.hidden=true;codeCopy.style.cssText=retry.style.cssText;codeCopy.onclick=async()=>{const p=read();if(!p)return;try{await navigator.clipboard.writeText(p.code);codeCopy.textContent='Copied · paste in the game party menu'}catch{codeCopy.textContent='Party code: '+p.code}};host.append(codeCopy);
 const read=()=>{try{return shell()?.read()||JSON.parse(sessionStorage.getItem(pendingKey)||'null');}catch{return null;}};
 retry.onclick=()=>{if(fatal){location.reload();return;}active='';started=0;attempted=false;leaving=false;complete=false;nextAck=0;ackFailures=0;nativeStarted=0;retry.hidden=true;};
 const tick=async()=>{
  if(busy||fatal)return;const pending=read();if(!pending?.id)return;if(complete&&active===pending.id)return;if(active!==pending.id)complete=false;
  if(active!==pending.id){active=pending.id;started=Date.now();attempted=false;leaving=false;host.hidden=false;note.textContent='Loading owner code…';codeCopy.hidden=false;codeCopy.textContent='Copy party code';retry.hidden=true;}
  if(pending.expiresAt<=Date.now()){note.textContent='This owner invitation has ended.';clearPending(pending.id);return;}
  if(attempted&&Date.now()-attemptedAt>120000){note.textContent='Could not join the owner lobby. It may be full, closed, or in another server region. Check the game message and try again.';retry.hidden=false;return;}
  const adapter=runtime.adapter();if(!adapter)return;if(!nativeStarted)nativeStarted=Date.now();if(!attempted&&Date.now()-nativeStarted>120000){note.textContent='BuildNow is not ready to join. Return to its main menu and check your connection, then try again.';retry.hidden=false;return;}
  busy=true;
  try{
   if(adapter.ready()&&adapter.joined(pending.code)){
    if(Date.now()<nextAck)return;await checkAccount(pending);
    try{const bridge=shell();if(bridge)await bridge.confirm(pending);else await control('buildNowInviteJoined',{id:pending.id,code:pending.code,nonce:pending.nonce});}catch(error){ackFailures++;nextAck=Date.now()+Math.min(15000,1000*2**Math.min(ackFailures,4));note.textContent='Joined the lobby · waiting to notify the owner. '+error.message;return;}
    note.textContent='Joined the owner lobby. The owner has been notified.';clearPending(pending.id);complete=true;setTimeout(()=>host.hidden=true,6000);return;
   }
   if(!attempted&&adapter.ready()){
    await checkAccount(pending);
    if(!leaving&&adapter.inRoom()){adapter.leave();leaving=true;note.textContent='Leaving your current room…';return;}
    if(adapter.inRoom())return;adapter.join(pending.code);attempted=true;attemptedAt=Date.now();note.textContent='Loading owner code · joining the party…';
   }else if(attempted&&Date.now()-attemptedAt>30000){note.textContent='BuildNow has not confirmed the party join. Check that the lobby is open and that you use the owner’s server region.';retry.hidden=false;}
  }catch(error){if(/memory access out of bounds|unreachable|indirect call|function signature/i.test(error.message||'')){fatal=true;note.textContent='The game connection failed while loading the party code. Reload the game to recover, then join from its party menu. This is not full browser storage.';retry.textContent='Reload game';}else note.textContent=error.message;retry.hidden=false;}finally{busy=false;}
 };
 const timer=setInterval(tick,750);tick();window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
