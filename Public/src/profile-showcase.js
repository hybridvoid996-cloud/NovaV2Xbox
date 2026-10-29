import {mountRankProfile} from './nova-rank-ui.mjs?v=20261029-motion374';
import {gameKey} from './os-feature-core.mjs';
let catalog;
export function profileShowcase(host,profile,{rankHost=host}={}){
 mountRankProfile(rankHost,{uid:profile.uid||profile.key});
 if(!Array.isArray(profile.showcase)||!profile.showcase.length)return;
 const section=document.createElement('section');section.className='nova-favorites';const title=document.createElement('h4');title.textContent='FAVORITE GAMES';section.append(title);host.append(section);
 catalog??=Promise.all(['games','cloud'].map(async kind=>{const r=await fetch('/library-'+kind+'.json');if(!r.ok)throw Error();return(await r.json()).map(g=>({...g,kind:kind==='games'?'game':'cloud'}))})).then(rows=>rows.flat()).catch(e=>{catalog=null;throw e});
 catalog.then(all=>{if(!section.isConnected)return;for(const key of profile.showcase.slice(0,3)){const g=all.find(g=>gameKey(g)===key);if(!g)continue;const link=document.createElement('a');link.href='/home.html?nova-invite='+encodeURIComponent(key);link.target='_top';link.className='profile-favorite-game';const image=document.createElement('img');image.src=g.art||'/Nova12.png';image.alt='';image.loading='lazy';image.onerror=()=>{image.onerror=null;image.src='/Nova12.png'};const name=document.createElement('span');name.textContent=g.name;link.append(image,name);section.append(link)}}).catch(()=>section.remove());
}
