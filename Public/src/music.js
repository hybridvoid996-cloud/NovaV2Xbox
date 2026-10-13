(() => {
  'use strict';
  const idleArt='data:image/svg+xml,'+encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 88 88\"><circle cx=\"44\" cy=\"44\" r=\"40\" fill=\"#1ed760\"/><g fill=\"none\" stroke=\"#07170c\" stroke-linecap=\"round\"><path d=\"M23 33Q45 25 67 37\" stroke-width=\"7\"/><path d=\"M26 45Q45 38 63 49\" stroke-width=\"6\"/><path d=\"M29 57Q45 51 59 60\" stroke-width=\"5\"/></g></svg>");
  const url = 'https://6ab87f0e6a91203ed89fa447--neoostesting.netlify.app/neo-os/music-v2/index.html?v=20260919-scholarnook-v1&theme=system-v1&widgets=live-v1&runtime=20260908-audio-performance-v1';
  const panel = document.getElementById('panel');
  const host = document.createElement('div'); host.id = 'nova-music'; host.hidden = true;
  const status = document.createElement('div'); status.className = 'music-loading nova-media-loading';
  status.innerHTML = '<div class="nm-loading-card"><span class="nm-loading-eyebrow">NOVA MUSIC</span><span class="nova-media-mark" aria-hidden="true"><svg viewBox="0 0 88 88"><circle cx="44" cy="44" r="40" fill="#1ed760"/><g fill="none" stroke="#07170c" stroke-linecap="round"><path d="M23 33Q45 25 67 37" stroke-width="7"/><path d="M26 45Q45 38 63 49" stroke-width="6"/><path d="M29 57Q45 51 59 60" stroke-width="5"/></g></svg></span><h1>Your next favorite.</h1><span class="nm-loading-caption">Your music. Your people. One place.</span><div class="nova-media-loader" aria-hidden="true"></div></div>';

  const note = document.createElement('p'); note.textContent = 'Connecting Nova Music…';
  const retry = document.createElement('button'); retry.textContent = 'Try again'; retry.hidden = true;
  status.querySelector('.nm-loading-card').append(note, retry); host.append(status); panel.append(host);
  let view, controller, starting, timer, ready = false;let novaLibrary=null;const libraryDocs=new WeakSet();
  const paths = {previous:'M6 5v14M19 5 8 12l11 7Z',next:'M18 5v14M5 5l11 7-11 7Z',play:'m8 5 11 7-11 7Z',pause:'M8 5v14M16 5v14',volume:'M3 9h4l5-4v14l-5-4H3ZM16 8q4 4 0 8'};
  const icon = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[name]+'"/></svg>';
  const card = document.createElement('section'); card.className = 'xg-music'; card.hidden = true; card.setAttribute('aria-label','Nova Music player');
  const info = document.createElement('button'); info.className = 'music-track'; info.title = 'Open Nova Music';
  const cover = document.createElement('img'); cover.referrerPolicy='no-referrer'; cover.src = 'Nova12.png'; cover.alt = '';
  const meta = document.createElement('span'), title = document.createElement('b'), artist = document.createElement('small');
  title.textContent = 'Nova Music'; artist.textContent = 'Choose a song'; meta.append(title,artist); info.append(cover,meta);
  info.onclick = async () => {await document.querySelector('.guide').close(); openPage('music');};
  const controls = document.createElement('div'); controls.className = 'music-controls';
  const buttons = {};
  for (const [action,label,glyph] of [['previous','Previous song','previous'],['toggle','Play music','play'],['next','Next song','next']]) {
    const b = document.createElement('button'); b.innerHTML = icon(glyph); b.setAttribute('aria-label',label); b.disabled = true;
    b.onclick = () => command(action); buttons[action] = b; controls.append(b);
  }
  const volume = document.createElement('input'); volume.type = 'range'; volume.min = 0; volume.max = 100; volume.value = 70; volume.setAttribute('aria-label','Music volume'); volume.disabled = true;
  volume.oninput = () => command('setVolume',Number(volume.value)/100);
  const volumeIcon = document.createElement('span'); volumeIcon.innerHTML = icon('volume'); controls.append(volumeIcon,volume);
  const progress=document.createElement('div');progress.className='music-progress';
  const elapsed=document.createElement('small'),duration=document.createElement('small'),seek=document.createElement('input');
  seek.type='range';seek.min=0;seek.max=0;seek.step=.1;seek.value=0;seek.disabled=true;seek.setAttribute('aria-label','Song position');elapsed.textContent=duration.textContent='0:00';
  const stamp=n=>{n=Number.isFinite(n)?Math.max(0,Math.floor(n)):0;return Math.floor(n/60)+':'+String(n%60).padStart(2,'0')};
  let dragging=false;
  seek.oninput=()=>{dragging=true;elapsed.textContent=stamp(Number(seek.value))};
  seek.onchange=()=>{command('seek',Number(seek.value));dragging=false};
  seek.onblur=()=>{dragging=false};progress.append(elapsed,seek,duration);
  card.append(info,progress,controls); const bottom = document.querySelector('.xg-bottom'); bottom.before(card);
  let playerDocument=null,lastArtworkTrack='',artCandidates=[];const failedArt=new Set();const artModule=import('./music-art.mjs');let collectArt=()=>[],loadedArt=()=>null,copyArt=()=>null,renderedArtKey='',renderedArt=null;const coverCanvas=document.createElement('canvas');artModule.then(m=>{collectArt=m.musicArtworkCandidates;loadedArt=m.loadedMusicArtwork;copyArt=m.copyMusicArtwork;update()}).catch(()=>{});
  function player() {
    function find(win,depth=0){try{if(win.__NEO_METING_PLAYER__){playerDocument=win.document;return win.__NEO_METING_PLAYER__;}if(depth<4)for(const f of win.document.querySelectorAll('iframe')){const p=find(f.contentWindow,depth+1);if(p)return p;}}catch{}return null;}
    return view?find(view.element.contentWindow):null;
  }
  function artwork(src){
    if(!src||!view||!controller)return;
    try{const target=new URL(src,src.startsWith("/~/")?location.href:url);if(!['https:','http:','blob:','data:'].includes(target.protocol))return;
      const proxied=target.origin===location.origin||['blob:','data:'].includes(target.protocol)?target.href:view.prefix+controller.config.codec.encode(target.href);
      if(failedArt.has(proxied))return false;if(cover.getAttribute('src')!==proxied)cover.src=proxied;return true;
    }catch{}
  }
  let pendingVolume=null,lastOSVolume=null;
  async function command(action,value,internal=false) {
    if(action==='setVolume'){value=Math.max(0,Math.min(1,Number(value)));if(!Number.isFinite(value))return;pendingVolume=value;}
    try {if(!internal&&novaLibrary&&await novaLibrary.control(action,value)){update();return;}const p=player(); if(!p)throw Error('Open Nova Music to connect.'); if(action==='setVolume')pendingVolume=null; const {controlMusic}=await import('./music-controls.mjs');await controlMusic(p,playerDocument,action,value);update();}
    catch {artist.textContent='Open Music to resume playback';}
  }
  const watchedMedia = new WeakSet();
  let hasPlayedMusic = false;
  function update() {
    const p=player(); if(!p){if(window.NovaMusic?.activity){window.NovaMusic.activity=null;window.NovaMusic._activitySignature='null';dispatchEvent(new Event('nova-music-activity'))}card.classList.remove('playing','player-active');card.hidden=!window.NovaOS&&!hasPlayedMusic;if(window.NovaOS){title.textContent='Nova Music';artist.textContent='Choose a song';cover.src=idleArt}return;}
    const track=p.track(), media=p.media();
    if(media&&pendingVolume!==null){const value=pendingVolume;pendingVolume=null;command('setVolume',value);return;}
    if(media?.addEventListener&&!watchedMedia.has(media)){
      watchedMedia.add(media);
      for(const event of ['playing','play','pause','ended','emptied','volumechange'])media.addEventListener(event,()=>{
        if(event==='play'||event==='playing')hasPlayedMusic=true;
        update();
      });
    }
    title.textContent=track?.name || track?.title || 'Nova Music';
    artist.textContent=track?.artist || track?.author || (track ? 'Now playing' : 'Choose a song');
    const artKey=String(track?.id||'')+'|'+(track?.name||track?.title||'');
    if(artKey!==lastArtworkTrack){lastArtworkTrack=artKey;failedArt.clear();renderedArtKey='';renderedArt=null;cover.src=idleArt;}
    try{const doc=playerDocument||view.element.contentDocument,image=loadedArt(doc);
      if(image){const key=artKey+'|'+(image.currentSrc||image.getAttribute('src'))+'|'+image.naturalWidth;if(key!==renderedArtKey){renderedArtKey=key;renderedArt=copyArt(image,coverCanvas)}}
      artCandidates=collectArt(track,doc);if(renderedArt){if(cover.getAttribute('src')!==renderedArt)cover.src=renderedArt;}else if(!artCandidates.some(artwork))cover.src=idleArt;
    }catch{if(!renderedArt)cover.src=idleArt;}
    const length=Number(media?.duration),position=Number(media?.currentTime)||0;
    seek.disabled=!Number.isFinite(length)||length<=0;seek.max=seek.disabled?0:length;
    if(!dragging){seek.value=position;elapsed.textContent=stamp(position)}
    duration.textContent=stamp(length);seek.setAttribute('aria-valuetext',stamp(Number(seek.value))+' of '+stamp(length));
    Object.values(buttons).forEach(b=>b.disabled=!track); volume.disabled=!media;
    const playing=media&&!media.paused&&!media.ended;
    const activity=playing&&track?{name:track.name||track.title||'Unknown song',artist:track.artist||track.author||'',art:renderedArt||artCandidates.find(a=>/^https?:/.test(a))||idleArt}:null;
    const signature=JSON.stringify(activity);if(signature!==window.NovaMusic._activitySignature){window.NovaMusic._activitySignature=signature;window.NovaMusic.activity=activity;dispatchEvent(new Event('nova-music-activity'));}
    buttons.toggle.innerHTML=icon(playing?'pause':'play'); buttons.toggle.setAttribute('aria-label',playing?'Pause music':'Play music');
    if(playing)hasPlayedMusic=true;
    card.hidden=!window.NovaOS&&!hasPlayedMusic;
    card.classList.toggle('playing',!!playing);card.classList.toggle('player-active',!!track&&hasPlayedMusic);
    if(media && document.activeElement!==volume)volume.value=Math.round(media.volume*100);
    if(window.NovaOS&&media&&Number.isFinite(media.volume)&&lastOSVolume!==media.volume){lastOSVolume=media.volume;window.dispatchEvent(new CustomEvent('nova-music-volume',{detail:{volume:media.volume}}));}
  }
  cover.onerror=()=>{failedArt.add(cover.getAttribute('src'));if(!artCandidates.some(artwork))cover.src=idleArt;};
  const glass = `html,body,.main-panel,.content-area{background:transparent!important;background-image:none!important} .sidebar,.top-bar,.spotify-player,.np-inline,.now-playing-bar{background:rgba(10,13,12,.62)!important;backdrop-filter:blur(22px);border-color:rgba(255,255,255,.1)!important} .library-panel,.music-primary-nav,.music-brand{background:rgba(20,24,22,.38)!important} .card,.music-card{background:rgba(255,255,255,.065)!important;transition:transform .2s,background .2s} .card:hover,.music-card:hover{background:rgba(255,255,255,.13)!important;transform:translateY(-3px)} .music-brand-mark{color:#76d14b!important}`;
  function customize() {
    try {
      const doc=view.element.contentDocument; if(!doc?.body)return;
      if(!doc.getElementById('nova-music-glass')) {
        const style=doc.createElement('style'); style.id='nova-music-glass'; style.textContent=glass+(window.NovaOS?' .sidebar,.top-bar,.spotify-player,.np-inline,.now-playing-bar,.library-panel,.music-primary-nav,.music-brand{background:#18213322!important;border-color:#ffffff26!important;backdrop-filter:none!important}.music-brand-mark{color:#e4edff!important}':''); doc.head.append(style);
        doc.title='Nova Music';
        doc.documentElement.style.setProperty('color-scheme','normal','important');
        doc.documentElement.style.setProperty('background','transparent','important');
        doc.body.style.setProperty('background','transparent','important');
        doc.querySelectorAll('.main-panel,.content-area,.np-view').forEach(el=>el.style.setProperty('background','transparent','important'));
        doc.querySelectorAll('.sidebar,.top-bar,.spotify-player,.np-inline').forEach(el=>el.style.setProperty('background',window.NovaOS?'rgba(24,33,51,.13)':'rgba(10,13,12,.58)','important'));
        const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT); let node;
        while((node=walker.nextNode()))if(!['SCRIPT','STYLE'].includes(node.parentElement?.tagName)&&/NEO Music|NEO MUSIC/.test(node.textContent))node.textContent=node.textContent.replace(/NEO Music|NEO MUSIC/g,'Nova Music');
      }
      if(player()) {if(!libraryDocs.has(playerDocument)){libraryDocs.add(playerDocument);import('./music-library.js?v=20261013-party-sync45').then(m=>m.mountMusicLibrary({doc:playerDocument,isAlive:()=>!!view?.element?.isConnected,player,playTrack:t=>{const win=playerDocument.defaultView;if(typeof win.playTrack!=='function')throw Error('The player is still loading.');return win.playTrack(t)},command,profile:()=>window.novaHomeProfile})).then(value=>novaLibrary=value).catch(error=>{libraryDocs.delete(playerDocument);note.textContent=error.message;console.warn('Nova Music library could not load',error.message)})}ready=true;status.hidden=true;clearTimeout(timer);update();}
    } catch {}
  }
  async function start() {
    if(starting)return starting;
    status.hidden=false;retry.hidden=true;note.textContent='Connecting Nova Music…';
    starting=(async()=>{
      try {
        controller=await NovaConnection.create();
        view=controller.createFrame(); view.element.id='nova-music-frame'; view.element.title='Nova Music'; view.element.allow='autoplay; fullscreen';
        view.element.addEventListener('load',customize); host.append(view.element); view.go(url);
        timer=setTimeout(()=>{if(!ready){note.textContent='Music is taking longer to connect. You can try again.';retry.hidden=false;}},45000);
      } catch(error) {note.textContent='Could not connect to Nova Music. '+error.message;retry.hidden=false;starting=null;}
    })();return starting;
  }
  retry.onclick=()=>{novaLibrary?.dispose();novaLibrary=null;clearTimeout(timer);view?.element.remove();view=null;starting=null;ready=false;start();};
  window.NovaMusic={command,idleArt,reload(){view?.element.contentWindow.location.reload();},open(){panel.classList.remove('full-library');panel.dataset.view='music';panel.hidden=false;document.getElementById('system').hidden=true;document.getElementById('panel-content').hidden=true;document.getElementById('panel-title').textContent='Nova Music';document.querySelectorAll('nav [data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page==='music'));host.hidden=false;start();},hide(){if(host.closest('[data-window="app-music"]')&&!host.closest('.os-window').hidden)return;host.hidden=true;}};
  setInterval(()=>{if(view){customize();if(ready)update();}},750);
})();
