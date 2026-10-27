import {NOVA_RANKS,rankBadgeSVG} from './nova-rank-core.mjs?v=20261027-rank324';
import {showRankUp} from './nova-rank-ui.mjs?v=20261027-rank324';
const host=document.getElementById('ranks');let selected;
const descriptions=['Every great climb starts somewhere. This is yours.','Your first milestone. A little grit goes a long way.','Consistency has a color. Make it silver.','You showed up. You put in the time. Now shine.','Beyond the ordinary. A sharper kind of dedication.','Pressure makes diamonds. Your playtime made this one.','A title earned through hundreds of active hours.','For the few who keep climbing when the climb gets steep.','The final crest. A legacy built one game at a time.'];
function select(rank){selected=rank;const stage=document.getElementById('spotlight');stage.style.setProperty('--rank-color',rank.color);document.getElementById('spotlight-art').innerHTML=rankBadgeSVG(rank,235);document.getElementById('spotlight-tier').textContent='RANK '+String(rank.index+1).padStart(2,'0')+' / 09';document.getElementById('spotlight-name').textContent=rank.name;document.getElementById('spotlight-description').textContent=descriptions[rank.index];document.getElementById('spotlight-elo').textContent=rank.elo.toLocaleString();document.getElementById('spotlight-reward').textContent=rank.index?rank.coins.toLocaleString()+' coins + '+rank.levels+' levels':'Your first badge';document.getElementById('spotlight-number').textContent=String(rank.index+1).padStart(2,'0');for(const card of host.children){const active=card.dataset.rank===rank.id;card.classList.toggle('selected',active);card.querySelector('button').setAttribute('aria-pressed',String(active))}if(!matchMedia('(prefers-reduced-motion:reduce)').matches)document.getElementById('spotlight-art').animate([{opacity:0,transform:'translateY(8px) scale(.94)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:350,easing:'cubic-bezier(.16,1,.3,1)'})}
function replay(rank){select(rank);showRankUp(rank);document.getElementById('status').textContent='Playing '+rank.name+' promotion preview. No rewards granted.'}
document.getElementById('replay').onclick=()=>replay(selected);
for(const rank of NOVA_RANKS){
 const card=document.createElement('article');card.className='card';card.dataset.rank=rank.id;card.style.setProperty('--rank-color',rank.color);
 const art=document.createElement('div');art.innerHTML=rankBadgeSVG(rank,82);
 const name=document.createElement('h2');name.textContent=rank.name;
 const elo=document.createElement('p');elo.textContent=rank.elo.toLocaleString()+' ELO';
 const reward=document.createElement('p');reward.textContent=rank.index?'+'+rank.coins.toLocaleString()+' coins · +'+rank.levels+' levels':'Your starting rank';
 const button=document.createElement('button');button.type='button';button.textContent='Explore rank ↗';button.setAttribute('aria-label','Preview '+rank.name+' rank-up');button.onclick=()=>replay(rank);
 card.append(art,name,elo,reward,button);host.append(card);
}

select(NOVA_RANKS[5]);
