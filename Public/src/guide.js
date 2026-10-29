(()=>{const d=document.querySelector('.guide');const svg=p=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';const art={xbox:'<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M5 5q3-3 7 2 4-5 7-2-4 1-5 4 5 5 5 9-4-5-7-7-4 3-7 7 1-5 5-9-2-3-5-4" fill="#202020" stroke="none"/>',friends:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"/>',controller:'<path d="M7 7h10q4 0 5 11-1 4-6-1H8q-5 5-6 1Q3 7 7 7ZM6 10v5M4 12h4M16 11h1M19 14h1"/>',bell:'<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4"/>',shop:'<path d="M4 8h16v13H4ZM8 8V6a4 4 0 0 1 8 0v2M9 13h6M12 10v6"/>',volume:'<path d="M3 9h4l5-4v14l-5-4H3ZM16 8q4 4 0 8M19 5q7 7 0 14"/>'};d.replaceChildren();d.classList.add('xbox-guide');d.setAttribute('aria-label','Nova guide');const top=document.createElement('div');top.className='xg-top';const body=document.createElement('div');body.className='xg-body';const bottom=document.createElement('div');bottom.className='xg-bottom';d.append(top,body,bottom);let view='home';const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e};function button(label,icon,fn){const b=node('button');b.title=label;b.setAttribute('aria-label',label);b.innerHTML=svg(icon);b.onclick=fn;return b}const reduced=()=>(globalThis.NovaMotion?.reduced ?? matchMedia('(prefers-reduced-motion:reduce)').matches)||localStorage.getItem('nova_reduce_motion')==='true';const nativeClose=d.close.bind(d);let closeMotion,closePromise;d.close=()=>{if(!d.open)return Promise.resolve();if(closePromise)return closePromise;if(reduced()){nativeClose();return Promise.resolve()}closeMotion=d.animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(-24px)'}],{duration:180,easing:'ease-in'});closePromise=closeMotion.finished.catch(()=>{}).then(()=>{nativeClose();closePromise=null;closeMotion=null});return closePromise};d.addEventListener('cancel',e=>{e.preventDefault();d.close()});function animatePage(){if(!panel.hidden&&!reduced())panel.animate([{opacity:0,transform:'translateY(12px) scale(.99)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'})}async function go(page){await d.close();openPage(page);if(page!=='home'&&page!=='settings')animatePage()}const tabs=[['Home',art.xbox,()=>render('home')],['Friends',art.friends,()=>render('people')],['Chat',icons.chat,()=>render('chat')],['Library',art.controller,()=>go('library')],['Apps',icons.apps,()=>go('apps')],['Search',icons.search,()=>go('search')],['Profile',icons.settings,()=>render('profile')]];tabs.forEach(([name,icon,fn])=>top.append(button(name,icon,fn)));const profileButton=top.lastChild;profileButton.className='xg-profile';function account(){return localStorage.getItem('nova_user')||localStorage.getItem('nova_username')||'guest'}function recent(){return window.NovaRecent?.list()||[]}window.novaRecordGame=g=>window.NovaRecent?.record(g);function row(name,icon,fn){const b=button(name,icon,fn);b.append(node('span',name));b.className='xg-row';body.append(b);return b}function personAvatar(f){const a=node('span',(f.name||'N')[0].toUpperCase());a.className='friend-avatar';window.NovaHomeCosmetics?.avatar(a,f);return a}
function personCard(f,status){const b=node('button');b.className='xg-friend';b.classList.toggle('online',!!f.online);const detail=node('div'),name=node('b',f.name);window.NovaHomeCosmetics?.name(name,f);detail.append(name,node('small',status));if(f.online&&f.status!=='offline'&&f.music?.name){const row=node('small','Listening to '+f.music.name),img=node('img');img.src=f.music.art||'Nova12.png';img.alt='';img.style.cssText='width:24px;height:24px;object-fit:cover;border-radius:5px;margin-right:6px;vertical-align:middle';row.prepend(img);detail.append(row)}b.append(personAvatar(f),detail);window.NovaHomeCosmetics?.surface(b,f,true);return b}
let friendsPanel=null;
function closeFriends(animate=true){
 const closing=friendsPanel;if(!closing)return;friendsPanel=null;
 const finish=()=>{closing.remove();if(d.open)body.querySelector('button')?.focus()};
 if(animate&&!reduced())closing.animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(-14px)'}],{duration:160,easing:'ease-in'}).finished.then(finish,finish);else closing.remove();
}
function showFriends(refresh=false){
 const opening=!friendsPanel;
 if(opening){friendsPanel=node('section');friendsPanel.className='xg-friends-flyout';friendsPanel.setAttribute('role','region');friendsPanel.setAttribute('aria-label','Friends and happening now');d.append(friendsPanel)}
 const focused=document.activeElement;const focusIndex=Array.from(friendsPanel.querySelectorAll('button')).indexOf(focused);
 friendsPanel.replaceChildren();const heading=node('div');heading.className='xg-flyout-heading';heading.append(node('b','Friends'));
 const close=node('button','×');close.setAttribute('aria-label','Close Friends');close.onclick=()=>closeFriends();heading.append(close);friendsPanel.append(heading);
const columns=node('div');columns.className='xg-people-columns';const list=node('section'),now=node('section');columns.append(list,now);friendsPanel.append(columns);
list.append(node('h2','Friends'));now.append(node('h2','Happening now'));
const friends=window.novaGuideFriends||[];
for(const online of [true,false]){const matching=friends.filter(f=>f.online===online);if(!matching.length)continue;list.append(node('h3',online?'Online':'Offline'));for(const f of matching){const b=personCard(f,online?(f.activity||'Online'):'Offline');b.onclick=()=>go('chat');list.append(b)}}
if(!friends.length)list.append(node('p',window.novaGuideFriendError||'Add friends in Chat to see them here.'));
const playing=friends.filter(f=>f.online&&f.activity);for(const f of playing){const b=personCard(f,'Playing '+f.activity);b.classList.add('xg-playing');b.onclick=()=>go('chat');now.append(b)}
if(!playing.length)now.append(node('p','When friends share a game, it appears here.'));

 if(opening){if(!reduced())friendsPanel.animate([{opacity:0,transform:'translateX(-16px)'},{opacity:1,transform:'translateX(0)'}],{duration:220,easing:'ease-out'});close.focus()}
 else if(refresh&&focusIndex>=0)friendsPanel.querySelectorAll('button')[focusIndex]?.focus();
}
let conversationPanel;
function closeConversation(){conversationPanel?.remove();conversationPanel=null;}
addEventListener('message',event=>{
 const source=body.querySelector('.guide-chat-frame');
 if(event.origin!==location.origin||event.source!==source?.contentWindow||event.data?.novaAction!=='guideOpenDM')return;
 const uid=event.data.uid;if(typeof uid!=='string'||!uid||uid.length>128||/[.#$\[\]/]/.test(uid))return;
 closeFriends(false);closeConversation();
 conversationPanel=node('section');conversationPanel.className='xg-conversation-flyout';conversationPanel.setAttribute('aria-label','Direct message');
 const header=node('div');header.className='xg-flyout-heading';header.append(node('b','Conversation'));const close=node('button','×');close.setAttribute('aria-label','Close conversation');close.onclick=closeConversation;header.append(close);
 const chat=node('iframe');chat.title='Direct message conversation';chat.allow='microphone; autoplay';const params=new URLSearchParams({guide:'1',dm:uid});if(new URL(source.src,location.href).searchParams.get('preview')==='1')params.set('preview','1');chat.src='chat.html?'+params;
 conversationPanel.append(header,chat);d.append(conversationPanel);
 if(!reduced())conversationPanel.animate([{opacity:0,transform:'translateX(-12px)'},{opacity:1,transform:'translateX(0)'}],{duration:200,easing:'ease-out'});close.focus();
});
d.addEventListener('close',closeConversation);
d.addEventListener('close',()=>closeFriends(false));
d.addEventListener('keydown',e=>{if(e.key==='Escape'&&friendsPanel){e.preventDefault();e.stopPropagation();closeFriends()}});
function render(next){if(next!=='chat')closeConversation();if(next==='friends'){showFriends();return}if(next!==view)closeFriends(false);if(next==='chat'&&view==='chat'&&body.querySelector('iframe'))return;const changed=view!==next;view=next;if(changed&&!reduced()){body.getAnimations().forEach(a=>a.cancel());body.animate([{opacity:0,transform:'translateX(10px)'},{opacity:1,transform:'translateX(0)'}],{duration:220,easing:'ease-out'})}d.classList.toggle('guide-messages',next==='chat');body.replaceChildren();top.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',(view==='profile'?6:['people','friends','requests','groups'].includes(view)?1:view==='chat'?2:0)===i));if(view==='chat'){const mini=node('iframe');mini.src='chat.html?guide=1';mini.title='Direct messages';mini.allow='microphone; autoplay';mini.className='guide-chat-frame';body.append(mini)}else if(view==='home'){row('Home',icons.home,()=>go('home')).classList.add('selected');row('My games',icons.library,()=>go('library'));row('Apps',icons.apps,()=>go('apps'));body.append(node('hr'));const games=recent();if(!games.length){const text=node('p','Your recently played games will appear here.');text.className='xg-empty';body.append(text)}games.slice(0,4).forEach((g,i)=>{const b=node('button');b.className='xg-game';const img=node('img');img.src=g.art;img.alt='';b.append(img,node('span',(i===0?'Resume · ':'')+g.name));if(i===0)b.classList.add('xg-resume');b.onclick=async()=>{await d.close();window.NovaRecent.launch(g)};body.append(b)})}else if(view==='profile'){
const hero=node('div');hero.className='xg-account-hero';
const name=window.novaHomeProfile?.name||document.getElementById('username').textContent||'Guest';
const identity=node('h2',name);window.NovaHomeCosmetics?.name(identity,window.novaHomeProfile);hero.append(identity);window.NovaHomeCosmetics?.surface(hero,window.novaHomeProfile);
const avatar=node('div');avatar.className='xg-account-avatar';
window.NovaHomeCosmetics?.avatar(avatar,window.novaHomeProfile);
hero.append(avatar);body.append(hero);
row('My profile',icons.home,async()=>{await d.close();window.NovaProgress?.open()});
row((window.NovaAccounts?.slots().length===2?'Switch account':'Add another account'),icons.settings,async()=>{await d.close();if(window.NovaAccounts?.slots().length===2){const other=window.NovaAccounts.slots().findIndex(p=>p.uid!==account());await window.NovaAccounts.switchAccount(other)}else await window.NovaAccounts?.addAccount()});
row('My account',icons.settings,()=>go('settings'));
row('My subscriptions',icons.library,async()=>{await d.close();window.openNovaSubscriptions();animatePage()});
}else if(view==='people'){
body.append(node('h2','People'));
const friends=window.novaGuideFriends||[],online=friends.filter(f=>f.online);
const entry=(title,subtitle,fn)=>{const b=row(title,art.friends,fn);const text=b.querySelector('span');text.append(node('small',subtitle));return b};
const friendsRow=entry('Friends',online.length+' friends online',()=>render('friends'));
const avatars=node('div');avatars.className='xg-online-peek';online.slice(0,5).forEach(f=>avatars.append(personAvatar(f)));friendsRow.append(avatars);
entry('Friend requests',(window.novaGuideRequests||[]).length+' pending',()=>render('requests'));
if(window.novaGuideGroups?.length)entry('Groups',window.novaGuideGroups.length+' joined',()=>render('groups'));
if(window.novaGuideGroupError)body.append(node('p',window.novaGuideGroupError));
}else if(view==='requests'||view==='groups'){
row('People',icons.home,()=>render('people'));body.append(node('h2',view==='requests'?'Friend requests':'Groups'));
const items=view==='requests'?window.novaGuideRequests||[]:window.novaGuideGroups||[];
for(const item of items){const f={name:item.name||item.from||'Nova player',photo:item.photo||item.fromPic||''};const b=personCard(f,view==='requests'?'Manage request in Chat':'Open Chat');b.onclick=()=>go('chat');body.append(b)}
if(!items.length)body.append(node('p',view==='requests'?(window.novaGuideRequestError||'No pending requests.'):'You have not joined any groups.'));
}else if(view==='updates'){body.append(node('h2','Updates'));for(const u of window.novaGuideUpdates||[]){const card=node('article');card.append(node('b',u.author||'Nova'),node('p',u.text));body.append(card)}if(!window.novaGuideUpdates?.length)body.append(node('p','No updates available.'))}else if(view==='shop'){body.append(node('h2','Nova Shop'),node('p','The shop is not available yet.'))}else{body.append(node('h2','Audio & volume'),node('p','Nova media volume'));const range=node('input');range.type='range';range.min=0;range.max=100;range.value=Math.round(volume*100);range.setAttribute('aria-label','Nova media volume');const label=node('p',range.value+'%');range.oninput=()=>{volume=Number(range.value)/100;localStorage.setItem('nova-v2-volume',volume);label.textContent=range.value+'%';applyVolume(document)};body.append(range,label);const mute=node('button','Mute / unmute');mute.className='xg-row';mute.onclick=()=>{range.value=volume?0:70;range.dispatchEvent(new Event('input'))};body.append(mute)}}let volume=Number(localStorage.getItem('nova-v2-volume')??1);function applyVolume(doc,depth=0){if(window.NovaOS||document.body.classList.contains("nova-main")||depth>4)return;doc.querySelectorAll('audio,video').forEach(m=>{if(m.volume!==volume)m.volume=volume});doc.querySelectorAll('iframe').forEach(f=>{try{if(f.id!=='nova-music-frame'&&f.contentDocument)applyVolume(f.contentDocument,depth+1)}catch{}})}setInterval(()=>{if(!document.hidden)applyVolume(document)},5000);[['Updates',art.bell,()=>render('updates')],['Shop',art.shop,()=>render('shop')],['Library',icons.library,()=>go('library')],['Apps',icons.apps,()=>go('apps')],['Search',icons.search,()=>go('search')],['Volume',art.volume,()=>render('volume')]].forEach(([name,icon,fn])=>bottom.append(button(name,icon,fn)));window.novaGuideRender=render;addEventListener('nova-guide-data',()=>{if(d.open){render(view);if(friendsPanel)showFriends(true)}});function syncProfile(){const p=window.novaHomeProfile||{};window.NovaHomeCosmetics?.avatar(profileButton,p);profileButton.title=(p.name||'Your')+' profile'}addEventListener('nova-profile-changed',()=>{syncProfile();if(d.open&&view==='profile')render('profile')});syncProfile();render('home');})();

// Keep the guide status in the modal layer so it stays clear above the backdrop.
(() => {
  const guide = document.querySelector('.xbox-guide');
  if (!guide) return;
  const status = document.createElement('aside');
  status.className = 'xg-status';
  status.setAttribute('aria-label', 'Time and battery');
  const battery = document.createElement('span');
  battery.className = 'xg-status-battery';
  const time = document.createElement('time');
  status.append(battery, time);
  guide.append(status);
  const source = document.querySelector('.console-status .battery');
  function syncBattery() {
    if (!source) { battery.textContent = 'Battery unavailable'; return; }
    battery.replaceChildren(...Array.from(source.childNodes, node => node.cloneNode(true)));
    battery.title = source.title;
    battery.setAttribute('aria-label', source.title + ': ' + (source.querySelector('small')?.textContent || 'unavailable'));
  }
  function tick() {
    const now = new Date();
    time.dateTime = now.toISOString();
    renderNovaClock(time, now);
  }
  let timer;
  function syncOpen() {
    clearInterval(timer);
    if (guide.open) { tick(); syncBattery(); timer = setInterval(tick, 1000); }
  }
  if (source) new MutationObserver(syncBattery).observe(source, { subtree: true, childList: true, attributes: true, characterData: true });
  new MutationObserver(syncOpen).observe(guide, { attributes: true, attributeFilter: ['open'] });
  syncOpen();
})();

// Nova's collection overview, reached from the guide profile panel.
window.openNovaSubscriptions=()=>{
 panel.dataset.view='subscriptions';panel.classList.remove('full-library');panel.hidden=false;frame.hidden=true;content.hidden=false;
 document.getElementById('panel-title').textContent='My subscriptions';
 content.innerHTML='<section class="nova-pass"><nav class="pass-nav" aria-label="Collection navigation"><strong>PC Game Pass</strong><button class="selected" aria-current="page">Overview</button><button data-destination="library">Games</button><button data-destination="apps">Apps</button><button data-destination="search">Browser</button></nav><div class="pass-hero"><div class="pass-copy"><span class="pass-eyebrow">YOUR NOVA COLLECTION</span><h1>PC GAME PASS</h1><p>Find your next favorite game. Explore the Nova library, open your apps, and browse—all in one place.</p><span class="pass-owned">✓ Owned</span><small>Included with Nova</small></div><div class="pass-art" aria-hidden="true"></div></div><div class="pass-discover"><h2>Discover your next favorite game</h2><p>Your library. Ready when you are.</p><div class="pass-games"></div></div></section>';
 const page=content.querySelector('.nova-pass');
 page.querySelectorAll('[data-destination]').forEach(b=>b.onclick=()=>openPage(b.dataset.destination));
 page.querySelector('.selected').onclick=()=>page.querySelector('.pass-hero').scrollIntoView({behavior:(globalThis.NovaMotion?.reduced ?? matchMedia('(prefers-reduced-motion:reduce)').matches)?'instant':'smooth',block:'start'});
 fetch('home-covers.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(items=>{
 if(!page.isConnected)return;
 items.slice(0,3).forEach(g=>{const img=document.createElement('img');img.src=g.art;img.alt='';page.querySelector('.pass-art').append(img)});
 items.slice(0,8).forEach(g=>{const b=document.createElement('button'),img=document.createElement('img'),label=document.createElement('span');img.src=g.art;img.alt='';img.loading='lazy';label.textContent=g.name;b.append(img,label);b.onclick=()=>openPage('library');page.querySelector('.pass-games').append(b)});
 }).catch(()=>{if(page.isConnected)page.querySelector('.pass-discover p').textContent='Open Games above to explore your library.'});
};
