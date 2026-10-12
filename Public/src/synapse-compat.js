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
 async function patchEntry(response){const body=typeof response.body==='string'?response.body:await new Response(response.body).text();const html=body.replace('if (game && parent !== window)', 'if (game)').replace('window.alert = (message) => post("error", { message: String(message) });','/* Keep native errors visible in the direct Nova player. */');return {...response,body:html,headers:response.headers.filter(([name])=>!['content-length','content-encoding'].includes(name.toLowerCase()))}}
 window.NovaSynapseCompat={install,patchPlayer,patchEntry};
})();
