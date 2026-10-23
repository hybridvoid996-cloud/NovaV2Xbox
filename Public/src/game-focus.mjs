// Focus only after the player interacts with a game; loading alone must not
// steal keyboard input from Nova's other windows.
export function attachGameFocus(frame,{signal}={}){
 const documents=new WeakSet(),stops=[];
 const attach=()=>{let doc;try{doc=frame.contentDocument}catch{return}if(!doc||documents.has(doc))return;documents.add(doc);
  if(doc.head&&!doc.getElementById('nova-game-input-overlays')){const style=doc.createElement('style');style.id='nova-game-input-overlays';style.textContent='#sidebarad1,#sidebarad2{pointer-events:none!important}#sidebarad1>*,#sidebarad2>*{pointer-events:auto}';doc.head.appendChild(style)}
  const onPointerDown=event=>{if(!event.isTrusted||event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return;try{
   if(!doc.hasFocus()){frame.focus({preventScroll:true});frame.contentWindow?.focus()}
   const canvas=event.target?.closest?.('canvas');
   if(canvas&&doc.activeElement!==canvas){if(!canvas.hasAttribute('tabindex'))canvas.tabIndex=0;canvas.focus({preventScroll:true})}
  }catch{}};
  doc.addEventListener('pointerdown',onPointerDown,true);stops.push(()=>doc.removeEventListener('pointerdown',onPointerDown,true));
 };
 const stop=()=>{frame.removeEventListener('load',attach);for(const remove of stops.splice(0))remove();signal?.removeEventListener('abort',stop)};
 if(signal?.aborted)return stop;
 frame.addEventListener('load',attach);signal?.addEventListener('abort',stop,{once:true});attach();return stop;
}
