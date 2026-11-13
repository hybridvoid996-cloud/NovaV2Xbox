// Nova Chat (2026 revamp): shared state, DOM helpers, icons and identity rendering.
import {rolesFor,nameRoleFor} from '../chat-server.js?v=20261029-chat387';
import {identityBadges} from '../chat-identity.mjs?v=20261029-errors392';
import {activityLabel} from '../shared-activity.mjs?v=20261028-profile364';

export const state={
 me:null,profiles:{},friends:{},requests:{},presence:{},roles:{},bans:{},groups:{},serverInfo:{},
 customRoles:{},memberRoles:{},staffAccess:{},serverCategories:{},serverChannels:{},assets:[],
 view:{type:'friends',id:null},preview:false
};
export const BOT_ID='nova-bot';
export const BOTS={[BOT_ID]:{name:'Nova Bot',photo:'/Nova12.png',bio:'Nova notifications, gifts and trades.',bot:true}};

export function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n}
export function h(tag,props={},...kids){const n=document.createElement(tag);for(const [k,v]of Object.entries(props||{})){if(v==null||v===false)continue;if(k==='class')n.className=v;else if(k==='style'&&typeof v==='object')Object.assign(n.style,v);else if(k.startsWith('on'))n[k]=v;else if(k==='dataset')Object.assign(n.dataset,v);else n.setAttribute(k,v===true?'':v)}for(const k of kids.flat())if(k!=null&&k!==false)n.append(k instanceof Node?k:document.createTextNode(String(k)));return n}
export const fmt=n=>Number(n||0).toLocaleString();

// ---- icons (original line icons, 24px grid) ----
const P={
 hash:'M5 9h14M4 15h14M10 3 8 21M16 3l-2 18',megaphone:'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Zm12-3a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14',
 lock:'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',star:'M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.8Z',
 bag:'M5 8h14l-1 12H6ZM9 8V6a3 3 0 0 1 6 0v2',users:'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 9v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
 friend:'M15 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M8.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 8v6M16 11h6',search:'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 3-4.3-4.3',
 gear:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
 exit:'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',bell:'M6 16V11a6 6 0 0 1 12 0v5l2 2H4Zm4 4h4',pin:'M9 4h6l-1 6 3 3H7l3-3ZM12 13v8',
 plus:'M12 5v14M5 12h14',x:'M6 6l12 12M18 6 6 18',send:'M4 12 20 4l-4 16-4-7Zm8 1 8-9',smile:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 14a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01',
 image:'M4 5h16v14H4ZM4 15l4-4 4 4 3-3 5 5M15.5 9.5h.01',film:'M4 5h16v14H4ZM8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4',file:'M7 3h7l5 5v13H7ZM14 3v5h5',
 poll:'M5 20V10M12 20V4M19 20v-7',reply:'M10 9 5 13l5 4M5 13h9a5 5 0 0 1 5 5v1',edit:'M4 20h4L19 9l-4-4L4 16Zm10-14 4 4',trash:'M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
 mic:'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm6-3a6 6 0 0 1-12 0m6 6v3',headset:'M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H4Zm13 0h3v5h-3Z',
 wave:'M3 12h2M7 8v8M11 5v14M15 8v8M19 11v2',bot:'M7 9h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Zm5-4v4M9 14h.01M15 14h.01',
 crown:'M4 18h16l-1-9-4 4-3-6-3 6-4-4Z',shield:'M12 3 5 6v6c0 4.4 3 8 7 9 4-1 7-4.6 7-9V6Z',check:'M5 12l5 5 9-10',chev:'M9 6l6 6-6 6',
 bold:'M7 5h6a3.5 3.5 0 0 1 0 7H7Zm0 7h7a3.5 3.5 0 0 1 0 7H7Z',italic:'M10 5h8M6 19h8M14 5l-4 14',strike:'M5 12h14M16 7a4 4 0 0 0-4-2c-2.2 0-4 1.3-4 3 0 1.4 1 2.3 3 3M8 17a4 4 0 0 0 4 2c2.2 0 4-1.3 4-3',
 underline:'M7 4v7a5 5 0 0 0 10 0V4M5 20h14',code:'M8 8l-4 4 4 4M16 8l4 4-4 4',quote:'M7 11H4V7h4v4l-2 5M17 11h-3V7h4v4l-2 5',spoiler:'M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Zm9 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 4l16 16',
 at:'M16 12a4 4 0 1 1-1.2-2.8M16 8v5.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1',slash:'M15 4 9 20',play:'M7 5v14l12-7Z',pause:'M7 5h4v14H7Zm6 0h4v14h-4Z',
 volume:'M4 10v4h4l5 4V6L8 10Zm12-1a4 4 0 0 1 0 6',mute:'M4 10v4h4l5 4V6L8 10Zm12 0 5 5m0-5-5 5',full:'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
 download:'M12 4v11m-4-4 4 4 4-4M5 20h14',zoomin:'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 3-4.3-4.3M11 8v6M8 11h6',music:'M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm11-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z',
 game:'M6 11h4M8 9v4M15 12h.01M18 10h.01M7 6h10a5 5 0 0 1 4.9 6l-.8 4a3 3 0 0 1-5.2 1.4L14 15h-4l-1.9 2.4A3 3 0 0 1 2.9 16l-.8-4A5 5 0 0 1 7 6Z',
 nitro:'M13 3 6 13h5l-1 8 7-10h-5Z',group:'M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-4v6m-3-3h6',
 chat:'M4 5h16v11H9l-5 4Z',inbox:'M4 13h4l2 3h4l2-3h4M4 13l2-8h12l2 8v6H4Z',sparkle:'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
 dots:'M5 12h.01M12 12h.01M19 12h.01',home:'M4 11 12 4l8 7v9h-5v-6H9v6H4Z',flag:'M5 21V4h11l-2 4 2 4H5'
};
export function icon(name,cls=''){const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('aria-hidden','true');s.setAttribute('class','ni '+cls);s.innerHTML='<path d="'+(P[name]||P.dots)+'"/>';return s}

