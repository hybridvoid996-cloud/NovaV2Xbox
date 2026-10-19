/* Provider selection is shared by standalone, Home and split-screen players. */
(()=>{
  const definitions={"astra":{"label":"Nova Server 1","detail":"Cloud gaming","mark":"1"},"gsn":{"label":"Nova Server 2","detail":"Cloud gaming","mark":"2"},"ghost":{"label":"Nova Server 3","detail":"Cloud gaming","mark":"3"},"achroma":{"label":"Nova Server 4","detail":"Cloud gaming","mark":"4"},"synapse":{"label":"Nova Server 5","detail":"Mobile cloud gaming","mark":"5"},"luna":{"label":"Nova Server 6","detail":"Mobile cloud gaming","mark":"6"},"niche":{"label":"Nova Server 7","detail":"New cloud source","mark":"7"}};
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
      options.replaceChildren(...choices.map((choice,index)=>{
        const button=document.createElement('button');button.type='button';button.className='cloud-option';button.dataset.cloudProvider=choice.id;button.style?.setProperty?.('--server-index',index);
        const mark=document.createElement('span');mark.className='cloud-provider-mark';mark.textContent=choice.mark;mark.setAttribute('aria-hidden','true');
        const text=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('small'),arrow=document.createElement('span');
        title.textContent=choice.label;detail.textContent=choice.detail;text.append(title,detail);arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');button.append(mark,text,arrow);button.onclick=()=>finish(choice);return button;
      }));
      signal?.addEventListener('abort',abort,{once:true});dialog.addEventListener('cancel',dismiss);cancel.addEventListener('click',dismiss);document.body.classList.add('picking-cloud');dialog.showModal();options.firstElementChild?.focus();
    });
  }
  window.NovaCloudProviders={entries,choose};
})();
