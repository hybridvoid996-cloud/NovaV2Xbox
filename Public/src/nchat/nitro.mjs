// Nova Nitro page (chat Perks + Settings → Nitro). Clean glass layout, no legacy markup.
import {state,el,h,icon,avatar,nameNode,person,sheet,task,toast} from './core.mjs?v=9';
import {control} from '../control-client.js';
import {showBadgeProgress} from '../nitro-badges.mjs?v=20261029-badge368';

const PRICE=60000;
const PERKS=[
 ['image','Animated profile','GIF avatars, animated banners and a profile theme that matches you.'],
 ['sparkle','Profile effects','Avatar rings, profile outlines and effects that play when people open your card.'],
 ['bold','Name styles','Username gradients and Serif, Mono, Rounded or Heavy fonts.'],
 ['music','Favorite song','Pin a song to your profile with its cover art.'],
 ['nitro','Server boost','Your upgrade boosts Nova Network and shows a Booster tag.'],
 ['crown','Evolving badge','Your Nitro badge levels up the longer you keep Nitro.']
];
const COMPARE=[
 ['Profile picture and bio',true,true],['Avatar decorations from the shop',true,true],['GIF avatar and animated banner',false,true],
 ['Profile theme and outline',false,true],['Username gradient and fonts',false,true],['Favorite song on your profile',false,true],
 ['Booster tag and Nitro badge',false,true],['Gift Nitro to friends',true,true]
];

