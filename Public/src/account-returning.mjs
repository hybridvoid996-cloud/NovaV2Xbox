const key='nova-returning-account-prompt-v1';
let answered=false;
try{answered=sessionStorage.getItem(key)==='answered'}catch{}
if(!answered){
 const dialog=document.createElement('dialog');
 dialog.className='returning-account';
 dialog.setAttribute('aria-labelledby','returning-title');
 dialog.innerHTML='<div class="returning-icon" aria-hidden="true"><img src="/Nova12.png" alt=""></div><small>LET’S GET YOU HOME</small><h2 id="returning-title">Lost access to your Nova account?</h2><p>Played on an older Nova address? Your account may still be here. Find your profile and open a private recovery request.</p><div class="returning-actions"><button type="button" data-answer="no">No, continue</button><a href="/support.html" data-answer="yes">Find my account <span aria-hidden="true">↗</span></a></div>';
 const remember=()=>{try{sessionStorage.setItem(key,'answered')}catch{}};
 const close=()=>{remember();dialog.classList.add('is-closing');setTimeout(()=>{dialog.close();dialog.remove();document.getElementById('account-email')?.focus()},180)};
 dialog.querySelector('button').onclick=close;
 dialog.querySelector('a').onclick=remember;
 dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
 document.body.append(dialog);
 const show=()=>{if(!document.getElementById('nova-welcome')){watch.disconnect();if(dialog.isConnected)dialog.showModal()}};
 const watch=new MutationObserver(show);
 watch.observe(document.body,{childList:true});
 show();
}
