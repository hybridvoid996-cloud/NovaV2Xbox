(()=>{
 const intro=document.getElementById('nova-welcome'),shell=document.querySelector('.account-shell');if(!intro)return;if(shell)shell.inert=true;
 document.getElementById('welcome-typed').textContent='Nova';intro.classList.add('nova-spin-intro');
 const reduced=globalThis.NovaMotion?.reduced===true;
 const reveal=()=>{if(shell)shell.inert=false;intro.classList.add('is-leaving');document.body.classList.remove('welcome-pending');setTimeout(()=>{intro.remove();document.getElementById('account-email')?.focus({preventScroll:true})},reduced?0:500)};
 // The intro is visual only. It never waits on account/network requests.
 setTimeout(reveal,reduced?0:1150);
})();
