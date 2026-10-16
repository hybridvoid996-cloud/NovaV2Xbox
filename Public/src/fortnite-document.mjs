/* Keep the existing Window/Document realm when mounting the native game. */
export async function mountFortniteDocument(html,doc=document){
 const parsed=new DOMParser().parseFromString(html,'text/html');
 if(!parsed.querySelector('canvas#fnweb-canvas'))throw Error('Fortnite returned an incomplete game page. Please retry.');
 // document.open/write replaces the document's JavaScript realm in nested
 // frames, leaving wasm-bindgen's native canvas instanceof check mismatched.
 // innerHTML preserves the current document; scripts are activated in order.
 doc.documentElement.innerHTML=parsed.documentElement.innerHTML;
 const canvas=doc.getElementById('fnweb-canvas');
 if(!(canvas instanceof doc.defaultView.HTMLCanvasElement))throw Error('Fortnite’s canvas could not initialize. Please restart the game.');
 for(const placeholder of [...doc.querySelectorAll('script')]){
  const type=(placeholder.getAttribute('type')||'').toLowerCase();
  if(type&&!['module','text/javascript','application/javascript'].includes(type))continue;
  const script=doc.createElement('script');for(const {name,value}of placeholder.attributes)script.setAttribute(name,value);
  script.textContent=placeholder.textContent;
  let loaded;if(script.src){script.async=false;loaded=new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(Error('A Fortnite startup script could not load. Please retry.'))})}
  placeholder.replaceWith(script);if(loaded)await loaded;
 }
}
