// Profiles: popover card, DM side panel, full profile, cosmetics (banner, effect, frame), roles and activity.
import {state,el,h,icon,avatar,nameNode,person,isBot,botTag,badges,roleList,online,statusOf,asset,sheet,fail,task,toast,popover} from './core.mjs?v=9';
import {mountProfileCosmetic} from '../cosmetic-renderer.mjs?v=20261029-frame1';
import {playProfileEffect} from '../profile-effect.js';
import {gradientFor} from '../nitro-themes.js';
import {activityImage} from '../shared-activity.mjs?v=20261028-profile364';

let actions={openDM(){},addFriend(){},removeFriend(){},openSettings(){}};
export function setProfileActions(a){actions={...actions,...a}}
const STATUS_LABEL={online:'Online',idle:'Idle',dnd:'Do not disturb',offline:'Offline'};
const elapsed=t=>{const s=Math.max(0,Math.floor((Date.now()-t)/1000)),m=Math.floor(s/60),hr=Math.floor(m/60);return hr?hr+'h '+(m%60)+'m':m?m+'m':s+'s'};
const ago=t=>{if(!t)return '';const d=Math.floor((Date.now()-t)/864e5);return d<1?'Today':d<7?d+'d ago':d<30?Math.floor(d/7)+'w ago':Math.floor(d/30)+'mo ago'};
const handleOf=(id,p)=>isBot(id)?'nova-bot':(p.accountName||p.name||'player').toLowerCase().replace(/\s+/g,'');
const dateOf=t=>t?new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'';
const img=(src,cls='')=>{const i=el('img',cls);i.src=src;i.alt='';i.loading='lazy';i.decoding='async';i.onerror=()=>i.remove();return i};