/** Renders the Nitro page into host. opts.settings(key) opens a settings section. */
export function nitroView(host,{settings,preview=false}={}){
 host.classList.add('nx');host.replaceChildren();
 const me=state.me?.uid,p=person(me);let active=!!p.nitroBooster;

 // hero
 const hero=el('section','nx-hero');
 const glow=el('div','nx-hero-glow');
 const copy=el('div','nx-hero-copy');
 const chip=el('span','nx-chip');
 const title=el('h1','nx-title');title.append(el('span','','Nova'),el('span','nx-shine','Nitro'));
 const lead=el('p','nx-lead','Make your profile yours. Animated banners, name styles, effects and a badge that grows with you.');
 const buy=h('button',{type:'button',class:'nc-btn primary nx-buy'});
 const gift=h('button',{type:'button',class:'nc-btn nx-gift'});gift.append(icon('star'),document.createTextNode('Gift Nitro'));gift.onclick=()=>openGift();
 const actions=el('div','nx-actions');actions.append(buy,gift);
 const meta=el('p','nx-meta');
 copy.append(chip,title,lead,actions,meta);
 const card=el('div','nx-card');
 const cardTop=el('div','nx-card-top');cardTop.append(el('img','nx-logo'));cardTop.firstChild.src='/Nova12.png';cardTop.firstChild.alt='';
 cardTop.append(el('span','nx-card-tag','NITRO'));
 const who=el('div','nx-card-who');who.append(avatar(me,'lg',{dot:false}));const names=el('div','nx-card-names');names.append(nameNode(me),el('small','',active?'Nitro member':'Free member'));who.append(names);
 card.append(cardTop,who,el('div','nx-card-price',PRICE.toLocaleString()+' coins'),el('small','nx-card-note','One purchase · Permanent'));
 hero.append(glow,copy,card);

 function paint(){
  chip.replaceChildren(icon(active?'check':'nitro'),document.createTextNode(active?'Nitro active':'Nova Nitro'));chip.classList.toggle('on',active);
  buy.replaceChildren(icon(active?'gear':'nitro'),document.createTextNode(active?'Customize your profile':'Get Nitro · '+PRICE.toLocaleString()+' coins'));
  buy.onclick=active?()=>settings?.('Profile'):()=>openBuy();
  names.lastChild.textContent=active?'Nitro member':'Free member';
 }
 paint();

 // perks
 const perks=el('section','nx-section');perks.append(sectionHead('What you get','Everything unlocks the moment you upgrade.'));
 const grid=el('div','nx-perks');
 for(const [ic,name,desc] of PERKS){const c=el('article','nx-perk');const i=el('span','nx-perk-ico');i.append(icon(ic));c.append(i,el('h3','',name),el('p','',desc));grid.append(c)}
 perks.append(grid);

 // badge ladder
 const ladder=el('section','nx-section');ladder.append(sectionHead('Your badge grows','Keep Nitro and your badge changes every month.'));
 const steps=el('div','nx-ladder');
 for(let i=1;i<=8;i++){const s=el('div','nx-step');const img=el('img');img.src='/profile-assets/badges/nitro'+i+'.svg';img.alt='';img.loading='lazy';s.append(img,el('small','',i===8?'8+ mo':i+' mo'));steps.append(s)}
 const view=h('button',{type:'button',class:'nc-btn sm ghost'},'See my badges');view.onclick=()=>showBadgeProgress(p,'nitro');
 ladder.append(steps,view);

 // compare
 const cmp=el('section','nx-section');cmp.append(sectionHead('Free vs Nitro',''));
 const table=el('div','nx-compare');const head=el('div','nx-row nx-row-head');head.append(el('span',''),el('b','','Free'),el('b','nx-col-nitro','Nitro'));table.append(head);
 for(const [label,free,nitro] of COMPARE){const r=el('div','nx-row');r.append(el('span','',label),mark(free),mark(nitro,true));table.append(r)}
 cmp.append(table);

 // manage (when active)
 const manage=el('section','nx-section nx-manage');
 function paintManage(){manage.replaceChildren();if(!active){manage.hidden=true;return}manage.hidden=false;manage.append(sectionHead('Your Nitro','Jump straight to your perks.'));
  const row=el('div','nx-links');for(const [ic,label,key] of [['edit','Profile & Nitro style','Profile'],['sparkle','Cosmetics','Cosmetics'],['image','Appearance','Appearance']]){const b=h('button',{type:'button',class:'nx-link'});b.append(icon(ic),el('span','',label),icon('chev'));b.onclick=()=>settings?.(key);row.append(b)}manage.append(row)}
 paintManage();

 host.append(hero,manage,perks,ladder,cmp);

 if(!preview)import('../shop-revamp.js?v=20261029-shop387').then(m=>m.load({state})).then(d=>{if(!host.isConnected)return;active=!!d.nitro||active;meta.textContent=(Number(d.boosts)||0)+' server boosts on Nova'+(typeof d.coins==='number'?' · You have '+d.coins.toLocaleString()+' coins':'');paint();paintManage()}).catch(()=>{});
 else meta.textContent=(state.serverInfo?.boosts||0)+' server boosts on Nova';

 function openBuy(){
  const d=sheet('Get Nova Nitro',{cls:'nx-sheet'});
  const sum=el('div','nx-sum');sum.append(el('img','nx-sum-logo'),el('div','nx-sum-copy'));sum.firstChild.src='/Nova12.png';
  sum.lastChild.append(el('b','','Nova Nitro · Permanent'),el('small','','Every perk, one purchase.'));sum.append(el('strong','',PRICE.toLocaleString()+' coins'));
  const err=el('p','nx-err');const go=h('button',{type:'button',class:'nc-btn primary nx-wide'},'Buy Nitro');const requestId=crypto.randomUUID();
  go.onclick=async()=>{go.disabled=true;err.textContent='';try{if(preview)throw Error('Buying is off in the preview.');await control('buyNitro',{requestId});active=true;if(state.profiles[me])state.profiles[me].nitroBooster=true;paint();paintManage();toast('Nitro unlocked. Enjoy!');d.close()}catch(e){err.textContent=e.message}finally{go.disabled=false}};
  d.body.append(sum,err,go);
 }
 function openGift(){
  const d=sheet('Gift Nitro',{cls:'nx-sheet'});let pick=null;
  const search=h('input',{class:'nc-field',placeholder:'Search friends or players',type:'search'});
  const list=el('div','nx-gift-list');
  const ids=()=>{const friends=Object.keys(state.friends||{});const rest=Object.keys(state.profiles||{}).filter(id=>id!==me&&!friends.includes(id));return [...friends,...rest]};
  const draw=()=>{const q=search.value.trim().toLowerCase();list.replaceChildren();for(const id of ids().filter(id=>!q||String(person(id).name||'').toLowerCase().includes(q)).slice(0,40)){const r=h('button',{type:'button',class:'nx-gift-row'+(pick===id?' on':'')});r.append(avatar(id,'sm'),nameNode(id),state.friends?.[id]?el('small','','Friend'):el('small',''));const c=el('span','nx-check');c.append(icon('check'));r.append(c);r.onclick=()=>{pick=id;draw();go.disabled=false};list.append(r)}if(!list.children.length)list.append(el('p','nx-empty','No one found.'))};
  search.oninput=draw;
  const err=el('p','nx-err');const go=h('button',{type:'button',class:'nc-btn primary nx-wide'},'Send gift · '+PRICE.toLocaleString()+' coins');go.disabled=true;const requestId=crypto.randomUUID();
  go.onclick=async()=>{go.disabled=true;err.textContent='';try{if(preview)throw Error('Gifting is off in the preview.');await control('giftNitro',{uid:pick,requestId});toast('Nitro sent to '+person(pick).name+'.');d.close()}catch(e){err.textContent=e.message;go.disabled=false}};
  d.body.append(search,list,err,go);draw();search.focus();
 }
 return host;
}
function sectionHead(t,s){const w=el('header','nx-head');w.append(el('h2','',t));if(s)w.append(el('p','',s));return w}
function mark(on,nitro=false){const s=el('span','nx-mark'+(on?' on':'')+(nitro?' nitro':''));s.append(icon(on?'check':'x'));return s}
