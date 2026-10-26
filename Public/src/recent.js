(() => {
  'use strict';
  const pages=new Map();const sessions=new Map();let defaults=[];
  const pausedPages=new Set(['search','novatube','novamovies']);
  const systemCards={search:{name:'Nova Search',art:'/src/page-icons/search.svg'},novatube:{name:'NovaTube',art:'/src/page-icons/novatube.svg'},novamovies:{name:'Nova Movies',art:'/src/page-icons/movies.svg'}};
  function syncSessions(){for(const [id,el]of sessions){const split=el.hasAttribute('data-split-primary')||el.classList.contains('split-secondary-frame');const active=!document.hidden&&!panel.hidden&&!el.hidden&&(el===frame||split);if(!active&&localStorage.getItem('nova_resume_game')==='false'){el.src='about:blank';el.remove();sessions.delete(id);continue}const paused=!active;el.dataset.novaSuspended=String(paused);try{el.contentWindow.NovaSessionRuntime?.setSuspended(paused)}catch{}}}
  function syncPages(){for(const [,el]of pages){if(!pausedPages.has(el.dataset.systemPage))continue;const active=!document.hidden&&!panel.hidden&&!el.hidden&&el===frame;if(!active&&localStorage.getItem('nova_resume_game')==='false'){el.src='about:blank';el.remove();for(const [key,value]of pages)if(value===el)pages.delete(key);continue}el.dataset.novaSuspended=String(!active);try{el.contentWindow.NovaSessionRuntime?.setSuspended(!active)}catch{}}}
  const syncAll=()=>{syncSessions();syncPages();renderContinue()};
  new MutationObserver(syncAll).observe(panel,{attributes:true,subtree:true,attributeFilter:['hidden','data-view','data-split-primary','class']});document.addEventListener('visibilitychange',syncAll);addEventListener('storage',syncAll);
  function watchSession(el){el.addEventListener('load',syncAll);}
 
  const account=()=>localStorage.getItem('nova_user')||localStorage.getItem('nova_username')||'guest';
  const key=()=> 'nova-v2-recent-'+account();
  const kind=g=>g.kind==='system'?'system':g.kind==='cloud'?'cloud':g.kind==='app'||g._kind==='apps'?'app':'game';
  const identity=g=>kind(g)+':'+g.id;
  const pageIcon={search:'search',music:'music',novamovies:'movies',novatube:'novatube',chat:'chat',ai:'ai',computer:'computer',shop:'shop',settings:'settings',leaderboard:'leaderboard'};
  function list(){try{const rows=JSON.parse(localStorage.getItem(key())||'[]');return Array.isArray(rows)?rows.filter(g=>(g?.id!=='computer'||window.NovaComputerAllowed?.())&&g&&g.id!=null&&typeof g.name==='string').slice(0,12).map(g=>g.kind==='system'&&pageIcon[g.id]?{...g,art:'/src/page-icons/'+pageIcon[g.id]+'.svg'}:g):[]}catch{return []}}
  function record(g){const item={id:g.id,name:g.name,art:g.art,kind:kind(g),playedAt:Date.now()};const rows=[item,...list().filter(x=>identity(x)!==identity(item))].slice(0,12);localStorage.setItem(key(),JSON.stringify(rows));render();window.novaGuideRender?.('home');}
  function freshFrame(){const el=document.createElement('iframe');el.id='system';el.title='Nova';el.allow='microphone; camera; autoplay; fullscreen; display-capture';el.hidden=true;document.getElementById('panel-content').before(el);return el;}
  function park(){if(frame.dataset.session!=='true')return;frame.hidden=true;frame.removeAttribute('id');frame=freshFrame();}
  function launch(g){
    if(kind(g)==='system'){openPage(String(g.id));return;}
    if(panel.dataset.view==='computer')frame.contentWindow?.postMessage({novaAction:'remoteDisconnect'},location.origin);
    cancelAIMotion();window.NovaMusic?.hide();if(localStorage.getItem('nova_resume_game')==='false')invalidate(g);const id=account()+':'+identity(g);
    if(frame.dataset.session==='true'){frame.hidden=true;frame.removeAttribute('id');}else frame.remove();
    let el=sessions.get(id);
    if(!el){el=freshFrame();el.dataset.session='true';el.dataset.sessionKind=kind(g);el.src='player.html?kind='+kind(g)+'&id='+encodeURIComponent(g.id)+(document.body.classList.contains('nova-phone')?'&theme=nova-phone':'');sessions.set(id,el);watchSession(el);}
    else {sessions.delete(id);sessions.set(id,el);}
    frame=el;frame.dataset.used=String(Date.now());frame.id='system';frame.title=g.name;frame.hidden=false;
    panel.classList.remove('full-library');panel.dataset.view=kind(g);panel.hidden=false;content.hidden=true;document.getElementById('panel-title').textContent=g.name;
    document.querySelectorAll('nav [data-page]').forEach(b=>b.classList.remove('active'));
    stopOtherSessions(id);trimApps();
    if(!el.dataset.counted){el.dataset.counted="true";dispatchEvent(new CustomEvent("nova-title-launched",{detail:{id:g.id,kind:kind(g)}}));}
    syncAll();record(g);
  }
  function resume(g){
    if(localStorage.getItem('nova_resume_game')==='false')return false;
    const el=sessions.get(account()+':'+identity(g));
    if(!el?.isConnected)return false;
    cancelAIMotion();if(frame!==el){frame.hidden=true;frame.removeAttribute('id')}
    frame=el;frame.dataset.used=String(Date.now());frame.id='system';frame.title=g.name;frame.hidden=false;
    panel.classList.remove('full-library');panel.dataset.view=kind(g);panel.hidden=false;content.hidden=true;
    document.getElementById('panel-title').textContent=g.name;stopOtherSessions(account()+':'+identity(g));syncSessions();record(g);return true;
  }
  function stopOtherSessions(keepId){
    for(const [id,el] of sessions){
      if(id===keepId)continue;
      const active=sessions.get(keepId);
      // Apps can coexist with a game; game and cloud sessions share one slot.
      if(active?.dataset.sessionKind==='app'||el.dataset.sessionKind==='app'||id.includes(':app:'))continue;
      // Keep the selected game available for Resume, but destroy every replaced
      // game's entire context so nested audio engines and timers stop as well.
      el.src='about:blank';el.remove();sessions.delete(id);
    }
  }
  function trimApps(){const apps=[...sessions].filter(([,el])=>el.dataset.sessionKind==='app').map(([id,el])=>({id,el,map:sessions}));for(const [id,el]of pages)if(pausedPages.has(el.dataset.systemPage))apps.push({id,el,map:pages});apps.sort((a,b)=>Number(a.el.dataset.used||0)-Number(b.el.dataset.used||0));while(apps.length>2){const index=apps.findIndex(x=>x.el!==frame);if(index<0)break;const {id,el,map}=apps.splice(index,1)[0];el.src='about:blank';el.remove();map.delete(id)}}
  function render(){
    const host=document.getElementById('tiles'),recent=list();host.replaceChildren();
    const rows=recent.length?recent:defaults;
    rows.slice(0,9).forEach((g,i)=>{
      const b=document.createElement('button');b.className='tile'+(i===0?' selected':'')+(recent.length&&i===0?' resume-tile':'');
      b.setAttribute('aria-label',(recent.length&&i===0?'Resume ':'Open ')+g.name);
      const img=document.createElement('img');img.src=g.art||'Nova12.png';img.alt='';img.onerror=()=>{img.onerror=null;img.src='Nova12.png';};
      const caption=document.createElement('span');const name=document.createElement('b');name.textContent=g.name;caption.append(name);
      if(recent.length&&i===0){const label=document.createElement('small');label.textContent='▶ Resume '+(kind(g)==='system'?'page':kind(g)==='app'?'app':'game');caption.prepend(label);}
      b.append(img,caption);b.onclick=()=>window.NovaRecent.launch(g);const select=()=>{host.querySelectorAll('.tile').forEach(x=>x.classList.toggle('selected',x===b));};b.onmouseenter=select;b.onfocus=select;host.append(b);
    });renderContinue();
  }
  function retained(g){return kind(g)==='system'?pages.get(account()+':'+g.id):sessions.get(account()+':'+identity(g))}
  let continueSignature='';
  function renderContinue(){
    const host=document.getElementById('home-continue');if(!host)return;
    const recent=list(),enabled=localStorage.getItem('nova_resume_game')!=='false';
    const resumeIndex=enabled?recent.findIndex(g=>retained(g)?.isConnected):-1;
    if(resumeIndex>0)recent.unshift(...recent.splice(resumeIndex,1));
    const items=recent.slice(0,5),signature=JSON.stringify(items.map((g,i)=>[identity(g),g.name,g.art,i===0&&enabled&&!!retained(g)?.isConnected]));
    if(continueSignature===signature)return;continueSignature=signature;
    host.replaceChildren();host.hidden=!items.length;if(!items.length)return;
    const heading=document.createElement('h2');heading.className='continue-heading';heading.textContent='Resume & recent';host.append(heading);
    const row=document.createElement('div');row.className='continue-cards';
    items.forEach((g,i)=>{
      const live=i===0&&enabled&&retained(g)?.isConnected;
      const b=document.createElement('button');b.type='button';b.className='continue-card'+(i===0?' continue-primary':'')+(live?' is-resumable':'');
      const label=(live?'Resume ':'Open ')+g.name;b.setAttribute('aria-label',label);b.title=label;
      const img=document.createElement('img');img.src=g.art||'Nova12.png';img.alt='';img.width=96;img.height=96;img.decoding='async';img.onerror=()=>{img.onerror=null;img.src='Nova12.png'};
      b.append(img);
      if(live){const play=document.createElement('span');play.className='continue-play';play.textContent='▶ Resume';play.setAttribute('aria-hidden','true');b.append(play)}
      b.onclick=()=>launch(g);const entry=document.createElement('div');entry.className='continue-entry';entry.append(b);if(live){const close=document.createElement('button');close.type='button';close.className='continue-close';close.textContent='×';close.title='Close '+g.name+' fully';close.setAttribute('aria-label','Close '+g.name+' fully');close.onclick=e=>{e.preventDefault();e.stopPropagation();closeRetained(g)};entry.append(close)}row.append(entry);
    });host.append(row);
  }
  function openSystem(page){if(page==='computer'&&!window.NovaComputerAllowed?.())return;
    if(!['shop','chat','search','ai','computer','novatube','novamovies','cloudgaming','settings','leaderboard','admin'].includes(page)){park();return;}
    const key=account()+':'+page;
    if(frame.dataset.session==='true'){frame.hidden=true;frame.removeAttribute('id');}else frame.remove();
    if(!pages.has(key)){const el=freshFrame();el.dataset.session='true';el.dataset.systemPage=page;pages.set(key,el);watchSession(el);}
    frame=pages.get(key);frame.dataset.used=String(Date.now());frame.id='system';frame.hidden=false;trimApps();
    syncAll();if(systemCards[page])record({id:page,kind:'system',...systemCards[page]});
  }
  function closeRetained(g){
    const el=retained(g);if(!el)return;
    // Removing the browsing context stops its audio, timers, and nested frames.
    el.src='about:blank';el.remove();
    for(const [id,value]of sessions)if(value===el)sessions.delete(id);
    for(const [id,value]of pages)if(value===el)pages.delete(id);
    if(!frame.isConnected)frame=freshFrame();
    renderContinue();
  }
  function invalidate(g){const id=account()+':'+identity(g),el=sessions.get(id);if(el){el.src='about:blank';el.remove();sessions.delete(id)}if(!frame.isConnected)frame=freshFrame();}
  function stopCurrent(target=frame){for(const [id,el]of sessions)if(el===target){el.src='about:blank';el.remove();sessions.delete(id)}if(!frame.isConnected)frame=freshFrame();}
  window.NovaRecent={list,record,closeRetained,park,launch,resume,invalidate,openSystem,stopCurrent,syncSessions:syncAll};
  fetch('home-covers.json').then(r=>r.json()).then(rows=>{defaults=rows;render();}).catch(render);
  addEventListener('storage',render);addEventListener('nova-profile-changed',render);render();window.novaGuideRender?.('home');
})();
