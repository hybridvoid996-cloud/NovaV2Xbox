// Friends hub: search everyone, who's online on Nova now, your friends, requests, and groups.
import {state,el,h,icon,avatar,nameNode,person,online,activityText,statusOf,isBot,sheet,task,toast,fail} from './core.mjs';
import {showMiniProfile} from './profile.mjs';

export function friendsView(host,{api,control,openDM,openGroup,addFriend,acceptFriend,ignoreFriend,preview}){
 host.replaceChildren();
 const view=el('section','nf-hub');
 const hero=el('div','nf-hero');hero.append(h('div',{class:'nf-hero-copy'},el('small','','FRIENDS'),el('h1','','Find your people on Nova'),el('p','','Search any Nova player, see who\'s online right now, and start a group chat.')));
 const search=h('input',{class:'nf-search',type:'search',placeholder:'Search every Nova player by name…','aria-label':'Search Nova players'});
 const sbox=h('label',{class:'nf-searchbox'},icon('search'),search);hero.append(sbox);
 const tabs=el('div','nf-tabs'),panel=el('div','nf-panel');
 const reqCount=Object.keys(state.requests||{}).length;
 const tabDefs=[['online','Online now'],['friends','Your friends'],['pending','Requests'+(reqCount?' · '+reqCount:'')],['groups','Groups']];
 let tab='online',directory=[...Object.keys(state.profiles)],after=undefined,loading=false;
 const createGroup=h('button',{type:'button',class:'nc-btn primary nf-create'},icon('group'),'Create group');createGroup.onclick=()=>groupBuilder({api,openGroup,preview});
 for(const [k,label]of tabDefs){const b=h('button',{type:'button',class:'nf-tab','data-k':k},label);b.onclick=()=>{tab=k;paint()};tabs.append(b)}
 tabs.append(createGroup);
 view.append(hero,tabs,panel);host.append(view);

 function personRow(id,{showAdd=true}={}){
  const r=el('div','nf-row'+(online(id)?' on':''));const a=avatar(id,'md');a.tabIndex=0;a.onclick=()=>showMiniProfile(id,a);
  const copy=h('div',{class:'nf-row-copy'},nameNode(id,'b'),el('small','',activityText(id)||({online:'Online',idle:'Idle',dnd:'Do not disturb',offline:'Offline'})[statusOf(id)]));
  const act=el('div','nf-row-act');
  if(state.friends[id]){const b=h('button',{type:'button',class:'nc-icon-btn','aria-label':'Message '+person(id).name,title:'Message'},icon('chat'));b.onclick=()=>openDM(id);act.append(b)}
  else if(state.requests[id]){const ok=h('button',{type:'button',class:'nc-btn primary sm'},'Accept');ok.onclick=task(async()=>{await acceptFriend(id);paint()});const no=h('button',{type:'button',class:'nc-btn ghost sm'},'Ignore');no.onclick=task(async()=>{await ignoreFriend(id);paint()});act.append(ok,no)}
  else if(showAdd&&id!==state.me.uid&&!isBot(id)){const b=h('button',{type:'button',class:'nc-btn ghost sm'},icon('friend'),'Add');b.onclick=task(async()=>{await addFriend(id);b.disabled=true;b.lastChild.textContent='Sent'});act.append(b)}
  r.append(a,copy,act);return r;
 }
 async function loadMore(){if(loading||after===null||preview)return;loading=true;try{const d=await control('chatDirectory',after?{after}:{});for(const u of d.users||[]){if(!state.profiles[u.uid])state.profiles[u.uid]={name:u.name,photo:u.photo};if(!directory.includes(u.uid))directory.push(u.uid)}after=d.next||null}catch(e){after=null}finally{loading=false}}
 async function paint(){
  tabs.querySelectorAll('.nf-tab').forEach(b=>b.classList.toggle('on',b.dataset.k===tab&&!search.value.trim()));
  const q=search.value.trim().toLowerCase();panel.replaceChildren();
  if(q){
   let found=directory.filter(id=>id!==state.me.uid&&(person(id).name||'').toLowerCase().includes(q));
   for(let i=0;found.length<12&&after!==null&&i<20&&!preview;i++){await loadMore();found=directory.filter(id=>id!==state.me.uid&&(person(id).name||'').toLowerCase().includes(q))}
   if(q!==search.value.trim().toLowerCase())return;
   found.sort((a,b)=>Number(online(b))-Number(online(a)));
   panel.append(el('h6','nf-h','RESULTS · '+found.length));for(const id of found.slice(0,60))panel.append(personRow(id));
   if(!found.length)panel.append(empty('No Nova players match “'+search.value.trim()+'”.'));return;
  }
  if(tab==='online'){const ids=Object.keys(state.presence).filter(id=>id!==state.me.uid&&online(id)&&state.profiles[id]);ids.sort((a,b)=>Number(!!state.friends[b])-Number(!!state.friends[a]));panel.append(el('h6','nf-h','ONLINE ON NOVA NOW · '+ids.length));const grid=el('div','nf-grid');for(const id of ids.slice(0,90))grid.append(personRow(id));panel.append(grid);if(!ids.length)panel.append(empty('Nobody else is online right now.'))}
  if(tab==='friends'){const ids=Object.keys(state.friends).sort((a,b)=>Number(online(b))-Number(online(a)));panel.append(el('h6','nf-h','ALL FRIENDS · '+ids.length));for(const id of ids)panel.append(personRow(id));if(!ids.length)panel.append(empty('Search for players above and send a friend request.'))}
  if(tab==='pending'){const ids=Object.keys(state.requests||{});panel.append(el('h6','nf-h','INCOMING · '+ids.length));for(const id of ids)panel.append(personRow(id));if(!ids.length)panel.append(empty('No friend requests right now.'))}
  if(tab==='groups'){const ids=Object.keys(state.groups||{});panel.append(el('h6','nf-h','YOUR GROUPS · '+ids.length));for(const gid of ids){const g=state.groups[gid],members=Object.keys(g.members||{});const r=el('button','nf-row nf-group');r.type='button';const stack=el('span','nf-stack');for(const m of members.slice(0,3))stack.append(avatar(m,'sm',{dot:false}));r.append(stack,h('div',{class:'nf-row-copy'},el('b','',g.name||'Group'),el('small','',members.length+' members')),icon('chev'));r.onclick=()=>openGroup(gid);panel.append(r)}if(!ids.length)panel.append(empty('Create a group to chat with several friends at once.'))}
 }
 const empty=t=>h('div',{class:'nf-empty'},icon('users'),el('p','',t));
 let timer;search.oninput=()=>{clearTimeout(timer);timer=setTimeout(paint,180)};
 paint();return {repaint:()=>paint()};
}

