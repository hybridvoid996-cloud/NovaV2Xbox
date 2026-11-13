// Settings: same options as before in a new full-screen layout.
import {state,el,h,icon,avatar,nameNode,person,isStaff,isOwner,task,toast,fail} from './core.mjs';
import {profileCard} from './profile.mjs';
import {preferenceSection} from '../chat-preferences.js?v=20261029-motion372';
import {cosmeticsSettings,showNitro} from '../chat-store.js?v=20261029-shop387';
import {nitroProfileControls} from '../chat-identity.mjs?v=20261029-errors392';
import {serverManager} from '../chat-server.js?v=20261029-chat387';

const SECTIONS=[
 ['Profile','My profile','users'],['Cosmetics','Cosmetics','sparkle'],['Nitro','Nitro','nitro'],['Account','Account','lock'],
 ['Appearance','Appearance','image'],['Notifications','Notifications','bell'],['Privacy','Privacy','shield'],
 ['Server','Server','gear','staff'],['Owner','Owner tools','crown','owner']
];
export function openSettings(start='Profile',{api,control,legacy,preview,resetPublic,applyBackground}){
 document.querySelector('.ns-shell')?.remove();
 const shell=el('div','ns-shell'),side=el('aside','ns-side'),main=el('main','ns-main'),close=h('button',{type:'button',class:'ns-close','aria-label':'Close settings'},icon('x'),el('small','','ESC'));
 const me=h('div',{class:'ns-me'},avatar(state.me.uid,'md'),h('div',{},nameNode(state.me.uid,'b'),el('small','','Edit profile')));me.onclick=()=>show('Profile');
 const find=h('input',{class:'ns-find',type:'search',placeholder:'Search settings'});
 const nav=el('nav','ns-nav');side.append(me,find,nav);
 for(const [key,label,ic,need]of SECTIONS){if(need==='staff'&&!isStaff())continue;if(need==='owner'&&!isOwner())continue;const b=h('button',{type:'button','data-k':key},icon(ic),el('span','',label));b.onclick=()=>show(key);nav.append(b)}
 find.oninput=()=>nav.querySelectorAll('button').forEach(b=>b.hidden=!b.textContent.toLowerCase().includes(find.value.toLowerCase()));
 shell.append(side,main,close);document.body.append(shell);requestAnimationFrame(()=>shell.classList.add('in'));
 const exit=()=>{shell.classList.remove('in');setTimeout(()=>shell.remove(),220);removeEventListener('keydown',esc)};
 const esc=e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]'))exit()};addEventListener('keydown',esc);close.onclick=exit;

 function show(key){
  nav.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===key));
  const body=el('div','ns-body');main.replaceChildren(body);body.append(el('h1','ns-title',SECTIONS.find(s=>s[0]===key)?.[1]||key));
  try{render(key,body)}catch(e){fail(e)}
 }
 function render(key,body){
  const ctx=legacy();
  if(key==='Profile'){
   const p=person(state.me.uid),fields={};const grid=el('div','ns-profile'),form=el('form','ns-form'),previewBox=el('div','ns-preview');grid.append(form,previewBox);body.append(grid);
   const draft=()=>({...Object.fromEntries(Object.entries(fields).map(([k,n])=>[k,n.value.trim()])),status:status.value,novaTag:tag.checked});
   const paint=()=>{previewBox.replaceChildren(el('small','ns-cap','LIVE PREVIEW'),profileCard(state.me.uid,{draft:draft()}))};
   for(const [k,label,value,area]of [['name','Display name',p.accountName||p.name],['bio','About me',p.bio||'',true],['photo','Profile picture (image or GIF link)',p.photo||''],['banner','Banner (image or GIF link)',p.banner||'']]){const i=h(area?'textarea':'input',{class:'nc-field',maxlength:area?'240':k==='name'?'24':'2048'});i.value=value||'';i.oninput=paint;fields[k]=i;form.append(el('label','nc-label',label),i)}
   for(const k of ['photo','banner']){const f=h('input',{type:'file',accept:'image/png,image/jpeg,image/webp,image/gif',class:'ns-file'});f.onchange=()=>{const file=f.files[0];if(!file)return;if(file.size>70000){toast('Files over 70 KB need an image link instead.');return}const r=new FileReader();r.onload=()=>{fields[k].value=r.result;paint()};r.readAsDataURL(file)};form.append(h('label',{class:'ns-upload'},icon('image'),el('span','','Upload '+(k==='photo'?'picture':'banner')),f))}
   const status=h('select',{class:'nc-field'});for(const [v,l]of [['online','Online'],['dnd','Do not disturb'],['offline','Invisible']])status.append(h('option',{value:v},l));status.value=p.status||'online';status.onchange=paint;
   const tag=h('input',{type:'checkbox'});tag.checked=!!p.novaTag;tag.onchange=paint;
   form.append(el('label','nc-label','Status'),status,h('label',{class:'ns-check'},tag,el('span','','Show the animated NOVA tag')));
   const save=h('button',{type:'submit',class:'nc-btn primary'},icon('check'),'Save profile');form.append(save);
   form.onsubmit=task(async e=>{e.preventDefault();const changes=draft();if(changes.name.length<2)throw Error('Use at least two characters.');save.disabled=true;try{if(preview)await api.patch(Object.fromEntries(Object.entries(changes).map(([k,v])=>['profiles/'+state.me.uid+'/'+k,v])));else await control('profileUpdate',changes);state.profiles[state.me.uid]={...person(state.me.uid),...changes};dispatchEvent(new Event('nova-chat-profile-updated'));toast('Profile saved.')}finally{save.disabled=false}});
   paint();const extra=el('div','ns-legacy');body.append(extra);try{nitroProfileControls(extra,ctx)}catch{}
  }
  else if(key==='Cosmetics'){const host=el('div','ns-legacy');body.append(host);cosmeticsSettings(host,ctx)}
  else if(key==='Nitro'){const host=el('div','ns-legacy ns-nitro');body.append(host);showNitro(host,ctx)}
  else if(key==='Account'){
   for(const [title,value]of [['Username',person(state.me.uid).accountName||person(state.me.uid).name||state.me.name||''],['Email',state.me.email||'']]){const i=h('input',{class:'nc-field',readonly:true});i.value=value;const c=h('button',{type:'button',class:'nc-btn ghost sm'},'Copy');c.onclick=task(async()=>{await navigator.clipboard.writeText(value);toast(title+' copied.')});body.append(el('label','nc-label',title),h('div',{class:'nc-row'},i,c))}
   const reset=h('button',{type:'button',class:'nc-btn ghost'},icon('inbox'),'Email me a password reset');reset.onclick=task(async()=>{await api.resetPassword();toast('Reset email sent. Check your inbox and spam.')});
   const pw=h('input',{class:'nc-field',type:'password',autocomplete:'new-password',placeholder:'New password (8+ characters)'}),pw2=h('input',{class:'nc-field',type:'password',autocomplete:'new-password',placeholder:'Confirm new password'});
   const set=h('button',{type:'button',class:'nc-btn primary'},'Change password');set.onclick=task(async()=>{if(pw.value.length<8)throw Error('Use at least 8 characters.');if(pw.value!==pw2.value)throw Error('Passwords do not match.');try{await api.changePassword(pw.value)}catch(e){throw Error(e.code==='auth/requires-recent-login'?'Sign in again, then retry.':e.message)}pw.value=pw2.value='';toast('Password updated.')});
   body.append(el('h3','ns-sub','Password'),el('p','ns-muted','Nova never stores a readable copy of your password.'),reset,pw,pw2,set);
  }
  else if(key==='Appearance'){
   const bg=h('input',{type:'checkbox'});bg.checked=localStorage.getItem('nova_chat_bg')!=='off';const blur=h('input',{type:'range',min:'0',max:'40',value:localStorage.getItem('nova_chat_bg_blur')||'22'});
   bg.onchange=()=>{localStorage.setItem('nova_chat_bg',bg.checked?'on':'off');applyBackground()};blur.oninput=()=>{localStorage.setItem('nova_chat_bg_blur',blur.value);applyBackground()};
   const compact=h('input',{type:'checkbox'});compact.checked=localStorage.getItem('nova_chat_compact')==='true';compact.onchange=()=>{localStorage.setItem('nova_chat_compact',String(compact.checked));document.body.classList.toggle('nc-compact',compact.checked)};
   const size=h('input',{type:'range',min:'12',max:'20',value:localStorage.getItem('nova_chat_font')||'15'});size.oninput=()=>{localStorage.setItem('nova_chat_font',size.value);document.documentElement.style.setProperty('--nc-font',size.value+'px')};
   body.append(h('div',{class:'ns-card'},h('label',{class:'ns-check'},bg,el('span','','Use my Nova wallpaper as the chat background')),el('label','nc-label','Background blur'),blur),h('div',{class:'ns-card'},h('label',{class:'ns-check'},compact,el('span','','Compact messages')),el('label','nc-label','Message text size'),size));
   const legacyHost=el('div','ns-legacy');body.append(legacyHost);preferenceSection(legacyHost,'Appearance');
  }
  else if(key==='Notifications'){const host=el('div','ns-legacy');body.append(host);preferenceSection(host,'Notifications')}
  else if(key==='Privacy'){const t=h('input',{type:'checkbox'});t.checked=localStorage.getItem('nova_chat_activity')!=='false';t.onchange=()=>{localStorage.setItem('nova_chat_activity',String(t.checked));parent.postMessage({novaAction:'chatActivityChanged'},location.origin)};body.append(el('p','ns-muted','Only you and your friends can read your direct messages and groups.'),h('div',{class:'ns-card'},h('label',{class:'ns-check'},t,el('span','','Share what I\'m playing and listening to'))))}
  else if(key==='Server'){const host=el('div','ns-legacy');body.append(host);serverManager(host,ctx)}
  else if(key==='Owner'){
   body.append(h('div',{class:'ns-card danger'},el('h3','','Clear public chat'),el('p','ns-muted','Deletes message history in public channels (like #general). Keeps announcements, updates, leaks, links, welcome, the owner lounge, read-only channels, reports, and every DM and group. This cannot be undone.'),(()=>{const b=h('button',{type:'button',class:'nc-btn danger'},icon('trash'),'Clear public chat…');b.onclick=()=>resetPublic();return b})()));
  }
 }
 show(start);return {close:exit};
}
