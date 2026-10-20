(()=>{
 const frame=document.getElementById('system'),panel=document.getElementById('panel');
 if(!frame||!panel)return;
 const set=active=>document.body.classList.toggle('nova-cinema-active',active);
 const eligible=()=>!panel.hidden&&panel.dataset.view==='novamovies'&&new URL(frame.src,location.href).origin===location.origin&&new URL(frame.src,location.href).pathname.endsWith('/novamovies.html');
 addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.novaAction!=='novaMovieWatch')return;set(event.data.active===true&&eligible())});
 const observer=new MutationObserver(()=>{if(!eligible())set(false)});
 observer.observe(panel,{attributes:true,attributeFilter:['hidden','data-view']});
 frame.addEventListener('load',()=>{try{if(!frame.contentDocument?.body.classList.contains('movie-watch-open'))set(false)}catch{set(false)}});
 addEventListener('pagehide',()=>observer.disconnect(),{once:true});
})();