// ---------- shared pieces ----------
function applyTheme(node,p){const theme=gradientFor(p.profileTheme,p.profileGradient);if(theme){node.style.setProperty('--np-theme',theme);node.classList.add('themed')}}
function bannerNode(p,cls='np-banner'){
 const banner=el('div',cls);const nameplate=asset(p.chatBanner);
 if(p.banner&&/^(https:\/\/|data:image\/)/.test(p.banner))banner.style.backgroundImage='url("'+p.banner.replace(/"/g,'')+'")';
 else if(nameplate)banner.style.backgroundImage='url("'+nameplate.src+'")';
 else banner.classList.add('np-banner-default');
 return banner;
}
function statusBubble(id,p){
 if(isBot(id))return null;const pr=state.presence[id]||{};
 const text=p.customStatus||(online(id)&&pr.activity?(pr.activityKind==='app'?'Using ':'Playing ')+pr.activity:online(id)&&pr.music?.name?'Listening to '+pr.music.name:'');
 if(!text)return null;const b=el('div','np-bubble');b.append(el('span','',text));return b;
}
function metaLine(id,p){
 const meta=el('div','np-handle');meta.append(el('span','',handleOf(id,p)));
 if(!isBot(id)){meta.append(el('i','np-sep','•'),el('span','np-status '+statusOf(id),STATUS_LABEL[statusOf(id)]))}
 if(p.novaTag){const t=h('span',{class:'np-tag'},img('/Nova12.png'),'NOVA');meta.append(t)}
 if(p.nitroBooster)meta.append(h('span',{class:'np-tag boost',title:'Nitro booster'},icon('nitro'),'Booster'));
 return meta;
}
function rolesBlock(id,{title=true}={}){
 if(isBot(id))return null;const roles=roleList(id).filter(r=>r.id!=='member');if(!roles.length)return null;
 const sec=el('section','np-sec');if(title)sec.append(el('h6','','Roles'));const wrap=el('div','np-roles');
 for(const r of roles){const chip=el('span','np-role');chip.style.setProperty('--r-from',r.from||r.color||'#9aa3b2');chip.style.setProperty('--r-to',r.to||r.color||r.from||'#fff');chip.append(el('i'),el('b','',r.name));wrap.append(chip)}
 sec.append(wrap);return sec;
}
function bioBlock(id,p,{clamp=false,onMore}={}){
 if(!p.bio)return null;const sec=el('section','np-sec np-biosec');const bio=el('p','np-bio'+(clamp?' clamp':''),p.bio);sec.append(bio);
 if(clamp&&onMore){const more=h('button',{type:'button',class:'np-more'},'View Full Bio');more.onclick=onMore;sec.append(more);requestAnimationFrame(()=>{if(bio.scrollHeight<=bio.clientHeight+2)more.remove()})}
 return sec;
}
function activityCards(id,{big=false}={}){
 const out=el('div','np-activity'+(big?' big':''));if(!online(id)||isBot(id))return out;
 const pr=state.presence[id]||{};
 if(pr.activity){const g=(pr.recentGames||[])[0];const art=activityImage(g?.art||pr.activityArt||'');const card=el('div','np-act game');card.append(h('div',{class:'np-act-art'},art?img(art):icon('game')),h('div',{class:'np-act-copy'},el('small','',pr.activityKind==='app'?'Using an app':'Playing'),el('b','',pr.activity),pr.activityStartedAt?h('span',{class:'np-act-time'},icon('game'),elapsed(pr.activityStartedAt)):''));out.append(card)}
 if(pr.music?.name){const m=pr.music,card=el('div','np-act music'),art=activityImage(m.art);const prog=m.duration?Math.min(1,((m.position||0)+(Date.now()-(m.updatedAt||Date.now()))/1000)/m.duration):0;
  card.append(h('div',{class:'np-act-art'},art?img(art):icon('music')),h('div',{class:'np-act-copy'},el('small','','Listening to Nova Music'),el('b','',m.name),el('span','',m.artist||''),h('i',{class:'np-act-bar',style:{'--p':Math.round(prog*100)+'%'}})));out.append(card)}
 return out;
}
function gameShelf(id){
 const games=(state.presence[id]?.recentGames||[]).slice(0,6);if(!games.length)return null;
 const row=el('div','np-shelf');row.append(el('span','np-shelf-title','Game Collection'));const arts=el('div','np-shelf-arts');
 games.slice(0,3).forEach(g=>{const art=activityImage(g.art);const t=el('span','np-shelf-art');t.title=g.name;t.append(art?img(art):icon('game'));arts.append(t)});
 if(games.length>3)arts.append(el('span','np-shelf-more','+'+(games.length-3)));row.append(arts);return row;
}
function cosmetics(card,p){
 const effect=asset(p.effect);
 if(effect){
  if(effect.renderMode==='profile-frame'){mountProfileCosmetic(card,effect);card.classList.add('np-framed')}
  else if(effect.layers?.length)mountProfileCosmetic(card,effect);
  else{const i=el('img','np-effect');i.alt='';card.append(i);playProfileEffect(i,effect.src)}
 }
}
function mutualRow(id,onOpen){
 const row=el('button','np-mutual-row');row.type='button';row.hidden=true;
 if(id===state.me.uid||isBot(id)||!actions.mutualFriends)return row;
 actions.mutualFriends(id).then(list=>{if(!list.length||!row.isConnected)return;row.hidden=false;const faces=el('span','np-mutual-faces');list.slice(0,3).forEach(f=>faces.append(avatar(f,'xs',{dot:false})));row.append(faces,el('span','',list.length+' Mutual Friend'+(list.length===1?'':'s')));row.onclick=onOpen}).catch(()=>{});
 return row;
}
function messageBox(id,close){
 const box=h('form',{class:'np-msg'});const input=h('input',{type:'text',placeholder:'Message @'+(person(id).name||'friend'),maxlength:'2000','aria-label':'Message '+person(id).name});
 const send=h('button',{type:'submit',class:'np-msg-send','aria-label':'Send'},icon('smile'));box.append(input,send);
 box.onsubmit=task(async e=>{e.preventDefault();const text=input.value.trim();close?.();if(text&&actions.sendDM)await actions.sendDM(id,text);else actions.openDM(id)});
 return box;
}
function primaryAction(id,close,{compact=false}={}){
 if(id===state.me.uid){const b=h('button',{type:'button',class:'np-pill'},icon('edit'),'Edit Profile');b.onclick=()=>{close?.();actions.openSettings('Profile')};return b}
 if(isBot(id)){const b=h('button',{type:'button',class:'np-pill'},icon('inbox'),'Open Inbox');b.onclick=()=>{close?.();actions.openDM(id)};return b}
 if(state.friends[id]){if(compact)return messageBox(id,close);const b=h('button',{type:'button',class:'np-pill primary'},icon('chat'),'Message');b.onclick=()=>{close?.();actions.openDM(id)};return b}
 if(state.requests[id]){const b=h('button',{type:'button',class:'np-pill primary'},icon('check'),'Accept Request');b.onclick=task(async()=>{await actions.acceptFriend(id);b.disabled=true;b.lastChild.textContent='Friends now'});return b}
 const b=h('button',{type:'button',class:'np-pill primary'},icon('friend'),'Add Friend');b.onclick=task(async()=>{await actions.addFriend(id);b.disabled=true;b.lastChild.textContent='Request Sent'});return b;
}
function toolBtn(ic,label,fn){const b=h('button',{type:'button',class:'np-tool','aria-label':label,title:label},icon(ic));b.onclick=e=>{e.stopPropagation();fn(b)};return b}
function moreMenu(id,anchor,close,{full=true}={}){
 const host=anchor.closest('.np-more-wrap,.np-card,.np-side')||anchor.parentElement;const old=host.querySelector('.np-dropdown');if(old){old.remove();return}
 const m=el('div','nc-menu np-dropdown');const item=(ic,label,fn,cls='')=>{const b=h('button',{type:'button',class:cls},icon(ic),el('span','',label));b.onclick=e=>{e.stopPropagation();m.remove();fn()};m.append(b)};
 if(full)item('users','View Full Profile',()=>{close?.();openFullProfile(id)});
 item('file','Copy Username',async()=>{try{await navigator.clipboard.writeText(person(id).accountName||person(id).name||'');toast('Username copied.')}catch{}});
 if(state.friends[id]&&id!==state.me.uid)item('trash','Remove Friend',task(async()=>{if(!confirm('Remove '+person(id).name+' as a friend?'))return;close?.();await actions.removeFriend(id);toast('Friend removed.')}),'danger');
 host.append(m);const off=e=>{if(!m.contains(e.target)&&e.target!==anchor&&!anchor.contains(e.target)){m.remove();removeEventListener('pointerdown',off,true)}};setTimeout(()=>addEventListener('pointerdown',off,true));
}
function noteBox(id,{big=false}={}){
 const note=h('textarea',{class:'np-note'+(big?' big':''),placeholder:'Click to add a note',maxlength:'500','aria-label':'Private note'});
 try{note.value=localStorage.getItem('nova_chat_note_'+id)||''}catch{}note.oninput=()=>{try{localStorage.setItem('nova_chat_note_'+id,note.value)}catch{}};return note;
}

