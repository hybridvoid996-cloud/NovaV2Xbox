// Focus only after the player interacts with a game; loading alone must not
// steal keyboard input from Nova's other windows.
export function attachGameFocus(frame,{signal}={}){
 const documents=new WeakSet(),stops=[];
 const attach=()=>{let doc;try{doc=frame.contentDocument}catch{return}if(!doc||documents.has(doc))return;documents.add(doc);
  const onPointerDown=event=>{if(!event.isTrusted||doc.hasFocus()||event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return;try{frame.focus({preventScroll:true});frame.contentWindow?.focus()}catch{}};
  doc.addEventListener('pointerdown',onPointerDown,true);stops.push(()=>doc.removeEventListener('pointerdown',onPointerDown,true));
 };
 const stop=()=>{frame.removeEventListener('load',attach);for(const remove of stops.splice(0))remove();signal?.removeEventListener('abort',stop)};
 if(signal?.aborted)return stop;
 frame.addEventListener('load',attach);signal?.addEventListener('abort',stop,{once:true});attach();return stop;
}