// ---- people ----
export function person(id){return state.profiles[id]||BOTS[id]||{name:'Nova player'}}
export const isBot=id=>!!BOTS[id]||!!state.profiles[id]?.bot;
export const asset=id=>id?state.assets.find(a=>a.id===id):null;
export function role(id){return state.roles[id]||'member'}
export const isStaff=(id=state.me?.uid)=>['owner','admin','moderator'].includes(role(id))||!!state.staffAccess?.[id]?.moderator;
export const isOwner=(id=state.me?.uid)=>role(id)==='owner';
export function online(id){if(isBot(id))return true;const p=person(id);return !!state.presence[id]?.online&&p.status!=='offline'}
export function statusOf(id){const p=person(id);if(isBot(id))return 'online';if(!online(id))return 'offline';return p.status==='dnd'?'dnd':state.presence[id]?.idle?'idle':'online'}
export function activityText(id){if(isBot(id))return 'Watching Nova';if(!online(id))return '';const pr=state.presence[id]||{},m=pr.music;return m?.name?'Listening to '+m.name:activityLabel(pr)||(person(id).status==='dnd'?'Do not disturb':'')}

function media(src,cls){const img=el('img',cls);img.src=src;img.alt='';img.decoding='async';img.loading='lazy';img.draggable=false;img.onerror=()=>img.remove();return img}

/** Avatar with photo, decoration frame and presence dot. size: xs | sm | md | lg | xl */
export function avatar(id,size='md',{dot=true,ring=false}={}){
 const p=person(id),a=el('span','na-avatar na-'+size+(ring?' has-ring':''));a.dataset.uid=id;
 const letter=(p.name||'N')[0].toUpperCase(),face=el('span','na-face',letter);if(p.photo){face.textContent='';const img=media(p.photo);img.onerror=()=>{img.remove();face.textContent=letter};face.append(img);if(p.photo==='/Nova12.png')face.classList.add('na-logo')}a.append(face);
 const deco=asset(p.decoration);if(deco)a.append(media(deco.src,'na-deco'));
 if(p.nitroAnimation&&p.nitroAnimation!=='none')a.classList.add('na-anim-'+p.nitroAnimation);
 if(dot){const s=statusOf(id);a.append(el('i','na-dot '+s));}
 return a;
}
/** Username painted with the role / Nitro gradient and the chosen username font. */
export function nameNode(id,tag='b'){
 const p=person(id),n=el(tag,'nn-name font-'+(p.usernameFont||'default'),p.name||'Nova player');
 let from='#e9ecf5',to='#ffffff';
 if(isBot(id)){from='#ffffff';to='#c9ced8'}else{const r=nameRoleFor(id,state);from=r?.from||r?.color||from;to=r?.to||r?.color||from}
 n.style.setProperty('--n-from',from);n.style.setProperty('--n-to',to);
 if(!isBot(id)&&(role(id)!=='member'||p.nitroBooster||p.nameColorRole||p.novaTag))n.classList.add('nn-glow');
 return n;
}
export function botTag(){const t=el('span','bot-tag');t.append(icon('check'),document.createTextNode('BOT'));return t}
export function badges(id){try{return identityBadges(id,state)}catch{return el('span')}}
export const roleList=id=>rolesFor(id,state);
export function topRole(id){const r=role(id);return r==='owner'?'Owner':r==='admin'?'Admin':r==='moderator'?'Moderator':null}

