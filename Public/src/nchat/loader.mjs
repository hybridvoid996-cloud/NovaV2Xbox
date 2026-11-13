// Nova Chat intro: the Nova logo appears in a glass tile while a progress ring fills
// around it, "Nova Chat" rises in with a moving silver shine, the current step
// cross-fades under it, then the whole scene zooms and blurs away into the chat.
import {el,lowPower} from './core.mjs?v=9';

const R=58,C=2*Math.PI*R;

export function createLoader(host=document.body){
 const root=el('div','nl');root.setAttribute('role','status');root.setAttribute('aria-live','polite');
 const stars=el('div','nl-stars'),glow=el('div','nl-glow');
 const core=el('div','nl-core');
 core.innerHTML='<svg class="nl-ring" viewBox="0 0 128 128" aria-hidden="true"><defs><linearGradient id="nl-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#c9ced8"/><stop offset="1" stop-color="#7d8294"/></linearGradient></defs><circle class="nl-track" cx="64" cy="64" r="'+R+'"/><circle class="nl-fill" cx="64" cy="64" r="'+R+'" stroke-dasharray="'+C+'" stroke-dashoffset="'+C+'"/></svg>'
  +'<span class="nl-orbit" aria-hidden="true"><i></i></span><span class="nl-tile"><img src="/Nova12.png" alt="" draggable="false"></span>';
 const fill=core.querySelector('.nl-fill');
 const word=el('h1','nl-word');word.append(el('span','nl-nova','Nova'),el('span','nl-chat','Chat'));
 const stepWrap=el('div','nl-steps'),stepText=el('p','nl-step','Starting Nova…'),pct=el('span','nl-pct','0%');stepWrap.append(stepText);
 const foot=el('div','nl-foot');foot.append(stepWrap,pct);
 const retry=el('button','nl-retry','Try again');retry.type='button';retry.hidden=true;retry.onclick=()=>location.reload();
 const stage=el('div','nl-stage');stage.append(core,word,foot,retry);
 root.append(stars,glow,stage);host.append(root);
 requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('in')));
 let shown=0,swap=null;
 const setProgress=v=>{shown=Math.max(shown,Math.min(1,v));fill.style.strokeDashoffset=String(C*(1-shown));pct.textContent=Math.round(shown*100)+'%'};
 const setText=text=>{if(stepText.textContent===text)return;clearTimeout(swap);if(lowPower()){stepText.textContent=text;return}stepText.classList.add('swap');swap=setTimeout(()=>{stepText.textContent=text;stepText.classList.remove('swap')},180)};
 setProgress(.04);
 return {
  step(text,progress){setText(text);if(progress!=null)setProgress(progress)},
  error(text){root.classList.add('failed');clearTimeout(swap);stepText.classList.remove('swap');stepText.textContent=text;retry.hidden=false},
  async done(){
   setText('Welcome to Nova Chat');setProgress(1);root.classList.add('complete');
   await new Promise(r=>setTimeout(r,lowPower()?0:650));
   root.classList.add('out');document.body.classList.add('nc-entering');
   await new Promise(r=>setTimeout(r,lowPower()?0:700));
   root.remove();document.body.classList.remove('nc-entering');
  }
 };
}
