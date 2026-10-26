/* Unity keeps the same logical viewport; cap physical pixels instead of scaling its UI. */
(()=>{
 const ratio=()=>Math.min(window.devicePixelRatio||1,1,1280/Math.max(1,innerWidth),720/Math.max(1,innerHeight));
 const attached=new WeakSet();window.NovaUnityRenderBudget={ratio,bind(module){if(!module||attached.has(module))return;attached.add(module);let timer;const update=()=>{module.devicePixelRatio=ratio()};const schedule=()=>{clearTimeout(timer);timer=setTimeout(update,100)};update();addEventListener('resize',schedule);addEventListener('pagehide',()=>{clearTimeout(timer);removeEventListener('resize',schedule)},{once:true})}};
 // This trusted local launcher previously ran in Nova's virtual content origin.
 // Reuse its Unity save database instead of creating an empty native-origin save.
 try{if(location.hostname==='nova-content.invalid')return;const original=indexedDB.open.bind(indexedDB);indexedDB.open=(name,...args)=>original(/^\/idbfs(?:$|\/)|^UnityCache$/.test(String(name))?'https://nova-content.invalid@'+name:name,...args)}catch{}
})();
