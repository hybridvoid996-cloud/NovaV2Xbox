import {control} from './control-client.js';
const paths={views:'<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',like:'<path d="M7 10H3v11h4m0-11 5-8c3 0 3 3 2 7h5a2 2 0 0 1 2 2l-2 9H7Z"/>',dislike:'<path d="M7 14H3V3h4m0 11 5 8c3 0 3-3 2-7h5a2 2 0 0 0 2-2L19 4H7Z"/>'};
export function mountGameEngagement(host,g,{preview=false,countView=true}={}){
 host.querySelector('.nova-game-engagement')?.remove();if(!['game','cloud'].includes(g.kind||'game'))return;
 const bar=document.createElement('div');bar.className='nova-game-engagement';bar.setAttribute('aria-label','Game views and ratings');host.append(bar);let busy=false;
 const controls={};for(const [key,label]of [['views','Total game views'],['like','Like this game'],['dislike','Dislike this game']]){const node=document.createElement(key==='views'?'span':'button');node.title=label;node.setAttribute('aria-label',label);node.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[key]+'</svg><span>—</span>';if(key!=='views'){node.type='button';node.onclick=()=>request(key);node.disabled=preview;}bar.append(node);controls[key]=node;}
 const paint=data=>{for(const [key,field]of [['views','views'],['like','likes'],['dislike','dislikes']]){controls[key].querySelector('span').textContent=Number(data[field]||0).toLocaleString();if(key!=='views')controls[key].setAttribute('aria-pressed',String(data.choice===key));}bar.title='Total game openings, including repeat visits';};
 async function request(event){if(busy||!bar.isConnected)return;busy=true;for(const k of ['like','dislike'])controls[k].disabled=true;try{paint(await control('gameEngagement',{kind:g.kind||'game',id:String(g.id),event}));}catch(e){bar.title=e.message;}finally{busy=false;for(const k of ['like','dislike'])controls[k].disabled=preview;}}
 if(preview){paint({views:0,likes:0,dislikes:0});bar.title='Preview · no views or votes are recorded';return;}
 request(countView?'view':'read');const timer=setInterval(()=>{if(!bar.isConnected){clearInterval(timer);return;}if(!document.hidden)request('read');},30000);addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
