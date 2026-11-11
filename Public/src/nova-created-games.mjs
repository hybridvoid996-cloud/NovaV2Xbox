// "Nova Created Games": games built by Nova itself. They open directly as Nova
// pages (no proxy, no third-party game file) and are shown at the top of Games.
export const NOVA_CREATED_GAMES=[
 {id:'nova-flip',page:'novaflip',name:'Nova Flip',art:'content/covers/nova-flip.svg',
  tagline:'Match colors, stack draws, swap hands and call UNO! before anyone catches you.',
  tags:['Card game','2–4 players','Play online'],reward:'Win 1,000+ Nova Coins',accent:'#ff4b6e'}
];

let styled=false;
function style(){if(styled)return;styled=true;const l=document.createElement('link');l.rel='stylesheet';l.href='/src/nova-created-games.css?v=1';document.head.append(l)}
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
const STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 14.6 9.4 21.5 12l-6.9 2.6L12 21.5l-2.6-6.9L2.5 12l6.9-2.6Z"/></svg>';

// Returns the section to place at the top of the Games grid, or null when nothing matches.
export function novaCreatedSection({query='',onLaunch}={}){
 const q=query.trim().toLowerCase();
 const games=NOVA_CREATED_GAMES.filter(g=>!q||g.name.toLowerCase().includes(q)||g.tags.some(t=>t.toLowerCase().includes(q)));
 if(!games.length)return null;
 style();
 const section=el('section','nova-created');section.setAttribute('aria-label','Nova Created Games');
 const head=el('header','nova-created-head'),badge=el('span','nova-created-badge');
 badge.innerHTML=STAR;badge.append(document.createTextNode('NOVA CREATED GAMES'));
 head.append(badge,el('p','nova-created-sub','Original games made by Nova. They run right inside Nova, with no proxy.'));
 const row=el('div','nova-created-row');
 for(const g of games){
  const card=el('button','nova-created-card');card.type='button';card.style.setProperty('--accent',g.accent);card.setAttribute('aria-label','Play '+g.name+', a Nova created game');
  const art=el('span','nova-created-art'),img=el('img');img.src=g.art;img.alt='';img.width=220;img.height=220;img.decoding='async';art.append(img);
  const info=el('span','nova-created-info'),tags=el('span','nova-created-tags');
  for(const t of g.tags)tags.append(el('span',null,t));
  const play=el('span','nova-created-play');play.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7Z"/></svg>';play.append(document.createTextNode('Play'));
  const reward=el('span','nova-created-reward');reward.innerHTML='<i></i>';reward.append(document.createTextNode(g.reward));
  const origin=el('span','nova-created-origin');origin.innerHTML=STAR;origin.append(document.createTextNode('Made by Nova'));
  info.append(origin,el('strong',null,g.name),el('span','nova-created-tagline',g.tagline),tags,el('span','nova-created-actions'));
  info.lastChild.append(play,reward);
  card.append(art,info,el('span','nova-created-glare'));
  card.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;card.style.setProperty('--rx',((.5-y)*6).toFixed(2)+'deg');card.style.setProperty('--ry',((x-.5)*8).toFixed(2)+'deg');card.style.setProperty('--gx',x*100+'%');card.style.setProperty('--gy',y*100+'%')});
  card.addEventListener('pointerleave',()=>{card.style.setProperty('--rx','0deg');card.style.setProperty('--ry','0deg')});
  card.onclick=()=>onLaunch?.(g);
  row.append(card);
 }
 section.append(head,row);
 return section;
}