/** The profile card used by the popover and the settings preview. */
export function profileCard(id,{draft,compact=false,onMore}={}){
 const p={...person(id),...(draft||{})},card=el('article','np-card'+(compact?' compact':''));card.dataset.uid=id;applyTheme(card,p);
 const banner=bannerNode(p);const tools=el('div','np-tools');banner.append(tools);
 const av=avatar(id,'xl');av.classList.add('np-av');
 const bubble=statusBubble(id,p);
 const body=el('div','np-body');
 body.append(h('div',{class:'np-name'},nameNode(id,'h2'),isBot(id)?botTag():''),metaLine(id,p));
 const b=el('div','np-badges');b.append(badges(id));if(b.querySelector('.identity-badge:not(.nova-tag-chip)'))body.append(b);
 body.append(mutualRow(id,onMore||(()=>{})));
 const bio=bioBlock(id,p,{clamp:compact,onMore});if(bio)body.append(bio);
 const acts=activityCards(id);if(acts.children.length)body.append(acts);
 const shelf=gameShelf(id);if(shelf)body.append(shelf);
 const roles=rolesBlock(id);if(roles)body.append(roles);
 card.append(banner,av);if(bubble)card.append(bubble);card.append(body);cosmetics(card,p);
 return card;
}
export function showMiniProfile(id,anchor){
 const wrap=el('div','np-mini');const close=()=>wrap.closest('.nc-pop')?.remove();const open=()=>{close();openFullProfile(id)};
 const card=profileCard(id,{compact:true,onMore:open});
 const tools=card.querySelector('.np-tools');
 if(id!==state.me.uid&&!isBot(id)&&!state.friends[id]&&!state.requests[id])tools.append(toolBtn('friend','Add Friend',task(async b=>{await actions.addFriend(id);b.disabled=true;toast('Friend request sent.')})));
 tools.append(toolBtn('dots','More',b=>moreMenu(id,b,close)));
 card.querySelector('.np-av').onclick=open;card.querySelector('.np-name .nn-name')?.addEventListener('click',open);
 const foot=el('div','np-foot');foot.append(primaryAction(id,close,{compact:true}));card.append(foot);
 wrap.append(card);popover(anchor,wrap,{side:anchor.closest('.nc-members')?'left':'right',cls:'np-pop'});
}

