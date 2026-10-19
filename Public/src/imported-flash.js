(() => {
 const id=Number(document.documentElement.dataset.flashId),start=document.querySelector('#start'),status=document.querySelector('#status');
 const base=new URL('https://nova-content.invalid/content/noah-import/');
 let blob, timer, busy=false;
 function fail(error){clearTimeout(timer);document.documentElement.dataset.flashState='error';status.textContent=error.message||String(error);status.append(document.createElement('br'));const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=()=>location.reload();status.append(retry)}
 start.onclick=async()=>{if(busy)return;busy=true;start.disabled=true;document.documentElement.dataset.flashState='loading';status.textContent='Loading game files…';timer=setTimeout(()=>fail(new Error('Loading took too long. Check your connection and retry.')),120000);
 try {
  const r=await fetch(new URL('flash-games.json',base));if(!r.ok)throw Error('Game information unavailable');
  const config=(await r.json()).find(g=>g.id===id);if(!config)throw Error('Game not found');
  const chunks=[];for(const [index,file] of config.files.entries()){status.textContent=`Loading game files: ${index+1}/${config.files.length}`;const res=await fetch(new URL(file.path,location.href));if(!res.ok)throw Error('Game download failed');const chunk=await res.arrayBuffer();if(chunk.byteLength!==file.bytes)throw Error('Incomplete game file');chunks.push(chunk)}
  blob=URL.createObjectURL(new Blob(chunks,{type:'application/x-shockwave-flash'}));chunks.length=0;
  window.RufflePlayer={config:{publicPath:'https://nova-content.invalid/content/runtime/ruffle/',autoplay:'on',unmuteOverlay:'hidden',allowNetworking:'none'}};
  const script=document.createElement('script');script.src='https://nova-content.invalid/content/runtime/ruffle/ruffle.js';await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(Error('Flash engine could not load'));document.head.append(script)});
  const player=window.RufflePlayer.newest().createPlayer();document.querySelector('#game').append(player);document.querySelector('#game').hidden=false;document.querySelector('#intro').hidden=true;status.textContent='Starting game…';
  await player.load({url:blob,base:new URL('.',config.files[0].path.startsWith('/')?new URL(config.files[0].path,location.href):base).href});
  clearTimeout(timer);status.hidden=true;document.documentElement.dataset.flashState='running';
 }catch(error){fail(error)}};
 addEventListener('pagehide',()=>{clearTimeout(timer);if(blob)URL.revokeObjectURL(blob)},{once:true});
})();
