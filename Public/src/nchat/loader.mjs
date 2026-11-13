// Nova Chat intro: the Nova mark fades in, glides right while "Nova Chat" slides out
// in a moving white/grey shimmer, a small progress line shows what is loading, then
// the whole scene fades and zooms softly into the chat.
import {el,lowPower} from './core.mjs';

const MARK='<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="nlg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#cfd3dc"/><stop offset="1" stop-color="#8d93a1"/></linearGradient></defs><path d="M14 50V14h7l22 25V14h7v36h-7L21 25v25Z" fill="url(#nlg)"/></svg>';

export function createLoader(host=document.body){
 const root=el('div','ncl');root.setAttribute('role','status');root.setAttribute('aria-live','polite');
 const stage=el('div','ncl-stage'),mark=el('div','ncl-mark'),word=el('div','ncl-word');
 mark.innerHTML=MARK;
 word.append(el('span','ncl-nova','Nova'),el('span','ncl-chat','Chat'));
 stage.append(word,mark);
 const meter=el('div','ncl-meter'),bar=el('i'),step=el('p','ncl-step','Starting Nova…');meter.append(bar);
 const foot=el('div','ncl-foot');foot.append(meter,step);
 const retry=el('button','ncl-retry','Try again');retry.type='button';retry.hidden=true;retry.onclick=()=>location.reload();
 root.append(el('div','ncl-glow'),stage,foot,retry);host.append(root);
 // Choreography is CSS-driven; classes advance it so slow devices never block on animation.
 requestAnimationFrame(()=>root.classList.add('in'));
 const slide=setTimeout(()=>root.classList.add('reveal'),lowPower()?0:650);
 let shown=0;
 return {
  step(text,progress){step.textContent=text;if(progress!=null){shown=Math.max(shown,progress);bar.style.transform='scaleX('+Math.min(1,shown)+')'}},
  error(text){root.classList.add('failed');step.textContent=text;retry.hidden=false},
  async done(){
   clearTimeout(slide);root.classList.add('reveal');this.step('Welcome to Nova Chat',1);
   await new Promise(r=>setTimeout(r,lowPower()?0:520));
   root.classList.add('out');document.body.classList.add('nc-entering');
   await new Promise(r=>setTimeout(r,lowPower()?0:620));
   root.remove();document.body.classList.remove('nc-entering');
  }
 };
}
