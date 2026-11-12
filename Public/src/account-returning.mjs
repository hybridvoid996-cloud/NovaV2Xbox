const key='nova-returning-account-prompt-v1';
let answered=false;
try{answered=sessionStorage.getItem(key)==='answered'}catch{}
if(!answered){
 const dialog=document.createElement('dialog');
 dialog.className='returning-account';
 dialog.setAttribute('aria-labelledby','returning-title');dialog.setAttribute('aria-describedby','returning-description');
 dialog.innerHTML='<button type="button" class="returning-dismiss" aria-label="Close recovery prompt">×</button><div class="returning-visual" aria-hidden="true"><div class="returning-orbit"></div><div class="returning-icon"><img src="/Nova12.png" alt=""></div><span>YOUR NOVA. STILL YOURS.</span></div><div class="returning-copy"><small>ACCOUNT RECOVERY</small><h2 id="returning-title">Your account.<br>Right where you left it.</h2><p id="returning-description">Lost your login after Nova moved? Find your profile and let our support team help you get back in.</p><div class="returning-reassurance"><span aria-hidden="true">↗</span> Private support. Verified by a Nova owner.</div><div class="returning-actions"><a href="/support.html" data-answer="yes">Find my account <span aria-hidden="true">↗</span></a><button type="button" data-answer="no">I’m new here</button></div></div>';

 const remember=()=>{try{sessionStorage.setItem(key,'answered')}catch{}};
 const close=()=>{remember();dialog.classList.add('is-closing');setTimeout(()=>{dialog.close();dialog.remove();document.getElementById('account-email')?.focus()},180)};
 dialog.querySelector('[data-answer="no"]').onclick=close;dialog.querySelector('.returning-dismiss').onclick=close;
 dialog.querySelector('a').onclick=remember;
 dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
 document.body.append(dialog);
 const show=()=>{if(!document.getElementById('nova-welcome')){watch.disconnect();if(dialog.isConnected)dialog.showModal()}};
 const watch=new MutationObserver(show);
 watch.observe(document.body,{childList:true});
 show();
}
