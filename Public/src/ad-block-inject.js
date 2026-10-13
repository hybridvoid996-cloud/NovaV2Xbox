/* Remote pages cannot spawn tabs. Nova toolbar links run outside this frame. */
(()=>{
 if(window.__novaAdBlock)return;window.__novaAdBlock=true;
 const original=window.open;
 const enabled=()=>{try{return adBlockingEnabled(window.top.localStorage)}catch{return true}};
 window.open=function(url,...args){if(enabled())return {closed:true,focus(){},blur(){},close(){},postMessage(){},location:{href:'about:blank',replace(){},assign(){}},document:{open(){},write(){},close(){},body:{}}};return original.call(this,url,...args)};
 document.addEventListener('click',event=>{if(!enabled())return;const link=event.target.closest?.('a[href]');if(!link)return;if(isAdRequest(link.href)){event.preventDefault();event.stopImmediatePropagation();return;}if(link.target&&link.target.toLowerCase()!=='_self'){link.target='_self';link.removeAttribute?.('rel');}},true);
 const clean=()=>{if(!enabled())return;for(const link of document.querySelectorAll('a#goToButton[href]'))if(isAdRequest(link.href))link.closest('#modal')?.remove();for(const node of document.querySelectorAll('iframe[src],script[src],ins.adsbygoogle,#sidebarad1,#sidebarad2')){if(node.matches('ins.adsbygoogle,#sidebarad1,#sidebarad2')||isAdRequest(node.src))node.remove();}};
 let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;setTimeout(()=>{pending=false;clean()},100)}).observe(document,{childList:true,subtree:true});clean();
})();
