/* Scoped compatibility for Synapse's current browser player. */
(()=>{
 function install(){
  const proto=window.RTCPeerConnection?.prototype;if(!proto||proto.__novaSynapseCompat)return;
  const remote=proto.setRemoteDescription,ice=proto.addIceCandidate,answer=proto.createAnswer,close=proto.close,states=new WeakMap();
  const state=pc=>{let s=states.get(pc);if(!s){s={queue:[],pending:null,closed:false};states.set(pc,s)}return s};
  proto.setRemoteDescription=function(...args){const s=state(this);const pending=Promise.resolve().then(()=>remote.apply(this,args));s.pending=pending;
   pending.then(()=>{if(s.pending===pending)s.pending=null;const queued=s.queue.splice(0);for(const item of queued){if(s.closed)item.reject(new DOMException('Connection closed','InvalidStateError'));else Promise.resolve().then(()=>ice.call(this,item.candidate)).then(item.resolve,item.reject)}},error=>{if(s.pending===pending)s.pending=null;for(const item of s.queue.splice(0))item.reject(error)});return pending;
  };
  proto.addIceCandidate=function(candidate){const s=state(this);if(s.closed)return Promise.reject(new DOMException('Connection closed','InvalidStateError'));if(s.pending||!this.remoteDescription){if(s.queue.length>=128)return Promise.reject(new Error('Too many pending connection candidates'));return new Promise((resolve,reject)=>s.queue.push({candidate,resolve,reject}))}return ice.call(this,candidate)};
  proto.createAnswer=function(...args){const s=state(this);return s.pending?s.pending.then(()=>answer.apply(this,args)):answer.apply(this,args)};
  proto.close=function(...args){const s=state(this);s.closed=true;for(const item of s.queue.splice(0))item.reject(new DOMException('Connection closed','InvalidStateError'));return close.apply(this,args)};
  Object.defineProperty(proto,'__novaSynapseCompat',{value:true});
 }
 async function patchPlayer(response){const body=typeof response.body==='string'?response.body:await new Response(response.body).text();
  if(!body.includes('socketBind')||!body.includes('joinRoom'))return response;
  const safeBody=body.replace(/(_0x239d1b\[a0_0x2ea2\(0x252\)\] = \(\) => \{)/, '$1\n      if(this[a0_0x2ea2(0x334)] !== _0x239d1b || !this.pc)return;').replace(/this\.pc\[a0_0x2ea2\(0x1ff\)\]\(\);\s*this\.pc = null;/g, 'const novaClosingPeer=this.pc;this.pc=null;novaClosingPeer?.[a0_0x2ea2(0x1ff)]();');
  const html=safeBody.replace(/\bloading\(\);/g,"if(typeof loading==='function')loading();").replace(/<head[^>]*>/i,head=>head+'<script>('+install.toString()+')();</script>');
  return {...response,body:html,headers:response.headers.filter(([name])=>!['content-length','content-encoding'].includes(name.toLowerCase()))};
 }
 function installEntry(){
  const app=window.App;if(!app||app.__novaLaunchCompat)return;
  app.__novaLaunchCompat=true;
  let lastError='';
  const report=message=>{
   message=String(message);if(message===lastError)return;lastError=message;
   if(parent!==window){parent.postMessage({achromaSynapse:'error',message},'*');return}
   let box=document.getElementById('nova-synapse-error');
   if(!box){box=document.createElement('p');box.id='nova-synapse-error';box.setAttribute('role','alert');box.style.cssText='color:#ffb8ae;line-height:1.5;padding:12px 0';document.getElementById('play-btn-el')?.parentElement?.append(box)}
   box.textContent=String(message);
  };
  window.alert=report;
  const request=app.customFetch,play=app.handlePlay;
  app.customFetch=async function(path,...args){
   const result=await request.call(this,path,...args);
   if(String(path).split('?')[0]!=='/phone/connect')return result;
   const code=Number(result?.code),data=result?.data;
   if(code===0&&data&&(data.android_instance_id||data.position!=null))return {...result,code:0};
   const detail=String(result?.message||result?.msg||'').trim();
   const message='Synapse could not start this game'+(Number.isFinite(code)?' (code '+code+')':'')+'. '+(detail||'Retry or switch to another Nova server.');
   if(this.queueInterval){clearInterval(this.queueInterval);this.queueInterval=null;const queue=document.getElementById('queue-modal');if(queue)queue.style.display='none';report(message)}
   throw new Error(message);
  };
  app.handlePlay=async function(...args){
   if(this.__novaStarting)return;this.__novaStarting=true;
   lastError='';
   const button=document.getElementById('play-btn-el'),original=button?.innerHTML;
   const error=document.getElementById('nova-synapse-error');if(error)error.textContent='';
   try{
    if(this.token&&/^0\s*h\s*0\s*m$/i.test(String(this.timeLeft||'').trim())){report('This Synapse account has no play time remaining. Use another Nova server, or an account with available Synapse play time.');return}
    return await play.apply(this,args)
   }catch(error){report(error?.message||'Synapse could not connect. Retry or switch servers.')}
   finally{this.__novaStarting=false;if(button?.isConnected){button.disabled=false;button.innerHTML=original}}
  };
 }
 async function patchEntry(response){const body=typeof response.body==='string'?response.body:await new Response(response.body).text();const html=body.replace('if (game && parent !== window)', 'if (game)').replace('window.alert = (message) => post("error", { message: String(message) });','/* Nova reports errors inline and to its player. */').replace('const ready = window.App.init();','('+installEntry.toString()+')();\n  const ready = window.App.init();').replace('this.timeLeft === "0h 0m"', 'String(this.timeLeft).toLowerCase().replaceAll(" ","") === "0h0m"').replace('alert("No time left.")', 'alert("This Synapse account has no play time remaining. Use another Nova server, or an account with available Synapse play time.")').replace('else if (conn.data.position)', 'else if (conn.data.position != null)').replace('catch(e) { alert("Error.");','catch(e) { alert(e?.message || "Synapse could not connect. Retry or switch servers.");');return {...response,body:html,headers:response.headers.filter(([name])=>!['content-length','content-encoding'].includes(name.toLowerCase()))}}
 window.NovaSynapseCompat={install,patchPlayer,patchEntry};
})();
