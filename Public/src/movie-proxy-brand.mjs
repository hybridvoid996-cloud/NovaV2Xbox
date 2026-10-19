import {novaMovieLogo} from './movie-logo.mjs';
import {movieCinemaCSS} from './movie-cinema-theme.mjs?v=20261018-cinema169';
function movieRuntime(config){
 let volume=1;
 const send=action=>parent.postMessage({novaAction:action,token:config.session},'*');
 function brand(){if(!document.body)return;if(!document.getElementById('nova-cinema-theme')){const style=document.createElement('style');style.id='nova-cinema-theme';style.textContent=config.css;document.head.append(style)}for(const link of document.querySelectorAll('header button,header a,nav button,nav a')){if(link.dataset.novaBrand||!/^(?:fx)?framextv$/i.test(link.textContent.replace(/\s/g,'')))continue;link.dataset.novaBrand='true';const logo=document.createElement('img');logo.src=config.logo;logo.alt='Nova';const name=document.createElement('span');name.textContent='Nova Movies';link.replaceChildren(logo,name)}
 const hero=document.querySelector('div[class*="select-none"][class*="min-h-"]:has(img)');if(hero)hero.dataset.novaCinemaHero='';
 if(!document.getElementById('nova-cinema-profile')&&config.profile){const button=document.createElement('button');button.id='nova-cinema-profile';button.type='button';button.setAttribute('aria-label','Your Nova profile');const img=document.createElement('img');img.alt='';img.src=/^(https?:|data:image\/)/.test(config.profile.photo||'')?config.profile.photo:config.logo;const name=document.createElement('span');name.textContent=config.profile.name||'Nova player';button.append(img,name);button.onclick=()=>send('novaMovieProfile');document.body.append(button)}
 const profile=document.getElementById('nova-cinema-profile');if(profile)profile.hidden=/\/(watch|embed)(?:\/|$)/.test(location.pathname);
 document.title=document.title.replace(/frameXTV/gi,'Nova Movies');if(document.querySelector('video,iframe,header,nav,main button'))send('novaMovieReady')}
 function audio(){document.querySelectorAll('video,audio').forEach(m=>{m.volume=volume});document.querySelectorAll('iframe').forEach(f=>f.contentWindow?.postMessage({novaAction:'novaMovieVolume',volume},'*'))}
 addEventListener('message',e=>{if(e.source!==parent||e.data?.novaAction!=='novaMovieVolume'||!Number.isFinite(e.data.volume))return;volume=Math.max(0,Math.min(1,e.data.volume));audio()});document.addEventListener('play',audio,true);
 brand();setInterval(()=>{brand();audio()},1500);
}
export async function brandMovieResponse(response,target={}){
 if(response.status!==200||!response.headers.some(([k,v])=>k.toLowerCase()==='content-type'&&v.includes('text/html')))return response;
 const body=typeof response.body==='string'?response.body:await new Response(response.body).text();
 const config=JSON.stringify({logo:novaMovieLogo,css:movieCinemaCSS,session:target.session||'',profile:{name:String(target.profile?.name||'Nova player').slice(0,80),photo:String(target.profile?.photo||'').slice(0,200000)}}).replace(/</g,'\\u003c');
 const script='<script>('+movieRuntime.toString()+')('+config+');</script>';
 return {...response,body:body+script,headers:response.headers.filter(([k])=>!['content-length','content-encoding'].includes(k.toLowerCase()))};
}
