// Profiles: compact card (popover), full profile, cosmetics (banner, effect, frame), roles and activity.
import {state,el,h,icon,avatar,nameNode,person,isBot,botTag,badges,roleList,online,statusOf,asset,sheet,fail,task,toast,popover} from './core.mjs';
import {mountProfileCosmetic} from '../cosmetic-renderer.mjs?v=20261029-frame1';
import {playProfileEffect} from '../profile-effect.js';
import {gradientFor} from '../nitro-themes.js';
import {activityImage} from '../shared-activity.mjs?v=20261028-profile364';

let actions={openDM(){},addFriend(){},removeFriend(){},openSettings(){}};
export function setProfileActions(a){actions={...actions,...a}}
const elapsed=t=>{const s=Math.max(0,Math.floor((Date.now()-t)/1000)),m=Math.floor(s/60),hr=Math.floor(m/60);return hr?hr+'h '+(m%60)+'m':m?m+'m':s+'s'};

function activityCards(id){
 const out=el('div','np-activity');if(!online(id)||isBot(id))return out;
 const pr=state.presence[id]||{};
 if(pr.activity){const g=(pr.recentGames||[])[0];const art=activityImage(g?.art||pr.activityArt||'');const card=el('div','np-act game');card.append(h('div',{class:'np-act-art'},art?Object.assign(el('img'),{src:art,alt:''}):icon('game')),h('div',{class:'np-act-copy'},el('small','',pr.activityKind==='app'?'USING AN APP':'PLAYING'),el('b','',pr.activity),pr.activityStartedAt?el('span','','for '+elapsed(pr.activityStartedAt)):''));card.append(el('i','np-act-glow'));out.append(card)}
 if(pr.music?.name){const m=pr.music,card=el('div','np-act music'),art=activityImage(m.art);const prog=m.duration?Math.min(1,((m.position||0)+(Date.now()-(m.updatedAt||Date.now()))/1000)/m.duration):0;
  card.append(h('div',{class:'np-act-art spin'},art?Object.assign(el('img'),{src:art,alt:''}):icon('music')),h('div',{class:'np-act-copy'},el('small','','LISTENING ON NOVA MUSIC'),el('b','',m.name),el('span','',m.artist||''),h('i',{class:'np-act-bar',style:{'--p':Math.round(prog*100)+'%'}})));out.append(card)}
 return out;
}
function cosmetics(card,p){
 const effect=asset(p.effect);
 if(effect){
  if(effect.renderMode==='profile-frame'){mountProfileCosmetic(card,effect);card.classList.add('np-framed')}
  else if(effect.layers?.length)mountProfileCosmetic(card,effect);
  else{const img=el('img','np-effect');img.alt='';card.append(img);playProfileEffect(img,effect.src)}
 }
}
/** The profile card used by the popover, the full profile and the settings preview. */
export function profileCard(id,{draft,compact=false}={}){
 const p={...person(id),...(draft||{})},card=el('article','np-card'+(compact?' compact':''));card.dataset.uid=id;
 const theme=gradientFor(p.profileTheme,p.profileGradient);if(theme)card.style.setProperty('--np-theme',theme);
 const banner=el('div','np-banner');const nameplate=asset(p.chatBanner);
 if(p.banner&&/^(https:\/\/|data:image\/)/.test(p.banner))banner.style.backgroundImage='url("'+p.banner.replace(/"/g,'')+'")';
 else if(nameplate)banner.style.backgroundImage='url("'+nameplate.src+'")';
 else banner.classList.add('np-banner-default');
 if(p.nitroBooster)banner.append(h('span',{class:'np-boost',title:'Nitro booster'},icon('nitro'),'Booster'));
 const av=avatar(id,'xl');av.classList.add('np-av');
 const body=el('div','np-body');
 const nm=h('div',{class:'np-name'},nameNode(id,'h2'),isBot(id)?botTag():'');
 const handle=el('p','np-handle',(isBot(id)?'Nova system':'@'+(p.accountName||p.name||'player'))+' · '+({online:'Online',idle:'Idle',dnd:'Do not disturb',offline:'Offline'})[statusOf(id)]);
 const badgeRow=el('div','np-badges');badgeRow.append(badges(id));if(p.novaTag)badgeRow.prepend(h('span',{class:'np-novatag'},'NOVA'));
 body.append(nm,handle,badgeRow);
 if(p.bio)body.append(h('section',{class:'np-sec'},el('h6','','ABOUT ME'),el('p','np-bio',p.bio)));
 body.append(activityCards(id));
 if(!isBot(id)){const roles=roleList(id).filter(r=>r.id!=='member');if(roles.length){const sec=h('section',{class:'np-sec'},el('h6','','ROLES')),wrap=el('div','np-roles');for(const r of roles){const chip=el('span','np-role');chip.style.setProperty('--r-from',r.from||r.color||'#9aa3b2');chip.style.setProperty('--r-to',r.to||r.color||r.from||'#fff');chip.append(el('i'),el('b','',r.name));wrap.append(chip)}sec.append(wrap);body.append(sec)}}
 card.append(banner,av,body);cosmetics(card,p);
 return card;
}
function friendButtons(id){
 const row=el('div','np-actions');if(id===state.me.uid){const b=h('button',{type:'button',class:'nc-btn primary'},icon('edit'),'Edit profile');b.onclick=()=>actions.openSettings('Profile');row.append(b);return row}
 if(isBot(id)){const b=h('button',{type:'button',class:'nc-btn primary'},icon('inbox'),'Open inbox');b.onclick=()=>actions.openDM(id);row.append(b);return row}
 if(state.friends[id]){const b=h('button',{type:'button',class:'nc-btn primary'},icon('chat'),'Message');b.onclick=()=>actions.openDM(id);row.append(b)}
 else if(state.requests[id]){const b=h('button',{type:'button',class:'nc-btn primary'},icon('check'),'Accept request');b.onclick=task(()=>actions.acceptFriend(id));row.append(b)}
 else{const b=h('button',{type:'button',class:'nc-btn primary'},icon('friend'),'Add friend');b.onclick=task(async()=>{await actions.addFriend(id);b.disabled=true;b.lastChild.textContent='Request sent'});row.append(b)}
 return row;
}
export function showMiniProfile(id,anchor){
 const wrap=el('div','np-mini');const card=profileCard(id,{compact:true});
 const note=h('textarea',{class:'np-note',placeholder:'Add a private note…',maxlength:'200','aria-label':'Private note'});try{note.value=localStorage.getItem('nova_chat_note_'+id)||''}catch{}note.oninput=()=>{try{localStorage.setItem('nova_chat_note_'+id,note.value)}catch{}};
 const full=h('button',{type:'button',class:'nc-btn ghost'},icon('users'),'View full profile');full.onclick=()=>{wrap.closest('.nc-pop')?.remove();openFullProfile(id)};
 card.querySelector('.np-body').append(friendButtons(id),...(id!==state.me.uid&&!isBot(id)?[note]:[]),full);
 wrap.append(card);popover(anchor,wrap,{side:anchor.closest('.nc-members')?'left':'right',cls:'np-pop'});
}
export function openFullProfile(id){
 const d=sheet(person(id).name||'Profile',{wide:true,cls:'np-full'});
 const left=el('div','np-full-left');left.append(profileCard(id));left.querySelector('.np-body').append(friendButtons(id));
 const right=el('div','np-full-right'),tabs=el('div','np-tabs'),panel=el('div','np-panel');right.append(tabs,panel);
 const show=key=>{tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===key));panel.replaceChildren();
  if(key==='activity'){const pr=state.presence[id]||{};const games=(pr.recentGames||[]).slice(0,6);panel.append(el('h4','','Recently played'));if(!games.length)panel.append(el('p','np-empty','Nothing played yet.'));for(const g of games){const art=activityImage(g.art);panel.append(h('div',{class:'np-recent'},h('span',{class:'np-recent-art'},art?Object.assign(el('img'),{src:art,alt:''}):icon('game')),h('div',{},el('b','',g.name),el('small','',g.kind==='cloud'?'Cloud game':'Game'))))}const cards=activityCards(id);if(cards.children.length){panel.append(el('h4','','Right now'),cards)}}
  if(key==='friends'){panel.append(el('p','np-empty','Loading mutual friends…'));actions.mutualFriends?.(id).then(list=>{panel.replaceChildren(el('h4','',list.length+' mutual friend'+(list.length===1?'':'s')));for(const f of list){const b=h('button',{type:'button',class:'np-mutual'},avatar(f,'sm'),nameNode(f,'span'));b.onclick=()=>{d.close();openFullProfile(f)};panel.append(b)}if(!list.length)panel.append(el('p','np-empty','No mutual friends yet.'))}).catch(()=>panel.replaceChildren(el('p','np-empty','Mutual friends are unavailable.')))}
  if(key==='note'){const note=h('textarea',{class:'np-note big',placeholder:'Only you can see this note.',maxlength:'500'});try{note.value=localStorage.getItem('nova_chat_note_'+id)||''}catch{}note.oninput=()=>{try{localStorage.setItem('nova_chat_note_'+id,note.value)}catch{}};panel.append(el('h4','','Private note'),note)}
 };
 for(const [k,label]of [['activity','Activity'],['friends','Mutual friends'],['note','Note']]){if(k!=='activity'&&(id===state.me.uid||isBot(id)))continue;const b=h('button',{type:'button','data-k':k},label);b.onclick=()=>show(k);tabs.append(b)}
 d.body.append(h('div',{class:'np-full-grid'},left,right));show('activity');
 if(state.friends[id]&&id!==state.me.uid){const rm=h('button',{type:'button',class:'nc-btn danger ghost np-remove'},icon('trash'),'Remove friend');rm.onclick=task(async()=>{if(!confirm('Remove '+person(id).name+' as a friend?'))return;await actions.removeFriend(id);d.close();toast('Friend removed.')});right.append(rm)}
}
