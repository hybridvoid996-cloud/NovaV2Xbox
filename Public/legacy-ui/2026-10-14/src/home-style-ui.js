export function styleChoices(selected, choose) {
 const grid=document.createElement('div');grid.className='home-style-options';
 for(const [id,title,copy] of [['xbox','Xbox','The Nova home you know. Big covers, quick resume, and your collection.'],['os','Nova OS','Your own desktop. Glass windows, a compact dock, and everything within reach.']]){
  const card=document.createElement('button');card.type='button';card.className='home-style-choice';card.dataset.style=id;card.setAttribute('aria-pressed',String(selected===id));
  const preview=document.createElement('div');preview.className='style-preview preview-'+id;preview.setAttribute('aria-hidden','true');
  preview.innerHTML=id==='xbox'?'<div class="preview-profile">N <i></i></div><div class="preview-nav">⌂ ▤ ☁ ▦ ⌕ ♫ ▷ ♧</div><div class="preview-tiles"><b>Jump back in</b><i></i><i></i><i></i><i></i></div><div class="preview-features"><i></i><i></i><i></i></div>':'<div class="preview-recent">Continue where you left off <i></i><i></i><i></i></div><div class="preview-window"><span>Library <b>− □ ×</b></span><div><i></i><i></i><i></i><i></i><i></i><i></i></div></div><div class="preview-dock"><b>N</b><span>⌂ ▦ ▤ ☁ ⌕ ♫ ♧</span><small>12:30:45</small></div>';
  const name=document.createElement('strong');name.textContent=title;const desc=document.createElement('p');desc.textContent=copy;const action=document.createElement('span');action.className='style-select-label';action.textContent=selected===id?'Current style':'Choose '+title;
  card.append(preview,name,desc,action);card.onclick=()=>choose(id);grid.append(card);
 }
 return grid;
}
