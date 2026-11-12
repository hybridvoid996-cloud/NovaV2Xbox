import {control} from './control-client.js';
const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!=null)n.textContent=text;return n};
const ago=t=>{const s=Math.max(0,(Date.now()-t)/1000);if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';if(s<604800)return Math.floor(s/86400)+'d ago';return new Date(t).toLocaleDateString()};
const VOTES={W:'Win',F:'Fair',L:'Loss'};
export function mountTradeFeed(host,ctx){
 const send=(action,body)=>ctx.shopRequest?ctx.shopRequest(action,body):control(action,body);
 const section=el('section','trade-community');
 section.innerHTML='<div class="trade-community-heading"><div><small>THE NOVA EXCHANGE</small><h3>Community trades</h3><p>Every completed swap, live. Rate it from the sender’s side: <b class="tv-W">W</b> win · <b class="tv-F">F</b> fair · <b class="tv-L">L</b> loss.</p></div><button class="trade-feed-refresh" type="button">↻ Refresh</button></div><div class="trade-feed-status" role="status"></div><div class="trade-community-grid"></div><button class="trade-feed-more" type="button" hidden>Show more trades</button>';
 host.append(section);
 const grid=section.querySelector('.trade-community-grid'),status=section.querySelector('.trade-feed-status'),more=section.querySelector('.trade-feed-more');
 let rows=[],limit=8,signature='',refreshing=false,visible=true;const voting=new Set();
 function avatar(p){const host=el('span','trade-feed-avatar');const letter=()=>host.append(el('span','',(p.name||'N')[0]));if(p.photo){const img=el('img');img.src=p.photo;img.alt='';img.loading='lazy';img.decoding='async';img.onerror=()=>{img.remove();letter()};host.append(img)}else letter();const decoration=ctx.state.assets.find(a=>a.id===p.decoration&&a.kind==='decoration');if(decoration){const img=el('img','trade-feed-decoration');img.src=decoration.thumbnail||decoration.src;img.alt='';img.loading='lazy';host.append(img)}return host}
 function offer(value,title,side){
  const box=el('div','trade-feed-offer side-'+side);box.append(el('small','',title));
  const items=el('div','trade-feed-items');
  if(value.coins){const c=el('div','trade-feed-coins');c.append(el('i','','N'),el('b','',Number(value.coins).toLocaleString()),el('span','','coins'));box.append(c)}
  for(const [id,count]of Object.entries(value.items||{})){const item=ctx.state.assets.find(a=>a.id===id),row=el('div','trade-feed-item r-'+(item?.rarity||'common')),image=el('img');image.src=item?.thumbnail||item?.src||'/Nova12.png';image.alt='';image.loading='lazy';image.decoding='async';row.title=(item?.name||'Cosmetic')+' ×'+count;row.append(image,el('span','',item?.name||'Cosmetic'));if(count>1)row.append(el('em','','×'+count));items.append(row);if(item){row.onpointerenter=()=>image.src=item.src;row.onpointerleave=()=>image.src=item.thumbnail||item.src}}
  if(items.children.length)box.append(items);
  if(!value.coins&&!Object.keys(value.items||{}).length)box.append(el('p','trade-empty','Nothing · a gift'));
  return box}
 function draw(){
  grid.replaceChildren();
  for(const row of rows.slice(0,limit)){
   const card=el('article','trade-feed-card');card.dataset.tradeId=row.id;
   const people=el('div','trade-feed-people');
   const person=(p,label)=>{const n=el('div','trade-feed-person'),copy=el('span');copy.append(el('small','',label),el('strong','',p.name));n.append(avatar(p),copy);return n};
   people.append(person(row.sender,'SENDER'),el('span','trade-feed-swap','⇄'),person(row.recipient,'RECEIVER'));
   const date=el('time','trade-feed-time',ago(row.at));date.dateTime=new Date(row.at).toISOString();date.title=new Date(row.at).toLocaleString();
   const top=el('div','trade-feed-top');top.append(people,date);card.append(top);
   const offers=el('div','trade-offer-grid');offers.append(offer(row.give,row.sender.name+' gave','give'),offer(row.want,row.sender.name+' got','want'));card.append(offers);
   const footer=el('div','trade-feed-footer'),votes=el('div','trade-feed-votes'),bar=el('div','trade-vote-bar'),message=el('small','trade-vote-status');message.setAttribute('role','status');
   const buttons=[];const total=el('span','trade-vote-total');
   function paintVotes(){const n=['W','F','L'].reduce((s,k)=>s+(row.counts?.[k]||0),0);
    for(const [choice,b]of buttons){b.replaceChildren(el('b','',choice),el('span','',String(row.counts?.[choice]||0)));b.setAttribute('aria-pressed',String(row.vote===choice));b.setAttribute('aria-label',VOTES[choice]+': '+(row.counts?.[choice]||0)+' votes');b.disabled=voting.has(row.id)}
    bar.replaceChildren(...['W','F','L'].map(k=>{const i=el('i','tv-'+k);i.style.flexGrow=String(row.counts?.[k]||0);return i}));bar.classList.toggle('empty',!n);
    total.textContent=n+' '+(n===1?'vote':'votes')}
   for(const choice of ['W','F','L']){const b=el('button','trade-vote vote-'+choice);b.type='button';b.onclick=async()=>{if(voting.has(row.id))return;voting.add(row.id);paintVotes();message.textContent='Saving vote…';try{const result=await send('storeTrade',{op:'vote',id:row.id,choice});row.counts=result.counts;row.vote=result.vote;signature='';message.textContent='Vote saved'}catch(e){message.textContent=e.message}finally{voting.delete(row.id);paintVotes()}};buttons.push([choice,b]);votes.append(b)}
   paintVotes();footer.append(votes,total);card.append(bar,footer,message);grid.append(card)}
  more.hidden=limit>=rows.length;
  if(!rows.length)grid.append(el('p','trade-empty','No completed trades yet. The next completed swap will appear here.'))}
 async function refresh(){if(refreshing||voting.size)return;refreshing=true;status.textContent=rows.length?'':'Loading completed trades…';try{const result=await send('storeTrade',{op:'feed'}),next=JSON.stringify(result.feed);if(signature!==next){rows=result.feed||[];signature=next;draw()}status.textContent=''}catch(e){status.textContent=e.message}finally{refreshing=false}}
 section.querySelector('.trade-feed-refresh').onclick=refresh;more.onclick=()=>{limit+=8;draw()};
 const observer=new IntersectionObserver(([entry])=>visible=entry.isIntersecting,{rootMargin:'150px'});observer.observe(section);
 const timer=setInterval(()=>{if(visible&&!document.hidden)void refresh()},20000);addEventListener('pagehide',()=>{clearInterval(timer);observer.disconnect()},{once:true});
 void refresh();return {refresh};
}
