export function reorderDestination(tracks,movingId,targetId,after=false){
 const others=tracks.filter(t=>t.id!==movingId);const index=others.findIndex(t=>t.id===targetId);if(index<0||!tracks.some(t=>t.id===movingId)||movingId===targetId)return undefined;return others[index+(after?1:0)]?.id??null;
}
export function enableSongReorder(list,{tracks,onMove}){
 let moving=null,marked=null;
 const clear=()=>{marked?.classList.remove('nmc-drop-before','nmc-drop-after');marked=null};
 for(const row of list.children){const id=row.dataset.trackId,handle=row.querySelector('.nmc-track-index');if(!handle)continue;
 row.draggable=true;row.classList.add('nmc-reorderable');handle.tabIndex=0;handle.setAttribute('role','button');handle.setAttribute('aria-label','Move '+(tracks.find(t=>t.id===id)?.title||'song')+'. Drag or use Alt and arrow keys.');handle.title='Drag to reorder · Alt + ↑ / ↓';
 for(const image of row.querySelectorAll('img'))image.draggable=false;
 handle.style.touchAction='none';
 handle.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();moving=id;handle.setPointerCapture(event.pointerId);row.classList.add('nmc-dragging')};
 handle.onpointermove=event=>{if(moving!==id)return;const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.nmc-track-row');clear();if(!target||target===row||!list.contains(target))return;marked=target;const r=target.getBoundingClientRect();target.classList.add(event.clientY>r.top+r.height/2?'nmc-drop-after':'nmc-drop-before')};
 handle.onpointerup=event=>{if(moving!==id)return;const target=marked,before=target?reorderDestination(tracks,id,target.dataset.trackId,target.classList.contains('nmc-drop-after')):undefined;moving=null;clear();row.classList.remove('nmc-dragging');if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);if(before!==undefined)onMove(id,before)};
 handle.onpointercancel=()=>{moving=null;clear();row.classList.remove('nmc-dragging')};
 handle.onkeydown=event=>{if(!event.altKey||!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const at=tracks.findIndex(t=>t.id===id),target=tracks[at+(event.key==='ArrowUp'?-1:1)];if(target)onMove(id,reorderDestination(tracks,id,target.id,event.key==='ArrowDown'))};
 row.ondragstart=event=>{if(event.target.closest('button,input,a,select')){event.preventDefault();return}moving=id;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-nova-song',id);row.classList.add('nmc-dragging')};
 row.ondragover=event=>{if(!moving||moving===id)return;event.preventDefault();event.dataTransfer.dropEffect='move';clear();marked=row;const after=event.clientY>row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;row.classList.add(after?'nmc-drop-after':'nmc-drop-before')};
 row.ondrop=event=>{if(!moving||moving===id)return;event.preventDefault();const before=reorderDestination(tracks,moving,id,row.classList.contains('nmc-drop-after'));const from=moving;moving=null;clear();list.querySelector('.nmc-dragging')?.classList.remove('nmc-dragging');if(before!==undefined)onMove(from,before)};
 row.ondragend=()=>{moving=null;clear();row.classList.remove('nmc-dragging')};
 }
}