/** Tall profile panel shown beside a DM. */
export function dmPanel(id){
 const p=person(id),panel=el('aside','np-side');applyTheme(panel,p);
 const banner=bannerNode(p,'np-side-banner');const tools=el('div','np-tools');banner.append(tools);
 if(!isBot(id))tools.append(toolBtn('dots','More',b=>moreMenu(id,b,null,{full:true})));
 const av=avatar(id,'xl');av.classList.add('np-side-av');av.onclick=()=>openFullProfile(id);
 const bubble=statusBubble(id,p);
 const head=el('div','np-side-head');head.append(h('div',{class:'np-name'},nameNode(id,'h2'),isBot(id)?botTag():''),metaLine(id,p));
 const b=el('div','np-badges');b.append(badges(id));if(b.querySelector('.identity-badge:not(.nova-tag-chip)'))head.append(b);
 const box=el('div','np-side-box');
 const bio=bioBlock(id,p);if(bio){bio.prepend(el('h6','','About Me'));box.append(bio)}
 if(p.joined&&!isBot(id))box.append(h('section',{class:'np-sec'},el('h6','','Member Since'),h('div',{class:'np-since'},img('/Nova12.png'),el('span','',dateOf(p.joined)))));
 const acts=activityCards(id);if(acts.children.length)box.append(acts);
 const shelf=gameShelf(id);if(shelf)box.append(shelf);
 const roles=rolesBlock(id);if(roles)box.append(roles);
 if(!isBot(id)&&id!==state.me.uid)box.append(h('section',{class:'np-sec'},el('h6','','Note (only visible to you)'),noteBox(id)));
 const mutual=mutualRow(id,()=>openFullProfile(id,'friends'));mutual.classList.add('boxed');
 const full=h('button',{type:'button',class:'np-side-full'},'View Full Profile');full.onclick=()=>openFullProfile(id);
 const scroller=el('div','np-side-scroll');scroller.append(banner,av);if(bubble)scroller.append(bubble);scroller.append(head,box,mutual);
 panel.append(scroller,full);
 return panel;
}

