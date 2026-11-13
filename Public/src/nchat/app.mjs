// Nova Chat app shell: data, layout, navigation and views.
import {state,el,h,icon,avatar,nameNode,person,isBot,botTag,BOT_ID,isStaff,isOwner,online,statusOf,activityText,asset,topRole,toast,fail,task,sheet,popover,dmPath,lowPower,fmt,role} from './core.mjs?v=9';
import {createLoader} from './loader.mjs?v=9';
import {createMessageList} from './messages.mjs?v=9';
import {createComposer} from './composer.mjs?v=9';
import {showMiniProfile,openFullProfile,profileCard,setProfileActions,dmPanel} from './profile.mjs?v=9';
import {friendsView,groupBuilder} from './friends.mjs?v=9';
import {openSettings} from './settings.mjs?v=9';
import {control} from '../control-client.js';
import {rolesFor,paintName} from '../chat-server.js?v=20261029-chat387';
import {nitroView} from './nitro.mjs?v=9';
import {startNotifications,applyPreferences} from '../chat-preferences.js?v=20261029-motion372';
import {mountVoice} from '../../voice-chat.js';

const preview=['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('preview')==='1';
state.preview=preview;
const loader=createLoader();
let api;
const STAFF_POST=['welcome','announcements','updates','leaks','links'];
const BASE=[
 {id:'info',name:'Information',channels:[['welcome','Welcome','Start here'],['announcements','announcements','Official news from the Nova team'],['updates','updates','What\'s new on Nova'],['leaks','leaks','Sneak peeks'],['links','links','Working Nova links']]},
 {id:'community',name:'Community',channels:[['general','general','Hang out with everyone'],['community-links','community-links','Share links'],['ai-assistance','ai-assistance','Ask Nova AI anything']]},
 {id:'perks',name:'Perks',special:[['nitro','Nitro','nitro'],['shop','Shop','bag']]},
 {id:'support',name:'Support',special:[['report','Reports','flag'],['suggestions','Suggestions','sparkle']]},
 {id:'staff',name:'Staff',staff:true,channels:[['owner-lounge','owner-lounge','Staff only']]}
];

// ---------- layout ----------
const app=el('div','chat-shell nc-app');app.hidden=true;
const bg=el('div','nc-bg');
const rail=el('nav','nc-rail');rail.setAttribute('aria-label','Servers and friends');
const sidebar=el('aside','nc-sidebar'),serverHead=el('header','nc-server'),chanList=el('nav','nc-chanlist'),userPanel=el('div','nc-userpanel');
sidebar.append(serverHead,chanList,userPanel);
const main=el('main','nc-main'),topbar=el('header','nc-top'),content=el('div','nc-content');main.append(topbar,content);
const members=el('aside','nc-members');
app.append(bg,rail,sidebar,main,members);document.body.append(app);
let current=null; // {stop()}
let voice=null,friendsRef=null;

// ---------- background (the user's Nova wallpaper, blurred) ----------
function applyBackground(){
 bg.replaceChildren();bg.style.cssText='';
 if(localStorage.getItem('nova_chat_bg')==='off'){bg.classList.add('plain');return}
 bg.classList.remove('plain');bg.style.setProperty('--blur',(localStorage.getItem('nova_chat_bg_blur')||'22')+'px');
 let grad=null;try{grad=JSON.parse(localStorage.getItem('nova_grad')||'null')}catch{}
 const src=localStorage.getItem('nova_wallpaper_upload')||localStorage.getItem('nova_wallpaper')||'';
 if(src&&/\.(mp4|webm)(\?|$)|^data:video/i.test(src)&&!lowPower()){const v=el('video');Object.assign(v,{src,muted:true,loop:true,autoplay:true,playsInline:true});v.setAttribute('muted','');bg.append(v);v.play?.().catch(()=>{})}
 else if(src&&!/\.(mp4|webm)(\?|$)|^data:video/i.test(src))bg.style.backgroundImage='url("'+src.replace(/"/g,'')+'")';
 else if(grad?.colors)bg.style.backgroundImage='linear-gradient('+(grad.angle||135)+'deg,'+grad.colors.join(',')+')';
 else bg.classList.add('default');
}

// ---------- legacy context (moderation commands, cosmetics studio, Nitro, server manager) ----------
function legacy(){
 const legacyAvatar=(id,size='')=>{const a=avatar(id,size==='large'?'lg':'md');a.classList.add('avatar');return a};
 return {state:Object.assign(state,{page:state.view.type,peer:state.view.type==='dm'?state.view.id:null}),person,role,avatar:legacyAvatar,api,task,toast,
  asset:id=>asset(id),openDM,settings:k=>settings(k||'Profile'),
  modal:title=>{const d=sheet(title,{cls:'legacy-modal'});return d},
  button:(text,fn,cls='')=>{const b=h('button',{type:'button',class:'nc-btn '+(cls==='primary'?'primary':cls||'ghost')},text);b.onclick=fn;return b},
  rolesFor:id=>rolesFor(id,state),paintName:(n,id)=>paintName(n,id,state)};
}

// ---------- navigation ----------
function stopCurrent(){current?.stop?.();current=null;content.replaceChildren();main.classList.remove('nova-voice-view')}
function go(view){state.view=view;app.classList.toggle('nc-focus',['nitro','shop'].includes(view.type));paintRail();paintChannels();paintMembers();try{sessionStorage.setItem('nova_chat_view',JSON.stringify(view))}catch{}}
function openChannel(id){stopCurrent();go({type:'channel',id});renderConversation()}
function openDM(id){if(id===BOT_ID)return openBot();if(!state.friends[id]){toast('You can only message friends.');return}stopCurrent();go({type:'dm',id});renderConversation()}
function openGroup(id){stopCurrent();go({type:'group',id});renderConversation()}
function openBot(){stopCurrent();go({type:'bot',id:BOT_ID});renderConversation()}
function openFriends(){stopCurrent();go({type:'friends'});topbarFor();friendsRef=friendsView(content,{api,control,openDM,openGroup,addFriend,acceptFriend,ignoreFriend,preview});current={stop(){friendsRef=null}}}
function openNitro(){stopCurrent();go({type:'nitro'});topbarFor();const host=el('div','nc-page nc-nitro');content.append(host);try{nitroView(host,{settings:k=>settings(k),preview})}catch(e){fail(e)}}
function openShop(){stopCurrent();go({type:'shop'});topbarFor();const f=h('iframe',{class:'nc-shop',src:'/shop.html'+(preview?'?preview':''),title:'Nova Shop'});content.append(f)}
function openForm(kind){stopCurrent();go({type:'form',id:kind});topbarFor();supportForm(kind)}
function openStaffInbox(){stopCurrent();go({type:'inbox'});topbarFor();staffInbox()}

// ---------- friends actions ----------
async function addFriend(id){if(id===state.me.uid)throw Error('That\'s you!');if(state.friends[id])throw Error('Already friends.');await api.write('requests/'+id+'/'+state.me.uid,{createdAt:Date.now()});toast('Friend request sent to '+person(id).name+'.')}
async function acceptFriend(id){await api.patch({['friends/'+state.me.uid+'/'+id]:true,['friends/'+id+'/'+state.me.uid]:true,['requests/'+state.me.uid+'/'+id]:null});toast('You and '+person(id).name+' are now friends.')}
async function ignoreFriend(id){await api.del('requests/'+state.me.uid+'/'+id)}
async function removeFriend(id){await api.patch({['friends/'+state.me.uid+'/'+id]:null,['friends/'+id+'/'+state.me.uid]:null})}
setProfileActions({sendDM:async(id,text)=>{if(!state.friends[id])return openDM(id);await api.send(dmPath(id),{author:state.me.uid,text});openDM(id)},openDM,addFriend,acceptFriend,removeFriend,openSettings:k=>settings(k),mutualFriends:async id=>preview?Object.keys(state.friends).filter(f=>f!==id):(await control('chatMutualFriends',{uid:id})).friends||[]});

function settings(section='Profile'){openSettings(section,{api,control,legacy,preview,resetPublic,applyBackground})}
function resetPublic(){
 const d=sheet('Clear public chat?',{cls:'nc-danger'});const input=h('input',{class:'nc-field',placeholder:'Type CLEAR PUBLIC CHAT'});
 const go=h('button',{type:'button',class:'nc-btn danger'},icon('trash'),'Clear public chat');
 d.body.append(el('p','','This permanently deletes the message history of public channels like #general. Announcements, updates, leaks, links, welcome, the owner lounge, read-only channels, reports, DMs and groups are kept.'),input,h('div',{class:'nc-row end'},go));
 go.onclick=task(async()=>{if(input.value!=='CLEAR PUBLIC CHAT')throw Error('Type CLEAR PUBLIC CHAT exactly.');if(preview){toast('Preview: nothing was deleted.');d.close();return}const r=await control('serverManage',{kind:'resetPublic',confirm:input.value});d.close();toast('Cleared '+r.cleared.length+' channel'+(r.cleared.length===1?'':'s')+'.')});
}
function leaveChat(){if(parent!==window)parent.postMessage({novaAction:'closeApp'},location.origin);else location.href='/home.html'}

// ---------- rail ----------
function railButton(node,label,fn,active){const b=h('button',{type:'button',class:'nc-rail-btn'+(active?' on':''),'aria-label':label});b.append(node,el('span','nc-tip',label));b.onclick=fn;return b}
function paintRail(){
 rail.replaceChildren();const v=state.view.type;
 const server=el('span','nc-server-icon');if(state.serverInfo.icon){const i=el('img');i.src=state.serverInfo.icon;i.alt='';server.append(i)}else{const i=el('img','nova-logo');i.src='/Nova12.png';i.alt='Nova';i.draggable=false;server.append(i)}
 rail.append(railButton(server,state.serverInfo.name||'Nova Network',()=>openChannel(lastChannel()),['channel','nitro','shop','form','inbox','voice'].includes(v)));
 const fr=el('span','nc-rail-ico');fr.append(icon('friend'));const reqs=Object.keys(state.requests||{}).length;if(reqs)fr.append(el('b','nc-badge',String(reqs)));
 rail.append(railButton(fr,'Friends',openFriends,v==='friends'));
 rail.append(el('i','nc-rail-sep'));
 rail.append(railButton(avatar(BOT_ID,'md'),'Nova Bot inbox',openBot,v==='bot'));
 const friends=Object.keys(state.friends).sort((a,b)=>Number(online(b))-Number(online(a))||(person(a).name||'').localeCompare(person(b).name||''));
 for(const id of friends.slice(0,40)){const a=avatar(id,'md');rail.append(railButton(a,person(id).name+(online(id)?' · '+(activityText(id)||'Online'):' · Offline'),()=>openDM(id),v==='dm'&&state.view.id===id))}
 for(const [gid,g]of Object.entries(state.groups||{})){const s=el('span','nc-group-ico',(g.name||'G').slice(0,2).toUpperCase());rail.append(railButton(s,g.name||'Group',()=>openGroup(gid),v==='group'&&state.view.id===gid))}
 const add=el('span','nc-rail-ico add');add.append(icon('plus'));rail.append(railButton(add,'Create a group',()=>groupBuilder({api,openGroup,preview})));
 const exit=el('span','nc-rail-ico exit');exit.append(icon('exit'));const ex=railButton(exit,'Leave chat',leaveChat);ex.classList.add('nc-rail-exit');rail.append(ex);
}
const lastChannel=()=>{try{return sessionStorage.getItem('nova_chat_channel')||'general'}catch{return 'general'}};

// ---------- channel sidebar ----------
function categories(){
 const cats=BASE.map(c=>({...c,channels:[...(c.channels||[])]}));
 const custom=Object.entries(state.serverCategories||{}).sort((a,b)=>(a[1].order||0)-(b[1].order||0)).map(([id,c])=>({id,name:c.name,channels:[]}));
 for(const [id,c]of Object.entries(state.serverChannels||{})){if(c.staffOnly&&!isStaff())continue;const target=custom.find(x=>x.id===c.category)||cats.find(x=>x.id==='community');target.channels.push([id,c.name||id,c.topic||'',c])}
 const out=[];for(const c of cats){out.push(c);if(c.id==='community')out.push(...custom)}
 return out;
}
function paintServerHead(){
 const info=state.serverInfo||{},boosts=Number(info.boosts||0);serverHead.replaceChildren();
 serverHead.classList.toggle('has-banner',!!info.banner);if(info.banner)serverHead.style.setProperty('--banner','url("'+String(info.banner).replace(/"/g,'')+'")');else serverHead.style.removeProperty('--banner');
 const goal=Math.max(14,Math.ceil((boosts+1)/7)*7);
 serverHead.append(h('div',{class:'nc-server-title'},el('b','',info.name||'Nova Network'),icon('chev')),h('div',{class:'nc-boost'},icon('nitro'),el('span','',fmt(boosts)+' Boosts'),h('i',{class:'nc-boost-bar',style:{'--p':Math.min(100,boosts/goal*100)+'%'}})));
 serverHead.onclick=e=>{const m=el('div','nc-menu');for(const [ic,label,fn,show]of [['nitro','Boost with Nitro',openNitro,true],['bag','Open the Shop',openShop,true],['inbox','Staff inbox',openStaffInbox,isStaff()],['gear','Server settings',()=>settings('Server'),isStaff()],['gear','Chat settings',()=>settings('Appearance'),true],['exit','Leave chat',leaveChat,true]]){if(!show)continue;const b=h('button',{type:'button'},icon(ic),el('span','',label));b.onclick=()=>{p.remove();fn()};m.append(b)}const p=popover(serverHead,m,{side:'right'})};
}
function paintChannels(){
 chanList.replaceChildren();const v=state.view;
 const dmMode=['dm','group','bot','friends'].includes(v.type);sidebar.classList.toggle('dm-mode',dmMode);app.classList.toggle('nc-dm',v.type==='dm'||v.type==='bot');serverHead.hidden=dmMode;
 if(dmMode){paintDMList(v);return}
 for(const c of categories()){
  if(c.staff&&!isStaff())continue;
  const key='nova_chat_cat_'+c.id,collapsed=localStorage.getItem(key)==='1';
  const head=h('button',{type:'button',class:'nc-cat'+(collapsed?' closed':'')},icon('chev'),el('span','',c.name.toUpperCase()));head.onclick=()=>{localStorage.setItem(key,collapsed?'0':'1');paintChannels()};chanList.append(head);
  if(collapsed)continue;
  for(const [id,name,topic,meta]of c.channels||[]){const locked=STAFF_POST.includes(id)||meta?.readOnly;const b=h('button',{type:'button',class:'nc-chan'+(v.type==='channel'&&v.id===id?' on':'')},icon(id==='announcements'?'megaphone':id==='ai-assistance'?'sparkle':'hash'),el('span','',name),locked?icon('lock','nc-chan-lock'):'');b.title=topic||'';b.onclick=()=>openChannel(id);chanList.append(b)}
  for(const [id,name,ic]of c.special||[]){const on=(v.type===id)||(v.type==='form'&&v.id===id);const b=h('button',{type:'button',class:'nc-chan special '+id+(on?' on':'')},icon(ic),el('span','',name));b.onclick=()=>id==='nitro'?openNitro():id==='shop'?openShop():openForm(id);chanList.append(b)}
  if(c.id==='support'&&isStaff()){const b=h('button',{type:'button',class:'nc-chan special'+(v.type==='inbox'?' on':'')},icon('inbox'),el('span','','Staff inbox'));b.onclick=openStaffInbox;chanList.append(b)}
 }
 const vc=el('div','nc-voice-nav');chanList.append(vc);try{voice?.renderSidebar(vc,true)}catch{}
}
function paintDMList(v){
 const find=h('button',{type:'button',class:'nc-dm-find'},'Find or start a conversation');find.onclick=openFriends;chanList.append(h('div',{class:'nc-dm-top'},find));
 const nav=(ic,label,fn,on,badge)=>{const b=h('button',{type:'button',class:'nc-chan nc-dm-nav'+(on?' on':'')},icon(ic),el('span','',label));if(badge)b.append(el('b','nc-pill-badge',String(badge)));b.onclick=fn;chanList.append(b)};
 nav('friend','Friends',openFriends,v.type==='friends',Object.keys(state.requests||{}).length);nav('nitro','Nitro',openNitro,false);nav('bag','Shop',openShop,false);
 const head=h('div',{class:'nc-dm-head'},el('span','','DIRECT MESSAGES'));const add=h('button',{type:'button',class:'nc-icon-btn sm','aria-label':'Create a group',title:'Create a group'},icon('plus'));add.onclick=()=>groupBuilder({api,openGroup,preview});head.append(add);chanList.append(head);
 const row=(node,name,sub,fn,on)=>{const b=h('button',{type:'button',class:'nc-dm-row'+(on?' on':'')},node,h('span',{class:'nc-dm-copy'},name,sub?el('small','',sub):''));b.onclick=fn;chanList.append(b);return b};
 row(avatar(BOT_ID,'md'),h('span',{class:'nc-dm-name'},el('b','','Nova Bot'),botTag()),'Gifts, trades and replies',openBot,v.type==='bot');
 for(const [gid,g]of Object.entries(state.groups||{})){const ic=el('span','nc-group-ico sm',(g.name||'G').slice(0,2).toUpperCase());row(ic,el('b','',g.name||'Group'),Object.keys(g.members||{}).length+' Members',()=>openGroup(gid),v.type==='group'&&v.id===gid)}
 const friends=Object.keys(state.friends||{}).sort((a,b)=>(online(b)-online(a))||String(person(a).name).localeCompare(person(b).name));
 for(const id of friends){const r=row(avatar(id,'md'),nameNode(id,'b'),online(id)?activityText(id)||'':'',()=>openDM(id),v.type==='dm'&&v.id===id);if(!online(id))r.classList.add('off')}
 if(!friends.length)chanList.append(el('p','nc-dm-empty','Add friends to start chatting.'));
}
function paintUserPanel(){
 const me=state.me.uid,p=person(me);userPanel.replaceChildren();
 const plate=asset(p.chatBanner);userPanel.style.setProperty('--plate',p.banner&&/^(https:|data:image)/.test(p.banner)?'url("'+p.banner.replace(/"/g,'')+'")':plate?'url("'+plate.src+'")':'none');
 const who=h('button',{type:'button',class:'nc-me'},avatar(me,'md'),h('span',{class:'nc-me-copy'},nameNode(me,'b'),el('small','',({online:'Online',dnd:'Do not disturb',offline:'Invisible',idle:'Idle'})[p.status==='offline'?'offline':statusOf(me)]||'Online')));
 who.onclick=()=>showMiniProfile(me,who);
 const status=h('button',{type:'button',class:'nc-icon-btn','aria-label':'Set status',title:'Set status'},icon('dots'));
 status.onclick=()=>{const m=el('div','nc-menu');for(const [v,l,c]of [['online','Online','online'],['dnd','Do not disturb','dnd'],['offline','Invisible','offline']]){const b=h('button',{type:'button'},el('i','na-dot '+c),el('span','',l));b.onclick=task(async()=>{pp.remove();if(preview)await api.patch({['profiles/'+me+'/status']:v});else await control('profileUpdate',{status:v});state.profiles[me]={...person(me),status:v};paintUserPanel()});m.append(b)}const pp=popover(status,m,{side:'top'})};
 const gear=h('button',{type:'button',class:'nc-icon-btn','aria-label':'Settings',title:'Settings'},icon('gear'));gear.onclick=()=>settings();
 userPanel.append(who,h('div',{class:'nc-me-actions'},status,gear));
}

// ---------- members ----------
let membersFrame=0;
function paintMembers(){cancelAnimationFrame(membersFrame);membersFrame=requestAnimationFrame(paintMembersNow)}
function memberRow(id){const r=h('button',{type:'button',class:'nc-member'+(online(id)?'':' off')});const plate=asset(person(id).chatBanner);if(plate&&online(id))r.style.setProperty('--plate','url("'+plate.src+'")'),r.classList.add('plated');r.append(avatar(id,'sm'),h('span',{class:'nc-member-copy'},h('span',{class:'nc-member-name'},nameNode(id,'span'),isBot(id)?botTag():''),el('small','',activityText(id))));r.onclick=()=>showMiniProfile(id,r);return r}
function paintMembersNow(){
 const v=state.view;members.replaceChildren();
 if(document.body.classList.contains('nc-hide-members')&&v.type==='channel'){members.hidden=true;return}
 if(v.type==='dm'){members.hidden=false;members.classList.add('dm');members.append(dmPanel(v.id));return}
 members.classList.remove('dm');
 if(v.type==='group'){members.hidden=false;const g=state.groups[v.id]||{};members.append(el('h6','nc-mhead','MEMBERS — '+Object.keys(g.members||{}).length));for(const id of Object.keys(g.members||{}))members.append(memberRow(id));return}
 if(!['channel','nitro','shop','form','inbox'].includes(v.type)){members.hidden=true;return}
 members.hidden=false;
 const ids=Object.keys(state.profiles).filter(id=>!state.bans?.[id]);
 const staffRank=id=>({owner:0,admin:1,moderator:2})[role(id)]??(state.staffAccess?.[id]?.moderator?2:9);
 const groups=[['Owner',ids.filter(id=>staffRank(id)===0)],['Admins',ids.filter(id=>staffRank(id)===1)],['Moderators',ids.filter(id=>staffRank(id)===2)]];
 const rest=ids.filter(id=>staffRank(id)===9);
 const on=rest.filter(online).sort((a,b)=>(person(a).name||'').localeCompare(person(b).name||'')),off=rest.filter(id=>!online(id)).sort((a,b)=>(person(a).name||'').localeCompare(person(b).name||''));
 const section=(title,list,cls='')=>{if(!list.length)return;members.append(el('h6','nc-mhead '+cls,title.toUpperCase()+' — '+list.length));const frag=document.createDocumentFragment();for(const id of list)frag.append(memberRow(id));members.append(frag)};
 for(const [t,list]of groups)section(t,list.sort((a,b)=>Number(online(b))-Number(online(a))),'staff');
 section('Online',on);section('Bots',Object.keys({[BOT_ID]:1}));
 const shown=off.slice(0,offlineShown);section('Offline',shown,'offline');
 if(off.length>offlineShown){const more=h('button',{type:'button',class:'nc-more'},'Show '+Math.min(80,off.length-offlineShown)+' more');more.onclick=()=>{offlineShown+=80;paintMembers()};members.append(more)}
}
let offlineShown=60;

// ---------- top bar ----------
function topbarFor(){
 const v=state.view;topbar.replaceChildren();
 const menu=h('button',{type:'button',class:'nc-icon-btn nc-mobile-menu','aria-label':'Open menu'},icon('dots'));menu.onclick=()=>app.classList.toggle('drawer');
 let title;
 if(v.type==='channel'){const meta=findChannel(v.id);title=h('div',{class:'nc-title'},icon(v.id==='announcements'?'megaphone':v.id==='ai-assistance'?'sparkle':'hash'),el('b','',meta?.name||v.id),meta?.topic?el('span','nc-topic',meta.topic):'')}
 else if(v.type==='dm'){title=h('div',{class:'nc-title'},avatar(v.id,'sm'),nameNode(v.id,'b'),el('span','nc-topic',activityText(v.id)||({online:'Online',idle:'Idle',dnd:'Do not disturb',offline:'Offline'})[statusOf(v.id)]))}
 else if(v.type==='group'){const g=state.groups[v.id]||{};title=h('div',{class:'nc-title'},icon('group'),el('b','',g.name||'Group'),el('span','nc-topic',Object.keys(g.members||{}).length+' members'))}
 else if(v.type==='bot')title=h('div',{class:'nc-title'},avatar(BOT_ID,'sm'),el('b','','Nova Bot'),botTag(),el('span','nc-topic','Your notifications, gifts and trades'));
 else{const map={friends:['friend','Friends'],nitro:['nitro','Nitro'],shop:['bag','Shop'],inbox:['inbox','Staff inbox'],voice:['wave','Voice'],form:['flag',v.id==='report'?'Reports':'Suggestions']};const [ic,t]=map[v.type]||['hash',''];title=h('div',{class:'nc-title'},icon(ic),el('b','',t));if(['nitro','shop'].includes(v.type)){const back=h('button',{type:'button',class:'nc-back','aria-label':'Back to chat'},icon('chev'),el('span','','Chat'));back.onclick=()=>openChannel(lastChannel());title.prepend(back)}}
 const tools=el('div','nc-tools');
 if(['channel','dm','group','bot'].includes(v.type)){const find=h('input',{type:'search',class:'nc-find',placeholder:'Search messages','aria-label':'Search messages in this conversation'});find.oninput=()=>{const q=find.value.trim().toLowerCase();content.querySelectorAll('.nm-row').forEach(r=>r.classList.toggle('nm-dim',!!q&&!r.textContent.toLowerCase().includes(q)))};tools.append(h('label',{class:'nc-findbox'},icon('search'),find))}
 if(v.type==='channel'){const t=h('button',{type:'button',class:'nc-icon-btn','aria-label':'Show members',title:'Members'},icon('users'));t.classList.toggle('on',!document.body.classList.contains('nc-hide-members'));t.onclick=()=>{document.body.classList.toggle('nc-hide-members');localStorage.setItem('nova_chat_members',document.body.classList.contains('nc-hide-members')?'hidden':'shown');topbarFor();paintMembers()};tools.append(t)}
 const leave=h('button',{type:'button',class:'nc-leave',title:'Leave chat'},icon('exit'),el('span','','Leave'));leave.onclick=leaveChat;tools.append(leave);
 topbar.append(menu,title,tools);
}
function findChannel(id){for(const c of categories())for(const [cid,name,topic]of c.channels||[])if(cid===id)return {name,topic};return null}

// ---------- conversations ----------
function renderConversation(){
 const v=state.view;topbarFor();app.classList.remove('drawer');
 let path,locked=false,lockedText='',placeholder='Message',welcome;
 if(v.type==='channel'){
  try{sessionStorage.setItem('nova_chat_channel',v.id)}catch{}
  path='channels/'+v.id+'/messages';const meta=findChannel(v.id)||{name:v.id};const custom=state.serverChannels?.[v.id];
  locked=(STAFF_POST.includes(v.id)||v.id==='owner-lounge'&&!isStaff()||custom?.readOnly)&&!isStaff();lockedText='Only the Nova team can post in #'+meta.name+'.';placeholder='Message #'+meta.name;
  welcome=()=>h('div',{class:'nc-welcome'},h('span',{class:'nc-welcome-ico'},icon(v.id==='announcements'?'megaphone':'hash')),el('h2','','Welcome to #'+meta.name),el('p','',meta.topic||'This is the start of #'+meta.name+'.'));
 }else if(v.type==='dm'){path=dmPath(v.id);placeholder='Message @'+person(v.id).name;welcome=()=>h('div',{class:'nc-welcome dm'},avatar(v.id,'xl'),nameNode(v.id,'h2'),el('p','','This is the beginning of your messages with '+person(v.id).name+'.'))}
 else if(v.type==='group'){path='groupMessages/'+v.id;placeholder='Message '+(state.groups[v.id]?.name||'the group');welcome=()=>h('div',{class:'nc-welcome'},h('span',{class:'nc-welcome-ico'},icon('group')),el('h2','',state.groups[v.id]?.name||'Group'),el('p','','Say hi to the group!'))}
 else if(v.type==='bot'){path='botMessages/'+state.me.uid;locked=true;lockedText='Nova Bot sends you updates here. Replies are not needed.';welcome=()=>h('div',{class:'nc-welcome'},avatar(BOT_ID,'xl'),el('h2','','Nova Bot'),el('p','','Gifts, trades and Nova updates show up here.'))}
 const box=el('div','nc-convo');content.append(box);
 const list=createMessageList({host:box,api,path,canModerate:isStaff()&&v.type==='channel',welcome,onReply:(id,m)=>composer.startReply(id,m),onEdit:(id,m)=>composer.startEdit(id,m)});
 const send=async payload=>{
  if(v.type==='channel'&&v.id==='ai-assistance'){if(preview){await api.send(path,{author:state.me.uid,...payload});await api.send(path,{author:BOT_ID,text:'Nova AI preview · live replies use Nova\'s AI provider.'})}else await control('chatAIMessage',{...payload,requestId:crypto.randomUUID()});return}
  await api.send(path,{author:state.me.uid,...payload},{slowMode:state.serverChannels?.[v.id]?.slowMode||0});
 };
 const composer=createComposer({host:box,api,path,placeholder,locked,lockedText,list,send,ctx:{api,preview,openDM,addFriend,openProfile:openFullProfile,clearView:()=>box.querySelector('.nm-list')?.replaceChildren(),resetPublic,legacy}});
 current={stop(){list.stop();composer.stop()}};
 composer.focus();
}

// ---------- support forms & staff inbox ----------
function supportForm(kind){
 const page=el('div','nc-page nc-form-page');content.append(page);
 const subject=h('input',{class:'nc-field',maxlength:'120',placeholder:kind==='report'?'What happened?':'Your idea in a few words'}),text=h('textarea',{class:'nc-field',rows:'6',maxlength:'2000',placeholder:kind==='report'?'Tell the Nova team what happened. Include usernames and links if you can.':'Describe your suggestion.'});
 const sendBtn=h('button',{type:'button',class:'nc-btn primary'},icon('send'),kind==='report'?'Send report':'Send suggestion');
 sendBtn.onclick=task(async()=>{if(!subject.value.trim()||!text.value.trim())throw Error('Fill in both boxes.');await api.send('feedback/'+state.me.uid,{author:state.me.uid,text:text.value.trim(),subject:subject.value.trim(),kind});subject.value=text.value='';toast('Sent to the Nova team. You\'ll see replies below.')});
 page.append(h('div',{class:'nc-form-hero'},icon(kind==='report'?'flag':'sparkle'),el('h1','',kind==='report'?'Report a problem':'Suggest something'),el('p','',kind==='report'?'Reports go privately to the Nova team.':'Help shape what Nova adds next.')),el('label','nc-label','Subject'),subject,el('label','nc-label','Details'),text,h('div',{class:'nc-row end'},sendBtn));
 const mine=el('div','nc-tickets');page.append(el('h3','nc-sub','Your tickets'),mine);
 const stop=api.watch('feedback/'+state.me.uid,all=>{mine.replaceChildren();const items=Object.entries(all||{}).filter(([,t])=>!t.kind||t.kind===kind).sort((a,b)=>b[1].createdAt-a[1].createdAt);if(!items.length)mine.append(el('p','ns-muted','Nothing sent yet.'));for(const [id,t]of items.slice(0,20)){const card=h('details',{class:'nc-ticket'},h('summary',{},el('b','',t.subject||'Ticket'),el('small','',new Date(t.createdAt).toLocaleString())),el('p','',t.text));const replies=el('div','nc-replies');card.append(replies);card.addEventListener('toggle',()=>{if(!card.open)return;api.read('feedbackReplies/'+state.me.uid+'/'+id).then(r=>{replies.replaceChildren();for(const m of Object.values(r||{}).sort((a,b)=>a.createdAt-b.createdAt))replies.append(h('div',{class:'nc-reply'},nameNode(m.author,'b'),el('p','',m.text)));if(!replies.children.length)replies.append(el('small','ns-muted','No replies yet.'))}).catch(()=>{})},{once:true});mine.append(card)}},()=>{});
 current={stop}
}
function staffInbox(){
 const page=el('div','nc-page nc-inbox');content.append(page);page.append(el('h1','','Staff inbox'));const listBox=el('div','nc-tickets');page.append(listBox);
 const stop=api.watch('feedback',all=>{listBox.replaceChildren();const items=[];for(const [uid,t]of Object.entries(all||{}))for(const [id,m]of Object.entries(t||{}))items.push([uid,id,m]);items.sort((a,b)=>b[2].createdAt-a[2].createdAt);
  if(!items.length)listBox.append(el('p','ns-muted','No tickets.'));
  for(const [uid,id,m]of items.slice(0,80)){const card=h('details',{class:'nc-ticket'},h('summary',{},avatar(uid,'xs',{dot:false}),nameNode(uid,'b'),el('span','nc-pill',m.kind||'report'),el('b','',m.subject||''),el('small','',new Date(m.createdAt).toLocaleString())),el('p','',m.text));
   const reply=h('input',{class:'nc-field',placeholder:'Reply to '+person(uid).name}),send=h('button',{type:'button',class:'nc-btn primary sm'},'Reply');send.onclick=task(async()=>{if(!reply.value.trim())return;await api.send('feedbackReplies/'+uid+'/'+id,{author:state.me.uid,text:reply.value.trim()});reply.value='';toast('Reply sent.')});
   card.append(h('div',{class:'nc-row'},reply,send));listBox.append(card)}},e=>listBox.replaceChildren(el('p','ns-muted','Inbox unavailable: '+e.message)));
 current={stop};
}

// ---------- boot ----------
function watchKey(path,key,onChange){return new Promise((resolve,reject)=>{let first=true;stops.push(api.watch(path,v=>{state[key]=v||{};if(first){first=false;resolve()}else onChange?.(key)},e=>{if(first)reject(e);else fail(e)}))})}
const stops=[];
// Presence changes constantly (song positions, heartbeats). Only rebuild when something people can see changed.
const presenceSig=()=>{let out='';for(const [id,p]of Object.entries(state.presence||{}))out+=id+(online(id)?'1':'0')+(p?.status||'')+(p?.activity||'')+'|'+(p?.music?.name||'')+';';return out};
let repaintTimer=0,repaintDue=0,lastPresence='';const repaint=key=>{
 if(key==='presence'){const sig=presenceSig();if(sig===lastPresence&&!repaintDue)return;lastPresence=sig}
 if(repaintTimer)return;repaintDue=1;
 repaintTimer=setTimeout(()=>{repaintTimer=0;repaintDue=0;if(document.hidden){addEventListener('visibilitychange',()=>repaint(),{once:true});return}lastPresence=presenceSig();paintRail();paintChannels();paintMembers();paintUserPanel();if(state.view.type==='friends')friendsRef?.repaint();if(['dm','bot'].includes(state.view.type))topbarFor()},350)};
async function boot(){
 applyPreferences();
 document.body.classList.toggle('nc-compact',localStorage.getItem('nova_chat_compact')==='true');
 document.body.classList.toggle('nc-hide-members',localStorage.getItem('nova_chat_members')==='hidden');
 document.documentElement.style.setProperty('--nc-font',(localStorage.getItem('nova_chat_font')||'15')+'px');
 loader.step('Connecting to Nova…',.08);
 api=await import(preview?'../chat-v2-preview.js?v=nchat2':'../chat-v2-service.js?v=20261027-chat345');
 state.me=await api.login();
 loader.step('Syncing your profile…',.22);
 if(preview){const old=await api.read('profiles/'+state.me.uid)||{};await api.patch({['profiles/'+state.me.uid+'/name']:old.name||state.me.name,['profiles/'+state.me.uid+'/joined']:old.joined||Date.now()})}else await control('syncChatProfile').catch(()=>{});
 loader.step('Loading cosmetics…',.36);
 state.assets=await fetch('/profile-assets/catalog.json').then(r=>r.json()).catch(()=>[]);
 loader.step('Finding your friends…',.52);
 await Promise.all([['profiles','profiles'],['friends/'+state.me.uid,'friends'],['requests/'+state.me.uid,'requests'],['presence','presence'],['roles','roles']].map(([p,k])=>watchKey(p,k,repaint)));
 loader.step('Opening the server…',.74);
 for(const key of ['customRoles','memberRoles','staffAccess','serverCategories','serverChannels','server'])stops.push(api.watch(key,v=>{state[key==='server'?'serverInfo':key]=v||{};repaint()},()=>{}));
 stops.push(api.watchGroups(state.me.uid,v=>{state.groups=v||{};repaint()},()=>{}));
 if(isStaff())stops.push(api.watch('bans',v=>{state.bans=v||{}},()=>{}));
 stops.push(await api.presence(state.me.uid));
 try{stops.push(startNotifications(api,state.me.uid,person,id=>!document.hidden&&state.view.type==='dm'&&state.view.id===id))}catch{}
 loader.step('Joining voice…',.88);
 try{voice=mountVoice({state:new Proxy(state,{get:(t,k)=>k==='page'?(t.view.type==='voice'?'voice':t.view.type):k==='peer'?(t.view.type==='dm'?t.view.id:null):t[k]}),person,toast,preview,enter:()=>{stopCurrent();state.view={type:'voice'};main.classList.add('nova-voice-view');topbarFor();paintRail();paintChannels();paintMembers()},...(preview?{request:async b=>b.action==='lobby'?{rooms:{'server-vc-1':{members:{demo1:{name:'Nova Player',picture:'',muted:false}},capacity:6},'server-vc-2':{members:{},capacity:6}}}:{invites:[]}}:{})})}catch(e){console.warn('Voice unavailable',e)}
 applyBackground();
 paintServerHead();paintUserPanel();paintRail();
 const want=new URLSearchParams(location.search).get('dm')||sessionStorage.getItem('nova-notification-dm');sessionStorage.removeItem('nova-notification-dm');
 const tab=sessionStorage.getItem('nova-os-chat-tab');sessionStorage.removeItem('nova-os-chat-tab');
 app.hidden=false;
 if(want===BOT_ID)openBot();else if(want&&state.friends[want])openDM(want);else if(tab==='nitro')openNitro();else if(tab==='shop')openShop();else openChannel(lastChannel());
 await loader.done();
}
addEventListener('nova-chat-profile-updated',repaint);
addEventListener('storage',e=>{if(/^nova_(wallpaper|grad)/.test(e.key||''))applyBackground()});
const watchdog=setTimeout(()=>loader.step('Still connecting… check your internet.'),15000);
boot().catch(e=>{console.error(e);loader.error(/permission|denied/i.test((e.code||'')+' '+(e.message||''))?'Firebase blocked Chat. The owner needs to publish the latest firebase-voice.rules.json.':e.message||'Chat could not start.')}).finally(()=>clearTimeout(watchdog));
