import {appleMark} from './service-brand-marks.mjs?v=20261112-marks2';
// Two looks for the same Nova Music player. Only CSS and a few classes change;
// playback, queue and library are shared.
export const MUSIC_SKINS={
 spotify:{label:'Spotify',hint:'Dark panels, now playing on the right'},
 apple:{label:'Apple Music',hint:'Glass sidebar, floating player, live lyrics'}
};
const KEY='nova_music_skin';
const css=new URL('./nova-music-skins.css?v=20261112-gallery4',import.meta.url).href;
if(!document.querySelector('link[data-nova-music-skins]')){const l=document.createElement('link');l.rel='stylesheet';l.href=css;l.dataset.novaMusicSkins='';document.head.append(l)}
export function readMusicSkin(storage=localStorage){try{const v=storage.getItem(KEY);return MUSIC_SKINS[v]?v:'spotify'}catch{return 'spotify'}}
function chosen(storage){try{return !!MUSIC_SKINS[storage.getItem(KEY)]}catch{return true}}
const SPOTIFY='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21Zm4.8 15.2a.65.65 0 0 1-.9.2c-2.5-1.5-5.6-1.9-9.3-1a.65.65 0 1 1-.3-1.3c4-.9 7.5-.5 10.3 1.2.3.2.4.6.2.9Zm1.3-2.9a.82.82 0 0 1-1.1.3c-2.8-1.7-7.1-2.2-10.5-1.2a.82.82 0 0 1-.5-1.6c3.8-1.1 8.6-.6 11.8 1.4.4.2.5.7.3 1.1Zm.1-3c-3.4-2-8.9-2.2-12.1-1.2a1 1 0 1 1-.6-1.9c3.7-1.1 9.7-.9 13.7 1.4a1 1 0 0 1-1 1.7Z"/></svg>';
const APPLE=appleMark;
export const skinIcon=skin=>skin==='apple'?APPLE:SPOTIFY;

export function mountMusicSkins({app,top,content,storage=localStorage,before=null}){
 let skin=readMusicSkin(storage);const firstVisit=!chosen(storage);
 const wrap=document.createElement('div');wrap.className='nmc-skin-picker';
 const trigger=document.createElement('button');trigger.type='button';trigger.className='nmc-skin-trigger';trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');
 const menu=document.createElement('div');menu.className='nmc-skin-menu';menu.setAttribute('role','menu');menu.hidden=true;
 const head=document.createElement('small');head.textContent='MUSIC LOOK';menu.append(head);
 const option=(id,info,onPick,cls)=>{const b=document.createElement('button');b.type='button';b.className=cls||'';b.dataset.skin=id;const mark=document.createElement('span');mark.className='nmc-skin-mark is-'+id;mark.innerHTML=skinIcon(id);const copy=document.createElement('span');const t=document.createElement('strong');t.textContent=info.label;const h=document.createElement('small');h.textContent=info.hint;copy.append(t,h);b.append(mark,copy);b.onclick=()=>onPick(id);return b};
 const options=Object.entries(MUSIC_SKINS).map(([id,info])=>{const b=option(id,info,id=>{set(id);close()});b.setAttribute('role','menuitemradio');menu.append(b);return b});
 wrap.append(trigger,menu);top.insertBefore(wrap,before&&before.parentNode===top?before:null);
 function paint(){const info=MUSIC_SKINS[skin];trigger.className='nmc-skin-trigger is-'+skin;trigger.innerHTML=skinIcon(skin);trigger.setAttribute('aria-label','Music look: '+info.label+'. Change look');trigger.title=info.label+' look · click to change';for(const b of options)b.setAttribute('aria-checked',String(b.dataset.skin===skin))}
 function set(id,animate=true,save=true){if(!MUSIC_SKINS[id])return;const changed=id!==skin;skin=id;for(const k of Object.keys(MUSIC_SKINS))app.classList.toggle('skin-'+k,k===skin);document.documentElement.dataset.musicSkin=skin;if(save)try{storage.setItem(KEY,skin)}catch{}if(skin==='apple')app.classList.remove('nmc-compact-sidebar');paint();if(save)dispatchEvent(new Event('nova-appearance-changed'));if(changed&&animate&&!app.classList.contains('nmc-quiet'))app.animate?.([{opacity:.35,filter:'blur(6px)'},{opacity:1,filter:'blur(0)'}],{duration:380,easing:'cubic-bezier(.16,1,.3,1)'})}
 const open=()=>{menu.hidden=false;trigger.setAttribute('aria-expanded','true');wrap.classList.add('is-open')};
 const close=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');wrap.classList.remove('is-open')};
 trigger.onclick=()=>menu.hidden?open():close();
 const outside=e=>{if(!wrap.contains(e.target))close()};const key=e=>{if(e.key==='Escape')close()};
 document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);
 // The Apple Music look keeps its full sidebar; the collapsed rail belongs to the Spotify look.
 const keepSidebar=new MutationObserver(()=>{if(skin==='apple'&&app.classList.contains('nmc-compact-sidebar'))app.classList.remove('nmc-compact-sidebar')});keepSidebar.observe(app,{attributes:true,attributeFilter:['class']});
 const syncPage=()=>{app.classList.toggle('nmc-on-lyrics',content.classList.contains('nmc-lyrics-view'));app.classList.toggle('nmc-on-home',!!content.querySelector('.nmc-home-heading'))};
 const observer=new MutationObserver(syncPage);observer.observe(content,{childList:true,attributes:true,attributeFilter:['class']});syncPage();
 set(skin,false,false);
 // First visit: let the listener pick their look.
 let chooser=null;
 if(firstVisit){
  chooser=document.createElement('div');chooser.className='nmc-skin-chooser';chooser.setAttribute('role','dialog');chooser.setAttribute('aria-label','Choose your music look');
  const card=document.createElement('div');card.className='nmc-skin-chooser-card';
  const h=document.createElement('h2');h.textContent='How should your music look?';const p=document.createElement('p');p.textContent='Same songs and playlists either way. You can switch any time from the logo in the top bar.';
  const row=document.createElement('div');row.className='nmc-skin-chooser-row';
  for(const [id,info]of Object.entries(MUSIC_SKINS)){const b=option(id,info,id=>{set(id);chooser.classList.add('is-leaving');setTimeout(()=>chooser?.remove(),320)},'nmc-skin-choice is-'+id);const mock=document.createElement('span');mock.className='nmc-skin-mock is-'+id;mock.innerHTML='<i></i><b></b><em></em><u></u>';b.prepend(mock);row.append(b)}
  card.append(h,p,row);chooser.append(card);app.append(chooser);
 }
 return {get skin(){return skin},set,dispose(){observer.disconnect();keepSidebar.disconnect();chooser?.remove();document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);wrap.remove()}};
}
