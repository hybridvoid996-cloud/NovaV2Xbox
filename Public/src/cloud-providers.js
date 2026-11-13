/* Provider selection is shared by standalone, Home and split-screen players. */
(()=>{
  const definitions={astra:{label:'Server 1',siteName:'Astra',detail:'Astra',mark:'1'},ghost:{label:'Server 2',siteName:'GhostCloud',detail:'GhostCloud',mark:'2'},achroma:{label:'Server 3',siteName:'Achroma',detail:'Achroma',mark:'3'},synapse:{label:'Server 4',siteName:'Synapse',detail:'Synapse',mark:'4'},luna:{label:'Server 5',siteName:'Luna',detail:'Luna',mark:'5'},niche:{label:'Server 6',siteName:'Niche',detail:'Niche',mark:'6'},opium:{label:'Server 7',siteName:'Opium',detail:'Opium',mark:'7'}};
  function entries(item){
    const source=item.providers||{astra:{url:item.url,name:item.name,sourceOccurrence:item.sourceOccurrence}};
    return Object.entries(definitions).filter(([id])=>source[id]?.url).map(([id,definition])=>({id,...definition,...source[id],...(id==='achroma'?{url:'https://achcroma.voudouris.org/pages/games.html'}:{}),...(id==='synapse'&&source[id].sourceId?{url:'https://bikesense.org/synapse/index.html?game='+encodeURIComponent(source[id].sourceId),nativeSynapse:true}:{})}));
  }
  function choose(item,{signal,onCancel=()=>{}}={}){
    const choices=entries(item);
    if(signal?.aborted)return Promise.reject(new DOMException('Launch cancelled.','AbortError'));
    if(!choices.length)return Promise.reject(Error('This game has no available cloud provider.'));
    if(choices.length===1)return Promise.resolve(choices[0]);
    return new Promise((resolve,reject)=>{
      const dialog=document.getElementById('cloud-picker'),options=document.getElementById('cloud-options'),cancel=document.getElementById('cloud-cancel');
      document.getElementById('cloud-game-name').textContent=item.name;
      const art=document.getElementById('cloud-game-art');art.crossOrigin='anonymous';art.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=canvas.height=12;const ctx=canvas.getContext('2d');ctx.drawImage(art,0,0,12,12);const pixels=ctx.getImageData(0,0,12,12).data;let r=0,g=0,b=0,n=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<128)continue;r+=pixels[i];g+=pixels[i+1];b+=pixels[i+2];n++}if(n)dialog.style.setProperty('--cloud-color',[r,g,b].map(x=>Math.round(x/n)).join(','))}catch{}};dialog.style?.setProperty?.('--cloud-color','70,70,70');art.src=item.art;art.onerror=()=>{art.onerror=null;art.src='Nova12.png'};
      let settled=false;
      const finish=(value,error)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);dialog.removeEventListener('cancel',dismiss);cancel.removeEventListener('click',dismiss);options.replaceChildren();dialog.close();document.body.classList.remove('picking-cloud');error?reject(error):resolve(value)};
      const abort=()=>finish(null,new DOMException('Launch cancelled.','AbortError'));
      const dismiss=event=>{event.preventDefault();abort();onCancel()};
      options.replaceChildren(...choices.map((choice,index)=>{
        const button=document.createElement('button');button.type='button';button.className='cloud-option';button.dataset.cloudProvider=choice.id;button.style?.setProperty?.('--server-index',index);
        const mark=document.createElement('span');mark.className='cloud-provider-mark';mark.textContent=choice.mark;mark.setAttribute('aria-hidden','true');
        const text=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('small'),arrow=document.createElement('span');
        title.textContent=choice.label;detail.textContent=choice.siteName;detail.className='cloud-site-name';button.title=choice.siteName;text.append(title,detail);arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');button.append(mark,text,arrow);button.onclick=()=>finish(choice);return button;
      }));
      signal?.addEventListener('abort',abort,{once:true});dialog.addEventListener('cancel',dismiss);cancel.addEventListener('click',dismiss);document.body.classList.add('picking-cloud');dialog.showModal();options.firstElementChild?.focus();
    });
  }
  window.NovaCloudProviders={entries,choose};
})();
