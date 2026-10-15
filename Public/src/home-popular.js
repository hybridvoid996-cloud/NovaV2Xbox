import {db} from './account-firebase.js';
import {ref,onValue,runTransaction} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import {selectActivity} from '../community-activity.js';
const host=document.getElementById('home-discover');
host.innerHTML=`<section class="popular-section"><div class="popular-heading"><h2>Popular games</h2><span data-status="game">Loading community favorites…</span></div><div class="popular-grid" data-grid="game"></div></section><section class="popular-section"><div class="popular-heading"><h2>Popular apps</h2><span data-status="app">Loading community favorites…</span></div><div class="popular-grid" data-grid="app"></div></section><section class="nova-personal-home"><div><span class="personal-kicker">NOVA PERSONAL</span><h2>Your world. Our community.</h2><p>A place to play, explore, and come together.</p></div><div class="nova-stat"><strong id="nova-visits">—</strong><span>Nova visits</span></div><div class="nova-stat"><strong id="nova-active">—</strong><span><i></i> Active users</span></div></section>`;
const catalogs={},counts={},failed={};
const dirty=new Set();
function render(kind){
 if(window.NovaPerformance&&!NovaPerformance.backgroundVisible()&&!window.NovaOS?.isPageVisible('personal')){dirty.add(kind);return;}dirty.delete(kind);
 const grid=host.querySelector(`[data-grid="${kind}"]`);grid.replaceChildren();
 const rows=(catalogs[kind]||[]).slice().sort((a,b)=>(Number(counts[kind]?.[b.id])||0)-(Number(counts[kind]?.[a.id])||0));
 const ranked=rows.some(g=>Number(counts[kind]?.[g.id])>0);
 host.querySelector(`[data-status="${kind}"]`).textContent=failed[kind]?'Community rankings unavailable':ranked?'Most played on Nova':'Discover these while play counts build';
 for(const [index,g] of rows.slice(0,6).entries()){
  const button=document.createElement('button');button.className='popular-tile';button.type='button';button.dataset.gameKey=kind+':'+g.id;
  const art=document.createElement('div');art.className='popular-art';const img=new Image();img.src=g.art;img.alt='';img.loading='lazy';img.onerror=()=>{img.onerror=null;img.src='Nova12.png'};art.append(img);
  const count=Number(counts[kind]?.[g.id])||0;
  if(count>0){const rank=document.createElement('span');rank.className='popular-rank';rank.textContent=String(index+1).padStart(2,'0');art.append(rank)}
  const name=document.createElement('strong');name.textContent=g.name;const sub=document.createElement('small');sub.textContent=count>0?count.toLocaleString()+' plays':'Explore '+(kind==='game'?'game':'app');button.append(art,name,sub);button.onclick=()=>window.NovaRecent?.launch({...g,kind});grid.append(button);
 }
}
for(const kind of ['game','app']){
 fetch(`library-${kind}s.json`).then(r=>{if(!r.ok)throw Error();return r.json()}).then(rows=>{catalogs[kind]=rows;render(kind)}).catch(()=>{host.querySelector(`[data-status="${kind}"]`).textContent='Could not load the library';});
 onValue(ref(db,'novaStats/popular/'+kind),snap=>{counts[kind]=snap.val()||{};failed[kind]=false;render(kind)},()=>{failed[kind]=true;render(kind)});
}
addEventListener('nova-title-launched',({detail:g})=>{
 if(!g||!['game','app'].includes(g.kind)||/[.#$\[\]/]/.test(String(g.id)))return;
 runTransaction(ref(db,'novaStats/popular/'+g.kind+'/'+g.id),value=>(Number.isSafeInteger(value)&&value>=0?value:0)+1).catch(()=>{failed[g.kind]=true;render(g.kind)});
});
onValue(ref(db,'novaStats/homeVisits'),snap=>{document.getElementById('nova-visits').textContent=Number(snap.val()||0).toLocaleString()},()=>{document.getElementById('nova-visits').textContent='Unavailable'});
// Preserve Nova 1's existing counter, without adding a fabricated starting total.
runTransaction(ref(db,'novaStats/homeVisits'),value=>(Number.isSafeInteger(value)&&value>=0?value:0)+1).catch(()=>{});
let activity={},ready=false,offset=0;
onValue(ref(db,'.info/serverTimeOffset'),s=>{offset=Number(s.val())||0});
addEventListener('nova-os-windows',()=>{if(window.NovaOS?.isPageVisible('personal')){for(const kind of [...dirty])render(kind);active()}});
addEventListener('nova-background-visibility',e=>{if(e.detail.visible){for(const kind of [...dirty])render(kind);active()}});
function active(){if(ready&&((window.NovaPerformance?.backgroundVisible()??!document.hidden)||window.NovaOS?.isPageVisible('personal')))document.getElementById('nova-active').textContent=Object.values(activity).filter(records=>selectActivity(records,Date.now()+offset)).length.toLocaleString()}
let lastCount=null,checking=false;async function refreshActive(){if(checking||document.hidden)return;checking=true;const node=document.getElementById('nova-active');try{const {control}=await import('./control-client.js');const data=await control('communityStats');if(!Number.isSafeInteger(data.activeUsers)||data.activeUsers<0)throw Error('Invalid activity count');lastCount=data.activeUsers;node.textContent=lastCount.toLocaleString();node.title='Users active in Nova within the last minute';}catch{node.textContent=lastCount===null?'Reconnecting…':lastCount.toLocaleString();node.title='Reconnecting to the live user count';}finally{checking=false;}}refreshActive();setInterval(refreshActive,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshActive()});addEventListener('nova-server-progress',refreshActive);