/** Big profile window (View Full Profile). */
export function openFullProfile(id,startTab='activity'){
 const p=person(id);const d=sheet(p.name||'Profile',{wide:true,cls:'np-full'});applyTheme(d,p);
 d.querySelector('.nc-sheet-head')?.remove();
 const x=h('button',{type:'button',class:'np-full-close','aria-label':'Close'},icon('x'));x.onclick=()=>d.close();
 const left=el('div','np-full-left');
 const banner=bannerNode(p,'np-full-banner');
 const av=avatar(id,'xl');av.classList.add('np-full-av');
 const bubble=statusBubble(id,p);
 const info=el('div','np-full-info');
 info.append(h('div',{class:'np-name'},nameNode(id,'h2'),isBot(id)?botTag():''),metaLine(id,p));
 const b=el('div','np-badges');b.append(badges(id));if(b.querySelector('.identity-badge:not(.nova-tag-chip)'))info.append(b);
 const actRow=el('div','np-full-actions');actRow.append(primaryAction(id,()=>d.close()));
  if(!isBot(id)&&id!==state.me.uid){const wrapMore=el('span','np-more-wrap');const more=toolBtn('dots','More',btn=>moreMenu(id,btn,()=>d.close(),{full:false}));more.classList.add('square');wrapMore.append(more);actRow.append(wrapMore)}
 info.append(actRow);
 const bio=bioBlock(id,p);if(bio){bio.prepend(el('h6','','About Me'));info.append(bio)}
 if(p.joined&&!isBot(id))info.append(h('section',{class:'np-sec'},el('h6','','Member Since'),h('div',{class:'np-since'},img('/Nova12.png'),el('span','',dateOf(p.joined)))));
 const roles=rolesBlock(id);if(roles)info.append(roles);
 if(!isBot(id)&&id!==state.me.uid)info.append(h('section',{class:'np-sec'},el('h6','','Note (only visible to you)'),noteBox(id)));
 left.append(banner,av);if(bubble)left.append(bubble);left.append(info);cosmetics(left,p);
 const right=el('div','np-full-right'),tabs=el('div','np-tabs'),panel=el('div','np-panel');right.append(tabs,panel);
 const show=key=>{tabs.querySelectorAll('button').forEach(t=>t.classList.toggle('on',t.dataset.k===key));panel.replaceChildren();
  if(key==='activity'){
   const pr=state.presence[id]||{};const now=activityCards(id,{big:true});
   if(now.children.length)panel.append(el('h4','','Current activity'),now);
   const games=(pr.recentGames||[]).slice(0,8);
   if(games.length){panel.append(el('h4','','Recent activity'));for(const g of games){const art=activityImage(g.art);panel.append(h('div',{class:'np-recent'},h('span',{class:'np-recent-art'},art?img(art):icon('game')),h('div',{class:'np-recent-copy'},el('b','',g.name),h('small','',icon('game'),g.playedAt?ago(g.playedAt):g.kind==='cloud'?'Cloud game':'Played on Nova'))))}}
   if(!panel.children.length)panel.append(h('div',{class:'np-empty'},icon('game'),el('b','','No activity yet'),el('span','',(p.name||'They')+' hasn\'t played anything on Nova recently.')));
  }
  if(key==='friends'){panel.append(el('p','np-empty-line','Loading mutual friends…'));actions.mutualFriends?.(id).then(list=>{panel.replaceChildren();if(!list.length){panel.append(h('div',{class:'np-empty'},icon('users'),el('b','','No mutual friends'),el('span','','You don\'t share any friends yet.')));return}for(const f of list){const r=h('button',{type:'button',class:'np-mutual'},avatar(f,'md'),h('div',{class:'np-mutual-copy'},nameNode(f,'b'),el('small','',STATUS_LABEL[statusOf(f)])));r.onclick=()=>{d.close();openFullProfile(f)};panel.append(r)}}).catch(()=>panel.replaceChildren(el('p','np-empty-line','Mutual friends are unavailable.')))}
 };
 const tabList=[['activity','Activity']];if(id!==state.me.uid&&!isBot(id))tabList.push(['friends','Mutual Friends']);
 for(const [k,label]of tabList){const t=h('button',{type:'button','data-k':k},label);t.onclick=()=>show(k);tabs.append(t)}
 d.body.append(x,h('div',{class:'np-full-grid'},left,right));show(tabList.some(t=>t[0]===startTab)?startTab:'activity');
}
