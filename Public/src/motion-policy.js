/* One explicit Nova motion preference across devices and legacy styles. */
(()=>{'use strict';if(window.NovaMotion)return;const root=document.documentElement,original=new WeakMap();let queued=false;
const reduced=()=>{try{return localStorage.getItem('nova_reduce_motion')==='true'}catch{return false}};
function applyRules(rules,off){for(const rule of rules){if(rule.type===4&&rule.media){const query=original.get(rule)||rule.media.mediaText;if(/prefers-reduced-motion\s*:\s*reduce\b/i.test(query)){original.set(rule,query);rule.media.mediaText=off?query.replace(/\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/gi,'(min-width: 0px)'):'not all'}}try{if(rule.cssRules)applyRules(rule.cssRules,off)}catch{}}}
function styles(){queued=false;const off=reduced();for(const sheet of document.styleSheets){try{applyRules(sheet.cssRules,off)}catch{}}}
function schedule(){if(queued)return;queued=true;queueMicrotask(styles)}
function sync(){const off=reduced();root.classList.toggle('nova-motion-enabled',!off);root.classList.toggle('reduce-motion',off);styles();window.dispatchEvent(new CustomEvent('nova-motion-changed',{detail:{reduced:off}}))}
window.NovaMotion={get reduced(){return reduced()},sync};sync();addEventListener('storage',sync);addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.novaAction==='settingsChanged')sync()});document.addEventListener('load',e=>{if(e.target?.tagName==='LINK')schedule()},true);
new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches('style,link[rel="stylesheet"]')||n.querySelector('style,link[rel="stylesheet"]')))))schedule()}).observe(root,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',schedule,{once:true});})();
