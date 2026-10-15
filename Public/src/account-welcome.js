(()=>{
const intro=document.getElementById('nova-welcome'),text=document.getElementById('welcome-typed');if(!intro||!text)return;const shell=document.querySelector('.account-shell');if(shell)shell.inert=true;
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches||localStorage.getItem('nova_reduce_motion')==='true',message='Welcome to Nova';let index=0;
function reveal(){if(shell)shell.inert=false;intro.classList.add('is-leaving');document.body.classList.remove('welcome-pending');setTimeout(()=>{intro.remove();document.getElementById('account-email')?.focus({preventScroll:true})},reduced?0:450)}
function type(){text.textContent=message.slice(0,++index);if(index<message.length)setTimeout(type,65);else setTimeout(reveal,2000)}
if(reduced){text.textContent=message;setTimeout(reveal,2000)}else type();
})();
