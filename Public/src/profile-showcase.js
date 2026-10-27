import {mountRankProfile} from './nova-rank-ui.mjs?v=20261027-profile329';
import {gameKey} from './os-feature-core.mjs';
let catalog;
export function profileShowcase(host,profile){
 mountRankProfile(host,{uid:profile.uid||profile.key});
 if(!Array.isArray(profile.showcase)||!profile.showcase.length)return;
 const section=document.createElement('section');section.className='nova-favorites';const title=document.createElement('h4');title.textContent='FAVORITE GAMES';section.append(title);host.append(section);
 catalog??=Promise.all(['games','cloud'].map(async kind=>{const r=await fetch('/library-'+kind+'.json');if(!r.ok)throw Error();return(await r.json()).map(g=>({...g,kind:kind==='games'?'game':'cloud'}))})).then(rows=>rows.flat()).catch(e=>{catalog=null;throw e});
 catalog.then(all=>{if(!section.isConnected)return;for(const key of profile.showcase.slice(0,3)){const g=all.find(g=>gameKey(g)===key);if(!g)continue;const link=document.createElement('a');link.href='/home.html?nova-invite='+encodeURIComponent(key);link.target='_top';link.textContent=g.name;link.style.cssText='display:block;color:inherit;padding:7px 0;text-decoration:none';section.append(link)}}).catch(()=>section.remove());
}
