/* Provider selection is shared by standalone, Home and split-screen players. */
(()=>{
  const definitions={gtafile:{label:'Nova Gta File',detail:'Testing — could be unlimited session',mark:'G',nativeEmbed:true},luna:{label:'Luna',detail:'Mobile cloud games · guest or CloudMoon account',mark:'L'},achroma:{label:'Achroma - Stratus',detail:'PC cloud games through Nova',mark:'S'},synapse:{label:'Achroma - Synapse',detail:'Mobile cloud games through Nova',mark:'M'},ghost:{label:'GhostCloud',detail:'Cloud streaming through Nova',mark:'G'},astra:{label:'Astra',detail:'Your original cloud library',mark:'A'},gsn:{label:'Nova Cloud',detail:'A new place to play',mark:'N'}};
  function entries(item){
    const source=item.providers||{astra:{url:item.url,name:item.name,sourceOccurrence:item.sourceOccurrence}};
    return Object.entries(definitions).filter(([id])=>source[id]?.url).map(([id,definition])=>({id,...definition,...source[id],...(id==='synapse'&&source[id].sourceId?{url:'https://bikesense.org/synapse/index.html?game='+encodeURIComponent(source[id].sourceId),nativeSynapse:true}:{})}));
  }
  function choose(item,{signal,onCancel=()=>{}}={}){
    const choices=entries(item);
    if(signal?.aborted)return Promise.reject(new DOMException('Launch cancelled.','AbortError'));
    if(!choices.length)return Promise.reject(Error('This game has no available cloud provider.'));
    if(choices.length===1)return Promise.resolve(choices[0]);
    return new Promise((resolve,reject)=>{
      const dialog=document.getElementById('cloud-picker'),options=document.getElementById('cloud-options'),cancel=document.getElementById('cloud-cancel');
      document.getElementById('cloud-game-name').textContent=item.name;
      const art=document.getElementById('cloud-game-art');art.src=item.art;art.onerror=()=>{art.onerror=null;art.src='Nova12.png'};
      let settled=false;
      const finish=(value,error)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);dialog.removeEventListener('cancel',dismiss);cancel.removeEventListener('click',dismiss);options.replaceChildren();dialog.close();document.body.classList.remove('picking-cloud');error?reject(error):resolve(value)};
      const abort=()=>finish(null,new DOMException('Launch cancelled.','AbortError'));
      const dismiss=event=>{event.preventDefault();abort();onCancel()};
      options.replaceChildren(...choices.map(choice=>{
        const button=document.createElement('button');button.type='button';button.className='cloud-option';button.dataset.cloudProvider=choice.id;
        const mark=document.createElement('span');mark.className='cloud-provider-mark';mark.textContent=choice.mark;mark.setAttribute('aria-hidden','true');
        const text=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('small'),arrow=document.createElement('span');
        title.textContent=choice.label;detail.textContent=choice.detail;text.append(title,detail);arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');button.append(mark,text,arrow);button.onclick=()=>finish(choice);return button;
      }));
      signal?.addEventListener('abort',abort,{once:true});dialog.addEventListener('cancel',dismiss);cancel.addEventListener('click',dismiss);document.body.classList.add('picking-cloud');dialog.showModal();options.firstElementChild?.focus();
    });
  }
  window.NovaCloudProviders={entries,choose};
})();
