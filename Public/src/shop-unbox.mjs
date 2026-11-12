// Nova unboxing: a horizontal reel that lands on the best reward, then a clean reward grid.
// Used by the Shop (crate openings) and by Home (opening a gift). Works without the Shop ctx.
const RARITIES=['common','uncommon','epic','legendary','mythic','singularity'];
const label=r=>r?r[0].toUpperCase()+r.slice(1):'';
const kindName={decoration:'Avatar decoration',effect:'Profile effect',banner:'Chat banner'};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
const reduced=()=>{try{return !!(globalThis.NovaMotion?.reduced??localStorage.getItem('nova_reduce_motion')==='true')}catch{return false}};
const rank=item=>RARITIES.indexOf(item?.rarity);
const art=item=>{const img=el('img');img.src=item.thumbnail||item.src;img.alt='';img.decoding='async';img.draggable=false;return img};

function overlay(title){
 const d=el('dialog','nova-unbox');d.setAttribute('aria-label',title);
 document.body.append(d);d.addEventListener('close',()=>d.remove());d.showModal();return d;
}

// Filler tiles lean toward common items, with an occasional rare teaser, like a real roll.
function filler(pool,count){
 const out=[],weights={common:56,uncommon:26,epic:11,legendary:5,mythic:1.6,singularity:.4};
 const byRarity=Object.fromEntries(RARITIES.map(r=>[r,pool.filter(a=>a.rarity===r)]));
 for(let i=0;i<count;i++){let roll=Math.random()*100,pick='common';for(const r of RARITIES){roll-=weights[r];if(roll<0){pick=r;break}}
  const list=byRarity[pick].length?byRarity[pick]:pool;out.push(list[Math.floor(Math.random()*list.length)])}
 return out;
}

function reel(stage,winner,pool,{onDone}){
 const WIN_AT=36,COUNT=44;
 const frame=el('div','unbox-reel'),strip=el('div','unbox-strip'),marker=el('div','unbox-marker');
 const tiles=filler(pool.length?pool:[winner],pool.length?COUNT:WIN_AT+1);tiles[WIN_AT]=winner;
 for(const item of tiles){const t=el('div','unbox-tile rarity-'+item.rarity);t.append(art(item),el('b','',item.name),el('i'));strip.append(t)}
 frame.append(strip,marker);stage.append(frame);
 let done=false;const finish=()=>{if(done)return;done=true;anim?.cancel();strip.style.transform=`translateX(${end}px)`;strip.children[WIN_AT].classList.add('is-winner');onDone()};
 // Land inside the winning tile at a random spot so it does not always stop dead centre.
 const first=strip.children[0],tile=first.offsetWidth,step=strip.children[1].offsetLeft-first.offsetLeft;
 const end=-(first.offsetLeft+WIN_AT*step+tile*(.2+Math.random()*.6))+frame.clientWidth/2;
 let anim=null;
 if(reduced()||!pool.length){finish();return finish}
 anim=strip.animate([{transform:'translateX(0)'},{transform:`translateX(${end}px)`}],{duration:5200,easing:'cubic-bezier(.08,.72,.12,1)',fill:'forwards'});
 anim.finished.then(finish,()=>{});
 return finish;
}

function resultCard(item,{onEquip,onPreview,featured}){
 const card=el('article','unbox-card rarity-'+item.rarity+(featured?' is-featured':''));
 const pic=el('div','unbox-card-art');pic.append(art(item));
 const copy=el('div','unbox-card-copy');copy.append(el('small','unbox-rarity',label(item.rarity)),el('h3','',item.name),el('span','unbox-kind',kindName[item.kind]||item.kind));
 const actions=el('div','unbox-card-actions');
 if(onEquip){const b=el('button','unbox-equip','Equip');b.type='button';b.onclick=async()=>{b.disabled=true;try{await onEquip(item);b.textContent='Equipped'}catch(e){b.disabled=false;b.textContent='Retry';b.title=e.message}};actions.append(b)}
 if(onPreview){const b=el('button','unbox-preview','Preview');b.type='button';b.onclick=()=>onPreview(item);actions.append(b)}
 card.append(pic,copy,actions);return card;
}

/**
 * Shows the reel then the rewards. items: cosmetics won. pool: cosmetics the reel can show.
 * Options: title, subtitle, onEquip(item), onPreview(item). Resolves when the window closes.
 */
export function unboxReveal(items,{pool=[],title='Your rewards',subtitle='',onEquip,onPreview}={}){
 return new Promise(resolve=>{
  if(!items?.length){resolve();return}
  const sorted=[...items].sort((a,b)=>rank(b)-rank(a)),best=sorted[0];
  const d=overlay(title);d.classList.add('rarity-'+best.rarity);d.addEventListener('close',()=>resolve(),{once:true});
  const head=el('header','unbox-head'),close=el('button','unbox-close','×');close.type='button';close.setAttribute('aria-label','Close');close.onclick=()=>d.close();
  head.append(el('div','',''),close);head.firstChild.append(el('small','unbox-eyebrow',subtitle||'UNBOXING'),el('h2','',title));
  const stage=el('div','unbox-stage'),skip=el('button','unbox-skip','Skip');skip.type='button';
  d.append(head,stage,skip);
  const finish=reel(stage,best,pool,{onDone(){
   skip.remove();d.classList.add('is-revealed');
   const results=el('div','unbox-results'),summary=el('p','unbox-summary',items.length===1?'You got 1 item':'You got '+items.length+' items');
   const counts=RARITIES.slice().reverse().map(r=>[r,items.filter(i=>i.rarity===r).length]).filter(([,n])=>n);
   const chips=el('div','unbox-chips');for(const [r,n]of counts)chips.append(el('span','rarity-'+r,n+' '+label(r)));
   results.append(summary,chips,resultCard(best,{onEquip,onPreview,featured:true}));
   if(sorted.length>1){const grid=el('div','unbox-grid');sorted.slice(1).forEach((item,i)=>{const c=resultCard(item,{onEquip,onPreview});c.style.setProperty('--i',Math.min(i,20));grid.append(c)});results.append(grid)}
   const done=el('button','unbox-done','Done');done.type='button';done.onclick=()=>d.close();results.append(done);
   stage.after(results);
   if(rank(best)>=3&&!reduced()){const flash=el('div','unbox-flash');d.append(flash);setTimeout(()=>flash.remove(),900)}
  }});
  skip.onclick=finish;
 });
}

