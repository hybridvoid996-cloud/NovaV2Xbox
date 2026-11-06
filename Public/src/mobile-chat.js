(()=>{
const button=document.createElement('button');button.className='nova-phone-chat-menu';button.textContent='☰';button.setAttribute('aria-label','Open chat navigation');button.setAttribute('aria-expanded','false');document.body.append(button);
function close(){document.body.classList.remove('nova-phone-nav-open');button.setAttribute('aria-expanded','false');}
button.onclick=()=>{const open=document.body.classList.toggle('nova-phone-nav-open');button.setAttribute('aria-expanded',String(open));};
document.querySelector('.chat-shell>main')?.addEventListener('pointerdown',close);
document.querySelector('.sidebar')?.addEventListener('click',e=>{if(e.target.closest('button,.dm'))close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
})();
