(()=>{
 const script=document.currentScript,origin=new URL(script.src).origin,frame=document.getElementById('nova-blank-frame');
 const update=()=>{try{const store=frame.contentWindow.localStorage;document.title=store.getItem('nova_cloak_title')||'Home - Google Classroom';const value=store.getItem('nova_cloak_icon')||'https://ssl.gstatic.com/classroom/favicon.png',url=new URL(value,origin);if(['https:','http:'].includes(url.protocol)||url.href.startsWith('data:image/'))document.querySelector('link[rel=icon]').href=url.href}catch{}};
 frame.addEventListener('load',()=>{try{const url=new URL(frame.contentWindow.location.href);if(url.origin===origin&&['/account.html','/support.html','/login-bridge.html','/login-return.html'].includes(url.pathname)){location.replace(url.href);return}}catch{}update()});
 addEventListener('beforeunload',event=>{try{if(frame.contentWindow.localStorage.getItem('nova_warn_before_closing')==='true'){event.preventDefault();event.returnValue=''}}catch{}});
 addEventListener('storage',update);
 addEventListener('message',e=>{if(e.origin===origin&&e.source===frame.contentWindow&&e.data?.novaAction==='settingsChanged')update()});
 const target=new URL(frame.getAttribute('data-nova-src'),origin);if(target.origin===origin&&target.pathname==='/home.html')frame.src=target.href;
})();
