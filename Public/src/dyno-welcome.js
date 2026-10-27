/* One-time invitation; the switch saves immediately and never enables itself. */
(()=>{
 if(window!==top||!location.pathname.endsWith('/home.html'))return;
 let retry,shown=false;
 const seenKey=()=> 'nova-dyno-welcome-v1:'+(localStorage.getItem('nova_user')||'guest');
 const reduced=()=>localStorage.getItem('nova_reduce_motion')==='true'||matchMedia('(prefers-reduced-motion:reduce)').matches;
 const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!=null)n.textContent=text;return n};
 function open(){
  if(shown||localStorage.getItem(seenKey())==='true')return;
  if(document.hidden||document.querySelector('#nova-home-boot:not([hidden]),dialog[open],#home-style-welcome:not([hidden]),.os-window:not([hidden]),#panel:not([hidden])')){retry=setTimeout(open,1200);return}
  shown=true;
  const dialog=make('dialog');dialog.id='nova-dyno-welcome';dialog.setAttribute('aria-labelledby','dyno-welcome-title');dialog.setAttribute('aria-describedby','dyno-welcome-description');
  const close=make('button','dyno-welcome-close','×');close.type='button';close.setAttribute('aria-label','Dismiss Dyno Stop introduction');
  const head=make('div','dyno-welcome-head'),badge=make('div','dyno-welcome-badge'),logo=make('img');logo.src='/Nova12.png';logo.alt='';badge.append(logo);
  const heading=make('div'),title=make('h1','','Dyno Stop');title.id='dyno-welcome-title';heading.append(make('p','dyno-welcome-caption','NEW IN NOVA'),title);head.append(badge,heading);
  const description=make('p','dyno-welcome-description','Helps block automatic redirects and script-triggered closes while you use Nova.');description.id='dyno-welcome-description';
  const label=make('label','dyno-welcome-switch-row'),copy=make('span','dyno-welcome-switch-copy'),state=make('small');copy.append(make('strong','','Enable Dyno Stop'),state);
  const control=make('span','dyno-welcome-toggle'),input=make('input'),track=make('span','dyno-welcome-track');input.type='checkbox';input.setAttribute('role','switch');input.setAttribute('aria-label','Enable Dyno Stop');input.checked=localStorage.getItem('nova_dyno_stoper')==='true';track.setAttribute('aria-hidden','true');control.append(input,track);label.append(copy,control);
  const paint=()=>{state.textContent=input.checked?'On · protection enabled':'Off · optional protection';dialog.dataset.enabled=String(input.checked)};paint();
  input.onchange=()=>{localStorage.setItem('nova_dyno_stoper',String(input.checked));paint();dispatchEvent(new Event('nova-dyno-changed'))};
  const caveat=make('p','dyno-welcome-caveat','Experimental. Browser exits and device-management actions cannot be blocked.');
  const footer=make('div','dyno-welcome-footer'),hint=make('small','','Change anytime in Settings → Behaviors'),done=make('button','dyno-welcome-done','Done');done.type='button';footer.append(hint,done);
  dialog.append(close,head,description,label,caveat,footer);document.body.append(dialog);let closing=false;
  function finish(){if(closing)return;closing=true;localStorage.setItem(seenKey(),'true');const leave=()=>{dialog.close();dialog.remove()};if(reduced()){leave();return}dialog.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(8px) scale(.98)'}],{duration:160,easing:'ease-in',fill:'forwards'}).finished.then(leave).catch(leave)}
  done.onclick=close.onclick=finish;dialog.addEventListener('cancel',e=>{e.preventDefault();finish()});dialog.showModal();if(!reduced())dialog.animate([{opacity:0,transform:'translateY(12px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:320,easing:'cubic-bezier(.16,1,.3,1)'});input.focus({preventScroll:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>retry=setTimeout(open,900),{once:true});else retry=setTimeout(open,900);
 addEventListener('pagehide',()=>clearTimeout(retry),{once:true});
})();
