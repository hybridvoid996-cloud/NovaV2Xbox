/* GSN's static release uses a gateway supplied by its hosting environment. */
(()=>{
  const gateway='/releases/browser-20261001-1/api/console-cloud/';
  const methods={games:'GET',queue:'GET',session:'POST',start:'POST',ping:'POST',quit:'POST'};
  const backendPaths={games:'games',queue:'getQueue',session:'createSession',start:'startGame',ping:'pingSession',quit:'quitSession'};
  function endpoint(target,method){
    if(target.origin!=='https://gsnproxy.b-cdn.net'||!target.pathname.startsWith(gateway))return null;
    const name=target.pathname.slice(gateway.length);
    if(methods[name]!==method)return null;
    return new URL('https://cherrion.top/api/cloud/'+backendPaths[name]+target.search);
  }
  const wait=(ms,signal)=>new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(signal.reason||new DOMException('Cancelled.','AbortError'));return}
    const abort=()=>{clearTimeout(timer);reject(signal.reason||new DOMException('Cancelled.','AbortError'))};
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve()},ms);signal?.addEventListener('abort',abort,{once:true});
  });
  function createGateway(request,{onRecovery=()=>{}}={}){
    let useBackend=false;
    const upstream=(target,method,body,headers,signal)=>request(target,method,body,(headers||[]).filter(([name])=>!['cookie','authorization','host'].includes(name.toLowerCase())),signal);
    return async(target,method,body,headers,signal)=>{
      const backend=endpoint(target,method);
      if(!backend)return request(target,method,body,headers,signal);
      if(useBackend)return upstream(backend,method,body,headers,signal);
      let response=await request(target,method,body,headers,signal);
      // A cached catalog can skip backend discovery. Heartbeats can safely recover
      // from a missing gateway; never replay session reservations or game starts.
      if(method==='POST'&&target.pathname.endsWith('/ping')&&response.status===404){
        response=await upstream(backend,method,body,headers,signal);
        if(response.status>=200&&response.status<300)useBackend=true;
        return response;
      }
      // Only the read-only catalog is retried. Session reservations are never replayed.
      if(method!=='GET'||!target.pathname.endsWith('/games')||response.status!==404)return response;
      onRecovery('Reconnecting to Nova Cloud…');
      await wait(400,signal);response=await request(target,method,body,headers,signal);
      if(response.status!==404)return response;
      // This is the upstream API declared by GSN's own cloud.js, not a guessed host.
      response=await upstream(backend,method,body,headers,signal);
      if(response.status>=200&&response.status<300)useBackend=true;
      return response;
    };
  }
  const attached=new WeakMap();
  function attach(doc,{onStatus=()=>{},onReady=()=>{},onError=()=>{},signal}={}){
    const win=doc.defaultView,boot=doc.getElementById('boot');
    if(!win||!boot)return false;if(attached.has(doc))return true;
    let stopped=false;const stop=()=>{if(stopped)return;stopped=true;observer.disconnect();win.removeEventListener('pagehide',stop);signal?.removeEventListener('abort',stop)};
    const update=()=>{
      if(stopped)return;
      const message=doc.getElementById('status')?.textContent?.trim();if(message)onStatus(message);
      if(boot.dataset.state==='error'){const detail=/failed to get address from provider|malq.*(?:session|HTTP 500)|altaddress\.org/i.test(message||'')?'Nova Cloud’s session email service is unavailable. Try again later or use Switch cloud to choose another provider.':message;const status=doc.getElementById('status');if(status&&detail)status.textContent=detail;stop();onError(detail||'Nova Cloud could not connect.');return}
      if(boot.hidden){stop();onReady()}
    };
    const observer=new win.MutationObserver(update);attached.set(doc,stop);
    observer.observe(boot,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','data-state']});
    win.addEventListener('pagehide',stop,{once:true});signal?.addEventListener('abort',stop,{once:true});
    if(signal?.aborted)stop();else update();return true;
  }
  window.NovaGSNCloud={endpoint,createGateway,attach};
})();
