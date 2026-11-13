// Local-only UI preview (chat.html?preview=1 on localhost). This module never connects to Firebase.
const now=Date.now(),min=60e3;
const data={
 profiles:{
  preview:{name:'Willusfav',joined:now-90*864e5,photo:'',bio:'Building Nova one feature at a time.',decoration:'decoration-88',effect:'effect-161',chatBanner:'discord-live-banner-1564419092574765086',nitroBooster:true,profileTheme:'midnight',novaTag:true},
  zeros:{name:'Zeros',joined:now-95*864e5,bio:'Best Owner of Nova / Official Dev for Nova. DM if games don\'t work.',decoration:'discord-decoration-1212570617404981348',effect:'discord-frame-1564421748202410054',chatBanner:'discord-live-banner-1564419092574765086',nitroBooster:true,usernameFont:'rounded'},
  alex:{name:'Alex',joined:now-20*864e5,bio:'One more game.',effect:'discord-effect-1139323093114962021'},
  sam:{name:'Sam',joined:now-12*864e5},mia:{name:'Mia',joined:now-8*864e5,nitroBooster:true,profileTheme:'sunset'},
  leo:{name:'Leo',joined:now-6*864e5,usernameFont:'heavy'},kai:{name:'Kai',joined:now-30*864e5},
  ruby:{name:'Ruby',joined:now-40*864e5},jun:{name:'Jun',joined:now-3*864e5},
  ...Object.fromEntries(Array.from({length:18},(_,i)=>['p'+i,{name:['Nova','Pixel','Comet','Orbit','Vega','Luna','Astra','Zephyr','Echo','Blaze','Frost','Rio','Sky','Ash','Ivy','Max','Zoe','Finn'][i]+(i%3?'':'_'+(10+i)),joined:now-i*864e5}]))
 },
 friends:{preview:{zeros:true,alex:true,mia:true,leo:true}},
 requests:{preview:{sam:{createdAt:now-30*min}}},
 presence:{
  preview:{online:true},zeros:{online:true,activity:'Minecraft Rust Edition',activityKind:'game',activityStartedAt:now-42*min,recentGames:[{id:'1',name:'Minecraft Rust Edition',kind:'game',art:'/Nova12.png'},{id:'2',name:'Backyard Baseball \'97',kind:'game',art:'/Nova12.png'},{id:'3',name:'Fall Guys',kind:'cloud',art:'/Nova12.png'}]},
  alex:{online:true,music:{name:'FLYTROOP',artist:'Yeat',art:'/Nova12.png',position:40,duration:180,updatedAt:now}},
  mia:{online:true,activity:'Nova Flip',activityKind:'game',activityStartedAt:now-8*min},kai:{online:true},jun:{online:true},
  ...Object.fromEntries(Array.from({length:7},(_,i)=>['p'+i,{online:true}]))
 },
 roles:{preview:'owner',zeros:'owner',kai:'admin',ruby:'moderator'},
 customRoles:{gardenless:{name:'Gardenless hacks',from:'#b8c6a4',to:'#ffffff'},rookie:{name:'Rookie',from:'#7fd4ff',to:'#d8f3ff'}},
 memberRoles:{preview:{gardenless:true,rookie:true},alex:{rookie:true}},
 staffAccess:{},serverCategories:{},serverChannels:{},
 server:{name:'Nova Network',boosts:9},
 bans:{},groups:{},
 channels:{
  general:{messages:{
   m1:{author:'zeros',text:'Welcome to the **new** Nova Chat! 🎉',createdAt:now-50*min},
   m2:{author:'alex',text:'this looks so clean ngl',createdAt:now-49*min},
   m3:{author:'alex',text:'the ||new profile cards|| are crazy',createdAt:now-48*min},
   m4:{author:'mia',text:'@<preview> can we get more emojis 👀',createdAt:now-30*min},
   m5:{author:'zeros',text:'📊 Poll: Best Nova game?\n1️⃣ Nova Flip\n2️⃣ Minecraft Rust Edition\n3️⃣ Backyard Baseball',createdAt:now-20*min},
   m6:{author:'kai',text:'> reminder\nKeep it friendly, no spam. `/help` shows every command.',createdAt:now-5*min}
  }},
  announcements:{messages:{a1:{author:'zeros',text:'# Nova Chat 2.0 is here\nNew look, polls, groups, voice and more.',createdAt:now-864e5}}}
 },
 reactions:{channels:{general:{messages:{m1:{alex:{'1f525':'🔥'},mia:{'1f389':'🎉'},kai:{'1f525':'🔥'}},m5:{alex:{'31-fe0f-20e3':'1️⃣'},mia:{'32-fe0f-20e3':'2️⃣'},kai:{'31-fe0f-20e3':'1️⃣'}}}}}},
 botMessages:{preview:{b1:{author:'nova-bot',subject:'You received a gift 🎁',text:'Zeros sent you 3× Avatar crate V2. Open Nova to unwrap it.',createdAt:now-2*3600e3}}},
 feedback:{},feedbackReplies:{}
};
const listeners=[];const at=p=>p.split('/').filter(Boolean).reduce((n,k)=>n?.[k],data);
function update(p,value){const parts=p.split('/').filter(Boolean);let n=data;for(const k of parts.slice(0,-1))n=n[k]??={};if(value===null)delete n[parts.at(-1)];else n[parts.at(-1)]=value;for(const l of [...listeners])if(p.startsWith(l.p)||l.p.startsWith(p))l.fn(structuredClone(at(l.p)||{}))}
export async function login(){return {uid:'preview',name:'Willusfav',email:'preview@example.com',createdAt:now}}
export async function read(p){return structuredClone(at(p)??null)}
export async function write(p,v){update(p,v)}
export async function patch(v){for(const [p,x]of Object.entries(v))update(p,x)}
export async function del(p){update(p,null)}
export async function send(p,v){update(p+'/'+crypto.randomUUID(),{...v,createdAt:Date.now()})}
export function watch(p,fn){const l={p,fn};listeners.push(l);queueMicrotask(()=>fn(structuredClone(at(p)||{})));return ()=>{const i=listeners.indexOf(l);if(i>=0)listeners.splice(i,1)}}
export async function presence(){return ()=>{}}
export async function saveAccount(uid,name,photo){update('profiles/'+uid,{...at('profiles/'+uid),name,photo})}
export async function resetPassword(){throw Error('Email actions are unavailable in the local preview.')}
export async function claimOwner(){throw Error('This is sample data.')}
export const watchGroups=(uid,fn)=>watch('groups',fn);
export async function createGroup(uid,name,members){const id=crypto.randomUUID();update('groups/'+id,{name,owner:uid,members:Object.fromEntries([uid,...members].map(k=>[k,true]))});return id}
export async function toggleReaction(path,uid,emoji){const key=Array.from(emoji).map(c=>c.codePointAt(0).toString(16)).join('-');const cur={...(at('reactions/'+path+'/'+uid)||{})};if(cur[key])delete cur[key];else cur[key]=emoji;update('reactions/'+path+'/'+uid,Object.keys(cur).length?cur:null)}
export async function changePassword(){throw Error('Password changes are unavailable in the local preview.')}
