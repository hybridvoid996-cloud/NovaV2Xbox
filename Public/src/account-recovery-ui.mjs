import {redeemRecoveryCode} from './account-recovery-client.mjs?v=20261025-recovery286';
export function showAccountRecovery({username='',email='',request=fetch,onSignIn,onComplete,onPassword,onEmailReset}){
 const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e};
 const dialog=node('dialog');dialog.className='account-recovery-dialog';
 const heading=node('header'),title=node('h2','Recover your Nova account'),close=node('button','×');close.type='button';close.setAttribute('aria-label','Close account recovery');close.onclick=()=>dialog.close();heading.append(title,close);
 const intro=node('p','Ask a Nova owner to verify your account and generate a recovery code for your username. Codes work once and expire after 15 minutes.');
 const form=node('form'),status=node('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 function field(label,type,value=''){const wrap=node('label',label),input=node('input');input.type=type;input.value=value;wrap.append(input);form.append(wrap);return input}
 const name=field('Username','text',username);name.required=true;name.maxLength=100;name.autocomplete='username';
 const hint=field('Email you remember (optional)','text',email);hint.maxLength=254;
 const explanation=node('small','A guessed email does not grant access. Your code must belong to the account the owner approved.');form.append(explanation);
 const code=field('Owner recovery code','text');code.required=true;code.maxLength=60;code.autocomplete='one-time-code';code.spellcheck=false;
 const password=field('New password (optional)','password');password.minLength=8;password.maxLength=128;password.autocomplete='new-password';
 const submit=node('button','Sign in with code');submit.type='submit';submit.className='primary';
 const continueButton=node('button','Continue to Nova');continueButton.type='button';continueButton.hidden=true;
 let recovered=null,busy=false;
 async function complete(){await onComplete(recovered);dialog.close()}
 continueButton.onclick=async()=>{if(busy)return;busy=true;try{await complete()}catch{status.textContent='You are signed in. Check your connection and try Continue again.'}finally{busy=false}};
 form.append(status,submit,continueButton);
 form.onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;submit.disabled=true;status.textContent='Checking your recovery code…';try{
  if(!recovered){const token=await redeemRecoveryCode(name.value,code.value,{request});recovered=await onSignIn(token);code.value='';code.required=false;code.disabled=name.disabled=hint.disabled=true;continueButton.hidden=false;submit.textContent='Save password and continue'}
  if(password.value){try{await onPassword(recovered,password.value);password.value=''}catch{status.textContent='You are signed in, but the new password was not saved. Try another password, or continue without changing it.';return}}
  await complete();
 }catch(error){status.textContent=recovered?'You are signed in. Check your connection and try Continue again.':error.message||'Recovery could not connect. Ask the owner for a new code if yours was already submitted.'}finally{busy=false;submit.disabled=false}};
 const emailToggle=node('button','Use an email reset link instead');emailToggle.type='button';emailToggle.className='text-button';
 const emailForm=node('form');emailForm.hidden=true;const emailLabel=node('label','Account email'),emailInput=node('input');emailInput.type='email';emailInput.required=true;emailInput.autocomplete='email';emailInput.value=email;emailLabel.append(emailInput);const emailSubmit=node('button','Send reset link'),emailStatus=node('p');emailSubmit.type='submit';emailSubmit.className='primary';emailStatus.setAttribute('role','status');emailForm.append(emailLabel,emailSubmit,emailStatus);
 emailForm.onsubmit=async event=>{event.preventDefault();emailSubmit.disabled=true;try{await onEmailReset(emailInput.value.trim());emailStatus.textContent='If this email has an account, a reset link is on its way. You must be able to open that inbox.'}catch{emailStatus.textContent='The reset email could not be sent. Check the address and try again.'}finally{emailSubmit.disabled=false}};
 emailToggle.onclick=()=>{if(busy)return;form.hidden=!form.hidden;emailForm.hidden=!emailForm.hidden;emailToggle.textContent=form.hidden?'Use an owner recovery code instead':'Use an email reset link instead'};
 const support=node('a','Need an owner’s help? Open live support ↗');support.href='/support.html';support.className='account-recovery-support';dialog.append(heading,intro,form,emailForm,emailToggle,support);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();name.focus();return dialog;
}
