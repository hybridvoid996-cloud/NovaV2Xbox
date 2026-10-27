import {activityImage} from './shared-activity.mjs';
const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!=null)n.textContent=text;return n};
export function openGameLeaderboard(key,open){
 if(!/^(game|cloud|app):[^\s]+$/.test(key||''))return;
 sessionStorage.setItem('nova-leaderboard-game',key);open?.();
 for(const frame of document.querySelectorAll('iframe'))try{frame.contentWindow.postMessage({novaAction:'selectLeaderboardGame',game:key},location.origin)}catch{}
}
export function mountProfileMedia(host,p={},options={}){
 let music=p.recentMusic||[],movies=p.recentMovies||[];
 if(options.self){try{music=JSON.parse(localStorage.getItem('nova-recent-music:'+p.key)||'null')||music}catch{}try{const local=Object.values(JSON.parse(localStorage.getItem('nova-movie-progress:'+p.key)||'{}')).filter(m=>m.position>=5).sort((a,b)=>b.updatedAt-a.updatedAt);if(local.length)movies=local}catch{}}
 for(const [title,items,kind]of [['Recently listened',music,'music'],['Recently watched',movies,'movie']]){
  const section=el('section','main-profile-media');section.append(el('h3','',title));const list=el('div','main-profile-media-list');
  for(const item of (Array.isArray(items)?items:[]).slice(0,4)){
   const row=el(kind==='movie'&&options.onMovie?'button':'div','main-profile-media-row'),img=el('img');img.src=activityImage(item.art||item.poster||item.backdrop)||'/Nova12.png';img.alt='';img.loading='lazy';img.onerror=()=>{img.onerror=null;img.src='/Nova12.png'};
   const copy=el('span');copy.append(el('strong','',item.name||item.title||'Untitled'),el('small','',kind==='music'?item.artist||'Nova Music':item.episode?'Season '+(item.season||1)+' · Episode '+item.episode:item.type==='movie'?'Movie':item.type==='anime'?'Anime':'TV series'));row.append(img,copy);if(row.tagName==='BUTTON'){row.type='button';row.onclick=()=>options.onMovie(item)}list.append(row);
  }
  if(!list.childNodes.length)list.append(el('p','main-profile-muted',kind==='music'?'No shared songs yet.':'No shared watches yet.'));section.append(list);host.append(section);
 }
}
