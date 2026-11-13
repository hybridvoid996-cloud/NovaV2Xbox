// Message list: grouping, rich formatting, mentions, replies, reactions, media and polls.
// Rows are keyed and only rebuilt when that message (or its reactions) changes.
import {state,el,h,icon,avatar,nameNode,person,isBot,botTag,badges,topRole,isStaff,when,fail,task,popover,toast} from './core.mjs';
import {openImage,videoPlayer} from './media.mjs';
import {showMiniProfile} from './profile.mjs';

export const POLL_EMOJI=['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
export const QUICK=['👍','❤️','😂','🔥','😮','😢','🎉','💀'];
const emojiKey=e=>Array.from(e).map(c=>c.codePointAt(0).toString(16)).join('-');

// ---------- formatting ----------
function appendLinks(parent,value){
 const re=/https?:\/\/[^\s<>]+|www\.[^\s<>]+/gi;let start=0,m;
 while((m=re.exec(value))){parent.append(value.slice(start,m.index));const clean=m[0].replace(/[.,!?;:)]+$/,'');const a=el('a','nm-link',clean);a.href=clean.startsWith('www.')?'https://'+clean:clean;a.target='_blank';a.rel='noopener noreferrer';parent.append(a,m[0].slice(clean.length));start=re.lastIndex}
 parent.append(value.slice(start));
}
function mentionChip(m){
 const chip=el('span','nm-mention');
 if(m.uid){const p=person(m.uid);chip.textContent='@'+(p.name||'unknown');const n=nameNode(m.uid,'span');chip.style.setProperty('--n-from',n.style.getPropertyValue('--n-from'));chip.style.setProperty('--n-to',n.style.getPropertyValue('--n-to'));chip.dataset.uid=m.uid;chip.tabIndex=0;chip.onclick=e=>showMiniProfile(m.uid,chip);if(m.uid===state.me?.uid)chip.classList.add('me')}
 else if(m.role){chip.textContent='@'+(state.customRoles?.[m.role]?.name||'role');chip.classList.add('role')}
 else{chip.textContent='@'+m.group;chip.classList.add('everyone')}
 return chip;
}
function inline(parent,value){
 const re=/(\|\|(.+?)\|\||\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|`([^`]+)`|\*([^*\n]+)\*|@<([^>\s]+)>|@role<([^>\s]+)>|@(everyone|here|owner|admin|moderator)\b)/g;let start=0,m;
 while((m=re.exec(value))){
  appendLinks(parent,value.slice(start,m.index));
  if(m[2]){const s=el('span','nm-spoiler');s.tabIndex=0;s.title='Spoiler · click to reveal';inline(s,m[2]);s.onclick=()=>s.classList.add('open');parent.append(s)}
  else if(m[8]||m[9]||m[10])parent.append(mentionChip({uid:m[8],role:m[9],group:m[10]}));
  else{const tag=m[3]?'strong':m[4]?'u':m[5]?'s':m[6]?'code':'em',n=el(tag);if(tag==='code')n.textContent=m[6];else inline(n,m[3]||m[4]||m[5]||m[7]);parent.append(n)}
  start=re.lastIndex;
 }
 appendLinks(parent,value.slice(start));
}
export function formatText(host,text){
 host.replaceChildren();const lines=String(text||'').split('\n');
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(line.startsWith('```')){const block=[];i++;while(i<lines.length&&!lines[i].startsWith('```'))block.push(lines[i++]);const pre=el('pre','nm-code');pre.append(el('code','',block.join('\n')));host.append(pre);continue}
  const m=/^(#{1,3} |> |-# )(.*)$/.exec(line);
  const node=el(m?(m[1]==='> '?'blockquote':m[1]==='-# '?'small':m[1]==='# '?'h3':m[1]==='## '?'h4':'h5'):'div');
  inline(node,m?m[2]:line);if(!line)node.append(el('br'));host.append(node);
 }
 // A message that is only emoji is shown large.
 if(/^\s*(\p{Extended_Pictographic}️?\s*){1,6}$/u.test(text||''))host.classList.add('nm-jumbo');
}
export function mentionsMe(text){const uid=state.me?.uid;if(!uid||!text)return false;if(text.includes('@<'+uid+'>')||/@(everyone|here)\b/.test(text))return true;const r=state.roles[uid]||'member';if(new RegExp('@'+r+'\\b').test(text))return true;return Object.keys(state.memberRoles?.[uid]||{}).some(id=>text.includes('@role<'+id+'>'))}

// ---------- polls ----------
export function pollText(question,options){return '📊 Poll: '+question.trim()+'\n'+options.map((o,i)=>POLL_EMOJI[i]+' '+o.trim()).join('\n')}
export function parsePoll(text){
 const lines=String(text||'').split('\n');const m=/^📊 Poll: (.+)$/u.exec(lines[0]||'');if(!m)return null;
 const options=[];for(const line of lines.slice(1)){const i=POLL_EMOJI.findIndex(e=>line.startsWith(e+' '));if(i!==options.length)return null;options.push(line.slice(POLL_EMOJI[i].length+1))}
 return options.length>=2?{question:m[1],options}:null;
}
function pollCard(poll,reactions,vote){
 const card=el('div','nm-poll'),counts=poll.options.map(()=>0);let mine=-1;
 for(const [uid,set]of Object.entries(reactions||{}))for(const e of Object.values(set||{})){const i=POLL_EMOJI.indexOf(e);if(i>=0&&i<counts.length){counts[i]++;if(uid===state.me?.uid)mine=i}}
 const total=counts.reduce((a,b)=>a+b,0);
 card.append(h('div',{class:'nm-poll-head'},icon('poll'),el('span','','POLL')),el('h4','',poll.question));
 poll.options.forEach((o,i)=>{const pct=total?Math.round(counts[i]/total*100):0;const b=h('button',{class:'nm-poll-opt'+(mine===i?' mine':''),type:'button',style:{'--pct':pct+'%'}},el('span','nm-poll-fill'),el('b','',o),el('span','nm-poll-pct',total?pct+'%':''));b.onclick=()=>vote(i,mine);card.append(b)});
 card.append(el('small','nm-poll-total',total+' vote'+(total===1?'':'s')+(mine>=0?' · tap your choice again to remove it':' · tap to vote')));
 return card;
}

// ---------- list ----------
export function createMessageList({host,api,path,canModerate,onReply,onEdit,welcome}){
 const scroller=el('div','nm-scroll'),list=el('div','nm-list');scroller.append(list);host.append(scroller);
 let messages={},reactions={},rows=new Map(),stick=true,first=true;
 const jump=h('button',{class:'nm-jump',type:'button',hidden:true},icon('chev'),'Jump to latest');jump.onclick=()=>{scroller.scrollTo({top:scroller.scrollHeight,behavior:'smooth'})};host.append(jump);
 scroller.addEventListener('scroll',()=>{stick=scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<80;jump.hidden=stick},{passive:true});

 async function react(id,emoji){try{await api.toggleReaction(path+'/'+id,state.me.uid,emoji)}catch(e){fail(e)}}
 async function vote(id,i,mine){try{if(mine>=0&&mine!==i)await api.toggleReaction(path+'/'+id,state.me.uid,POLL_EMOJI[mine]);await api.toggleReaction(path+'/'+id,state.me.uid,POLL_EMOJI[i])}catch(e){fail(e)}}
 function actions(id,m){
  const bar=el('div','nm-actions');
  const add=(name,label,fn)=>{const b=h('button',{type:'button','aria-label':label,title:label,class:'nc-icon-btn sm'},icon(name));b.onclick=fn;bar.append(b)};
  for(const e of QUICK.slice(0,3)){const b=h('button',{type:'button',class:'nm-quick',title:'React '+e},e);b.onclick=()=>react(id,e);bar.append(b)}
  add('smile','Add reaction',e=>{const grid=el('div','nm-react-grid');for(const q of QUICK){const b=h('button',{type:'button'},q);b.onclick=()=>{react(id,q);document.querySelector('.nc-pop')?.remove()};grid.append(b)}popover(e.currentTarget,grid,{side:'left'})});
  add('reply','Reply',()=>onReply?.(id,m));
  if(m.author===state.me?.uid&&!m.media&&!parsePoll(m.text))add('edit','Edit',()=>onEdit?.(id,m));
  if(m.author===state.me?.uid||canModerate)add('trash','Delete',task(async()=>{if(!confirm('Delete this message?'))return;await api.del(path+'/'+id)}));
  return bar;
 }
 function row(id,m,prev){
  const grouped=prev&&prev.author===m.author&&m.createdAt-prev.createdAt<5*60e3&&!m.replyTo;
  const r=el('article','nm-row'+(grouped?' grouped':'')+(mentionsMe(m.text)&&m.author!==state.me?.uid?' mentions-me':''));r.dataset.id=id;
  if(m.replyTo&&messages[m.replyTo]){const o=messages[m.replyTo],q=h('button',{class:'nm-replyto',type:'button'},avatar(o.author,'xs',{dot:false}),nameNode(o.author,'span'),el('span','nm-replytext',String(o.text||'Attachment').slice(0,120)));q.onclick=()=>{const t=rows.get(m.replyTo)?.node;if(t){t.scrollIntoView({block:'center',behavior:'smooth'});t.classList.add('flash');setTimeout(()=>t.classList.remove('flash'),1200)}};r.append(q)}
  const side=el('div','nm-side');
  if(grouped)side.append(el('time','nm-mini-time',new Date(m.createdAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})));
  else{const a=avatar(m.author,'md',{dot:false});a.tabIndex=0;a.onclick=()=>showMiniProfile(m.author,a);side.append(a)}
  const body=el('div','nm-body');
  if(!grouped){const head=el('header','nm-head'),n=nameNode(m.author);n.tabIndex=0;n.onclick=()=>showMiniProfile(m.author,n);head.append(n);if(isBot(m.author))head.append(botTag());else{const t=topRole(m.author);if(t)head.append(el('span','nm-role-tag '+t.toLowerCase(),t))}head.append(badges(m.author),el('time','',when(m.createdAt)));body.append(head)}
  const poll=parsePoll(m.text);
  if(poll)body.append(pollCard(poll,reactions[id],(i,mine)=>vote(id,i,mine)));
  else if(m.text&&!(m.media&&m.text==='Attachment')){const t=el('div','nm-text');formatText(t,m.text);if(m.edited)t.append(el('span','nm-edited','(edited)'));body.append(t)}
  if(m.media)body.append(mediaNode(m.media));
  if(!poll){const rs=reactionBar(id,reactions[id]);if(rs)body.append(rs)}
  r.append(side,body,actions(id,m));
  return r;
 }
 function mediaNode(media){
  if(media.type==='image'){const b=h('button',{class:'nm-media img',type:'button','aria-label':'Open image '+(media.name||'')});const img=el('img');img.src=media.url;img.alt=media.name||'';img.loading='lazy';img.decoding='async';b.append(img);b.onclick=()=>openImage(media.url,media.name);return b}
  if(media.type==='video')return videoPlayer(media.url,media.name);
  const a=h('a',{class:'nm-file',href:media.url,download:media.name||'file',target:'_blank',rel:'noopener'},icon('file'),el('span','',media.name||'File'),icon('download'));return a;
 }
 function reactionBar(id,set){
  const counts=new Map(),mine=new Set();
  for(const [uid,r]of Object.entries(set||{}))for(const e of Object.values(r||{})){counts.set(e,(counts.get(e)||0)+1);if(uid===state.me?.uid)mine.add(e)}
  if(!counts.size)return null;
  const bar=el('div','nm-reactions');
  for(const [e,n]of counts){const b=h('button',{type:'button',class:'nm-reaction'+(mine.has(e)?' mine':'')},el('span','',e),el('b','',String(n)));b.onclick=()=>react(id,e);bar.append(b)}
  return bar;
 }
 function render(){
  const ids=Object.keys(messages).sort((a,b)=>(messages[a].createdAt||0)-(messages[b].createdAt||0));
  const near=stick;const seen=new Set();let prev=null,prevId=null;const frag=[];
  for(const id of ids){
   const m=messages[id];const sig=JSON.stringify([m.text,m.edited,m.media?.url?.length,m.replyTo&&messages[m.replyTo]?.text,reactions[id],prevId&&messages[prevId]?.author,prevId&&Math.floor((m.createdAt-(messages[prevId].createdAt||0))/3e5)]);
   let entry=rows.get(id);if(!entry||entry.sig!==sig){const node=row(id,m,prev);if(entry)entry.node.replaceWith(node);entry={node,sig};rows.set(id,entry)}
   seen.add(id);frag.push(entry.node);prev=m;prevId=id;
  }
  for(const [id,e]of rows)if(!seen.has(id)){e.node.remove();rows.delete(id)}
  // Re-append only when order differs (cheap check), avoiding a full DOM rebuild.
  const current=[...list.children].filter(n=>n.classList.contains('nm-row'));
  if(current.length!==frag.length||current.some((n,i)=>n!==frag[i]))list.replaceChildren(...(ids.length?[]:[welcome?.()].filter(Boolean)),...frag);
  else if(!ids.length&&welcome&&!list.firstChild)list.append(welcome());
  if(first||near){requestAnimationFrame(()=>{scroller.scrollTop=scroller.scrollHeight});first=false}
 }
 const stops=[
  api.watch(path,v=>{messages=v||{};render()},e=>{list.replaceChildren(el('p','nm-error','Messages could not load. '+(e?.message||'')));},100),
  api.watch('reactions/'+path,v=>{reactions=v||{};render()},()=>{})
 ];
 return {stop(){stops.forEach(s=>s?.())},get messages(){return messages},scrollToBottom(){scroller.scrollTop=scroller.scrollHeight}};
}