// ---- toasts / dialogs ----
let toastHost;
export function toast(text,{error=false,title,kind,duration=4200}={}){
 toastHost||=document.body.appendChild(el('div','nc-toasts'));
 const s=String(text||'');
 const k=kind||(error?'error':/friend/i.test(s)?'friend':/nitro|gift|boost/i.test(s)?'nitro':/copied/i.test(s)?'copy':/saved|sent|updated|unlocked|joined|added|removed|done|enjoy/i.test(s)?'success':'info');
 const meta={error:['x','Something went wrong'],friend:['friend','Friends'],nitro:['nitro','Nova Nitro'],copy:['file','Copied'],success:['check','Done'],info:['bell','Nova']}[k];
 const t=el('div','nc-toast k-'+k);t.setAttribute('role',k==='error'?'alert':'status');
 const ico=el('span','nc-toast-ico');ico.append(icon(meta[0]));
 const copy=el('div','nc-toast-copy');copy.append(el('b','',title||meta[1]),el('span','',s));
 const x=el('button','nc-toast-x');x.type='button';x.setAttribute('aria-label','Dismiss');x.append(icon('x'));
 const bar=el('i','nc-toast-bar');bar.style.animationDuration=duration+'ms';
 t.append(ico,copy,x,bar);toastHost.append(t);
 while(toastHost.children.length>4)toastHost.firstChild.remove();
 let left=duration,start=Date.now(),timer;
 const close=()=>{clearTimeout(timer);t.classList.add('out');setTimeout(()=>t.remove(),320)};
 const run=()=>{start=Date.now();timer=setTimeout(close,left)};
 t.onmouseenter=()=>{clearTimeout(timer);left-=Date.now()-start;t.classList.add('hold')};
 t.onmouseleave=()=>{t.classList.remove('hold');run()};
 x.onclick=close;run();
}
export const fail=e=>toast(e?.message||String(e),{error:true});
export function task(fn){return async(...a)=>{try{return await fn(...a)}catch(e){fail(e)}}}
/** Centered sheet dialog. Returns the <dialog>; content goes in d.body. */
export function sheet(title,{wide=false,cls=''}={}){
 const d=el('dialog','nc-sheet'+(wide?' wide':'')+(cls?' '+cls:''));const head=el('header','nc-sheet-head');head.append(el('h2','',title));
 const x=el('button','nc-icon-btn');x.type='button';x.setAttribute('aria-label','Close');x.append(icon('x'));x.onclick=()=>d.close();head.append(x);
 const body=el('div','nc-sheet-body');d.append(head,body);d.body=body;document.body.append(d);d.addEventListener('close',()=>d.remove());
 d.addEventListener('click',e=>{if(e.target===d)d.close()});d.showModal();return d;
}
/** Small anchored popover next to a node. */
export function popover(anchor,content,{side='right',cls=''}={}){
 document.querySelectorAll('.nc-pop').forEach(p=>p.remove());
 const p=el('div','nc-pop '+cls);p.append(content);document.body.append(p);
 const r=anchor.getBoundingClientRect(),pr=p.getBoundingClientRect();
 let x=side==='left'?r.left-pr.width-10:side==='top'?r.left:r.right+10,y=side==='top'?r.top-pr.height-8:r.top;
 x=Math.max(8,Math.min(innerWidth-pr.width-8,x));y=Math.max(8,Math.min(innerHeight-pr.height-8,y));p.style.left=x+'px';p.style.top=y+'px';
 const off=e=>{if(!p.contains(e.target)&&!anchor.contains(e.target)){p.remove();removeEventListener('pointerdown',off,true)}};
 setTimeout(()=>addEventListener('pointerdown',off,true));
 return p;
}
export const lowPower=()=>document.documentElement.classList.contains('nova-low-power')||document.documentElement.classList.contains('reduce-motion');
export const when=t=>{const d=new Date(t||Date.now()),now=new Date(),y=new Date(now-864e5);const time=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});if(d.toDateString()===now.toDateString())return 'Today at '+time;if(d.toDateString()===y.toDateString())return 'Yesterday at '+time;return d.toLocaleDateString([],{month:'short',day:'numeric',year:d.getFullYear()===now.getFullYear()?undefined:'numeric'})+' '+time};
export const dmPath=id=>{const ids=[state.me.uid,id].sort();return 'dms/'+ids[0]+'/'+ids[1]+'/messages'};