export function groupBuilder({api,openGroup,preview}){
 const d=sheet('Create a group',{cls:'nf-builder'});const name=h('input',{class:'nc-field',maxlength:'40',placeholder:'Group name'});const chosen=new Set();
 const list=el('div','nf-pick'),filter=h('input',{class:'nc-field',type:'search',placeholder:'Search friends'});
 const paint=()=>{list.replaceChildren();const q=filter.value.toLowerCase();for(const id of Object.keys(state.friends).filter(id=>(person(id).name||'').toLowerCase().includes(q))){const b=h('button',{type:'button',class:'nf-pick-row'+(chosen.has(id)?' on':'')},avatar(id,'sm'),nameNode(id,'span'),el('i','nf-check'));b.onclick=()=>{chosen.has(id)?chosen.delete(id):chosen.add(id);paint()};list.append(b)}if(!list.children.length)list.append(el('p','nf-empty-sm','Add friends first to make a group.'))};
 filter.oninput=paint;paint();
 const go=h('button',{type:'button',class:'nc-btn primary'},icon('group'),'Create group');
 go.onclick=task(async()=>{if(!chosen.size)throw Error('Pick at least one friend.');const n=name.value.trim()||[state.me.uid,...chosen].map(id=>person(id).name).slice(0,3).join(', ');const id=await api.createGroup(state.me.uid,n.slice(0,40),[...chosen]);d.close();toast('Group created.');openGroup(id)});
 d.body.append(el('label','nc-label','Name'),name,el('label','nc-label','Friends'),filter,list,h('div',{class:'nc-row end'},go));name.focus();
}
