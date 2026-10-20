export function mountOwnerGameReview(panel,frame,{control,launch=game=>window.NovaRecent?.launch({...game,kind:'game',_kind:'library'})}){
 const tools=document.createElement('div');tools.className='owner-review-tools';tools.hidden=true;
 const name=document.createElement('strong'),buttons=document.createElement('div'),status=document.createElement('p'),next=document.createElement('button');status.setAttribute('role','status');next.textContent='Next game →';next.className='owner-review-next';
 const noteLabel=document.createElement('label'),note=document.createElement('textarea'),saveNote=document.createElement('button');noteLabel.textContent='Public note';note.maxLength=300;note.rows=2;note.placeholder='Add a note about this game…';note.setAttribute('aria-label','Public game status note');noteLabel.append(note);saveNote.type='button';saveNote.textContent='Save note';
 tools.append(name,buttons,noteLabel,saveNote,next,status);panel.insertBefore(tools,frame);
 let games=[],active,records={},busy=false,generation=0;
 const all=[saveNote],drafts=new Map();let noteGame='';note.oninput=()=>{if(active)drafts.set(String(active.id),note.value)};saveNote.onclick=()=>save(records[active?.id]?.status||'unchecked','Note');
 const paint=()=>{tools.hidden=!active;panel.classList.toggle('has-game-review',!!active);if(!active)return;name.textContent=active.name;if(noteGame!==String(active.id)){noteGame=String(active.id);note.value=drafts.get(noteGame)??records[active.id]?.note??''}note.disabled=busy;for(const b of all)b.disabled=busy;next.disabled=busy||games.findIndex(g=>String(g.id)===String(active.id))===games.length-1;for(const b of buttons.children)b.setAttribute('aria-pressed',String(b.dataset.status===(records[active.id]?.status||'unchecked')))};
 for(const [value,label]of [['working','Working'],['issues','Issues'],['unchecked','Not checked']]){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.status=value;all.push(button);buttons.append(button);
  button.onclick=()=>save(value,label);
 }
 async function save(value,label){if(!active||busy)return;const game=active;busy=true;status.textContent='Saving…';paint();try{const result=await control('setGameStatus',{id:String(game.id),status:value,note:note.value});records[game.id]=result.record;drafts.delete(String(game.id));note.value=result.record.note||'';status.textContent=label+' saved';frame.contentWindow?.postMessage({novaAction:'ownerGameStatusSaved',id:String(game.id),record:result.record},location.origin)}catch(error){status.textContent=error.message}finally{busy=false;paint()}}

 all.push(next);next.type='button';next.onclick=()=>{if(busy||!active)return;const game=games[games.findIndex(g=>String(g.id)===String(active.id))+1];if(!game)return;active=game;status.textContent='';paint();launch(game)};
 const receive=async event=>{if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.novaAction!=='ownerCheckGame'||busy)return;const token=++generation;try{const [response,result]=await Promise.all([fetch('/library-games.json'),control('gameStatuses')]);if(!response.ok)throw Error('Game list unavailable');const list=await response.json();if(token!==generation)return;games=list.sort((a,b)=>a.name.localeCompare(b.name));active=games.find(g=>String(g.id)===String(event.data.id));records=result.statuses||{};status.textContent='';paint()}catch(error){status.textContent=error.message}};
 addEventListener('message',receive);
 return ()=>{generation++;removeEventListener('message',receive);tools.remove()};
}
