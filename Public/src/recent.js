(() => {
  'use strict';
  const pages=new Map();const sessions=new Map();let defaults=[];
  function syncSessions(){for(const [id,el]of sessions){const split=el.hasAttribute('data-split-primary')||el.classList.contains('split-secondary-frame');const active=!document.hidden&&!panel.hidden&&!el.hidden&&(el===frame||split);if(!active&&localStorage.getItem('nova_resume_game')==='false'){el.src='about:blank';el.remove();sessions.delete(id);continue}const paused=!active;el.dataset.novaSuspended=String(paused);try{el.contentWindow.NovaSessionRuntime?.setSuspended(paused)}catch{}}}
  new MutationObserver(syncSessions).observe(panel,{attributes:true,subtree:true,attributeFilter:['hidden','data-view','data-split-primary','class']});document.addEventListener('visibilitychange',syncSessions);addEventListener('storage',syncSessions);
  function watchSession(el){el.addEventListener('load',syncSessions);}
 
  const account=()=>localStorage.getItem('nova_user')||localStorage.getItem('nova_username')||'guest';
  const key=()=> 'nova-v2-recent-'+account();
  const kind=g=>g.kind==='cloud'?'cloud':g.kind==='app'||g._kind==='apps'?'app':'game';
  const identity=g=>kind(g)+':'+g.id;
  function list(){try{const rows=JSON.parse(localStorage.getItem(key())||'[]');return Array.isArray(rows)?rows.filter(g=>g&&g.id!=null&&typeof g.name==='string').slice(0,12):[]}catch{return []}}
  function record(g){const item={id:g.id,name:g.name,art:g.art,kind:kind(g),playedAt:Date.now()};const rows=[item,...list().filter(x=>identity(x)!==identity(item))].slice(0,12);localStorage.setItem(key(),JSON.stringify(rows));render();window.novaGuideRender?.('home');}
  function freshFrame(){const el=document.createElement('iframe');el.id='system';el.title='Nova';el.allow='microphone; camera; autoplay; fullscreen; display-capture';el.hidden=true;document.getElementById('panel-content').before(el);return el;}
  function park(){if(frame.dataset.session!=='true')return;frame.hidden=true;frame.removeAttribute('id');frame=freshFrame();}
  function launch(g){
    if(panel.dataset.view==='computer')frame.contentWindow?.postMessage({novaAction:'remoteDisconnect'},location.origin);
    cancelAIMotion();window.NovaMusic?.hide();if(localStorage.getItem('nova_resume_game')==='false')invalidate(g);const id=account()+':'+identity(g);
    if(frame.dataset.session==='true'){frame.hidden=true;frame.removeAttribute('id');}else frame.remove();
    let el=sessions.get(id);
    if(!el){el=freshFrame();el.dataset.session='true';el.dataset.sessionKind=kind(g);el.src='player.html?kind='+kind(g)+'&id='+encodeURIComponent(g.id)+(document.body.classList.contains('nova-phone')?'&theme=nova-phone':'');sessions.set(id,el);watchSession(el);}
    else {sessions.delete(id);sessions.set(id,el);}
    frame=el;frame.id='system';frame.title=g.name;frame.hidden=false;
    panel.classList.remove('full-library');panel.dataset.view=kind(g);panel.hidden=false;content.hidden=true;document.getElementById('panel-title').textContent=g.name;
    document.querySelectorAll('nav [data-page]').forEach(b=>b.classList.remove('active'));
    stopOtherSessions(id);trimApps();
    if(!el.dataset.counted){el.dataset.counted="true";dispatchEvent(new CustomEvent("nova-title-launched",{detail:{id:g.id,kind:kind(g)}}));}
    syncSessions();record(g);
  }
  function resume(g){
    if(localStorage.getItem('nova_resume_game')==='false')return false;
    const el=sessions.get(account()+':'+identity(g));
    if(!el?.isConnected)return false;
    cancelAIMotion();if(frame!==el){frame.hidden=true;frame.removeAttribute('id')}
    frame=el;frame.id='system';frame.title=g.name;frame.hidden=false;
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
  function trimApps(){const apps=[...sessions].filter(([,el])=>el.dataset.sessionKind==='app');while(apps.length>2){const [id,el]=apps.shift();el.src='about:blank';el.remove();sessions.delete(id)}}
  function render(){
    const host=document.getElementById('tiles'),recent=list();host.replaceChildren();
    const rows=recent.length?recent:defaults;
    rows.slice(0,9).forEach((g,i)=>{
      const b=document.createElement('button');b.className='tile'+(i===0?' selected':'')+(recent.length&&i===0?' resume-tile':'');
      b.setAttribute('aria-label',(recent.length&&i===0?'Resume ':'Open ')+g.name);
      const img=document.createElement('img');img.src=g.art||'Nova12.png';img.alt='';img.onerror=()=>{img.onerror=null;img.src='Nova12.png';};
      const caption=document.createElement('span');const name=document.createElement('b');name.textContent=g.name;caption.append(name);
      if(recent.length&&i===0){const label=document.createElement('small');label.textContent='▶ Resume '+(kind(g)==='app'?'app':'game');caption.prepend(label);}
      b.append(img,caption);b.onclick=()=>window.NovaRecent.launch(g);const select=()=>{host.querySelectorAll('.tile').forEach(x=>x.classList.toggle('selected',x===b));};b.onmouseenter=select;b.onfocus=select;host.append(b);
    });
  }
  function openSystem(page){
    if(!['shop','chat','search','ai','computer','novatube','cloudgaming','settings','leaderboard','admin'].includes(page)){park();return;}
    const key=account()+':'+page;
    if(frame.dataset.session==='true'){frame.hidden=true;frame.removeAttribute('id');}else frame.remove();
    if(!pages.has(key)){const el=freshFrame();el.dataset.session='true';pages.set(key,el);}
    frame=pages.get(key);frame.id='system';frame.hidden=false;
  }
  function invalidate(g){const id=account()+':'+identity(g),el=sessions.get(id);if(el){el.src='about:blank';el.remove();sessions.delete(id)}if(!frame.isConnected)frame=freshFrame();}
  function stopCurrent(target=frame){for(const [id,el]of sessions)if(el===target){el.src='about:blank';el.remove();sessions.delete(id)}if(!frame.isConnected)frame=freshFrame();}
  window.NovaRecent={list,record,park,launch,resume,invalidate,openSystem,stopCurrent,syncSessions};
  fetch('home-covers.json').then(r=>r.json()).then(rows=>{defaults=rows;render();}).catch(render);
  addEventListener('storage',render);addEventListener('nova-profile-changed',render);render();window.novaGuideRender?.('home');
})();