const GIFT_SVG=`<svg viewBox="0 0 240 220" aria-hidden="true"><defs>
<linearGradient id="ng-box" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2a2d36"/><stop offset="1" stop-color="#121318"/></linearGradient>
<linearGradient id="ng-side" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#1c1e25"/><stop offset="1" stop-color="#0b0c10"/></linearGradient>
<linearGradient id="ng-ribbon" x1="0" y1="0" x2="1" y2="1"><stop stop-color="var(--gift-a,#9ad7ff)"/><stop offset=".55" stop-color="var(--gift-b,#b48cff)"/><stop offset="1" stop-color="var(--gift-c,#ff8fd0)"/></linearGradient>
<radialGradient id="ng-glow"><stop stop-color="var(--gift-b,#b48cff)" stop-opacity=".55"/><stop offset="1" stop-color="var(--gift-b,#b48cff)" stop-opacity="0"/></radialGradient></defs>
<ellipse class="gift-glow" cx="120" cy="140" rx="115" ry="80" fill="url(#ng-glow)"/>
<ellipse cx="120" cy="205" rx="78" ry="9" fill="#000" opacity=".45"/>
<g class="gift-body"><path d="M52 104h136v92a8 8 0 0 1-8 8H60a8 8 0 0 1-8-8Z" fill="url(#ng-box)" stroke="#ffffff22"/><path d="M108 104h24v100h-24Z" fill="url(#ng-ribbon)"/><path d="M52 104h136v10H52Z" fill="#000" opacity=".35"/></g>
<g class="gift-lid"><path d="M44 82h152a6 6 0 0 1 6 6v16a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6V88a6 6 0 0 1 6-6Z" fill="url(#ng-side)" stroke="#ffffff30"/><path d="M106 82h28v28h-28Z" fill="url(#ng-ribbon)"/>
<path d="M120 82c-14-26-50-38-54-18-3 15 30 20 54 18Z" fill="url(#ng-ribbon)" stroke="#ffffff55"/><path d="M120 82c14-26 50-38 54-18 3 15-30 20-54 18Z" fill="url(#ng-ribbon)" stroke="#ffffff55"/><circle cx="120" cy="81" r="9" fill="url(#ng-ribbon)" stroke="#ffffff77"/></g>
<g class="gift-sparks" fill="#fff"><path d="m34 50 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/><path d="m206 40 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/><path d="m196 150 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></g></svg>`;

/** Home gift popup: shows the wrapped gift, who sent it and their note, then opens it. */
export function giftIntro(gift,{open,onEquip,onPreview,pool=[]}){
 return new Promise(resolve=>{
  const d=overlay('You received a gift');d.classList.add('nova-gift');let opening=false;d.addEventListener('close',()=>{if(!opening)resolve()},{once:true});
  const box=el('div','gift-box');box.innerHTML=GIFT_SVG;
  const title=el('h2','gift-title','You received a gift!'),from=el('p','gift-from');from.append('from ',el('b','',gift.fromName||'A Nova player'));
  const what=el('p','gift-what',gift.type==='crate'?gift.label:'A cosmetic for your profile');
  const note=gift.note?el('blockquote','gift-note',gift.note):null;if(note)note.append(el('cite','','— '+(gift.fromName||'A Nova player')));
  const error=el('p','gift-error');error.setAttribute('role','alert');
  const button=el('button','gift-open','Open');button.type='button';
  const later=el('button','gift-later','Later');later.type='button';later.onclick=()=>d.close();
  const row=el('div','gift-actions');row.append(button,later);
  const copy=el('div','gift-copy');copy.append(title,from,what);if(note)copy.append(note);copy.append(error,row);
  d.append(box,copy);
  button.onclick=async()=>{opening=true;button.disabled=true;later.disabled=true;error.textContent='';button.textContent='Opening…';box.classList.add('is-shaking');
   try{const opened=await open(gift);box.classList.remove('is-shaking');box.classList.add('is-open');
    await new Promise(r=>setTimeout(r,reduced()?0:750));d.close();
    await unboxReveal(opened.items||[],{pool,title:gift.type==='crate'?'Gift from '+(gift.fromName||'a friend'):'A gift from '+(gift.fromName||'a friend'),subtitle:gift.label?.toUpperCase(),onEquip,onPreview});resolve();
   }catch(e){opening=false;box.classList.remove('is-shaking');error.textContent=e.message;button.disabled=false;later.disabled=false;button.textContent='Try again'}};
 });
}
