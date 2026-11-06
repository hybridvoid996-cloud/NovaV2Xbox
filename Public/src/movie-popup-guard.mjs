/** Applied only inside movie provider documents, including their nested players. */
export function moviePopupGuard(){
 if(window.__novaMoviePopupGuard)return;window.__novaMoviePopupGuard=true;
 const blocked=()=>({closed:true,focus(){},blur(){},close(){},postMessage(){},location:{href:'about:blank',assign(){},replace(){}},document:{open(){},write(){},close(){}}});
 try{Object.defineProperty(window,'open',{configurable:false,get:()=>blocked,set(){}})}catch{window.open=blocked}
 const protect=event=>{const path=event.composedPath?.()||[event.target];const link=path.find(node=>node?.matches?.('a[href],area[href]'));if(!link)return;const href=link.getAttribute('href')||'';if(href.startsWith('#')&&(!link.target||link.target==='_self'))return;event.preventDefault();event.stopImmediatePropagation()};
 document.addEventListener('click',protect,true);document.addEventListener('auxclick',protect,true);
 document.addEventListener('submit',event=>{const form=event.target;if(form?.target&&form.target!=='_self'){event.preventDefault();event.stopImmediatePropagation()}},true);
}
export function injectMoviePopupGuard(html){const script='<script>('+moviePopupGuard.toString()+')();</script>';return /<head\b[^>]*>/i.test(html)?html.replace(/<head\b[^>]*>/i,match=>match+script):script+html}
