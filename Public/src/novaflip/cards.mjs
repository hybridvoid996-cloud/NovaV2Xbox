// Original Nova Flip card art, drawn with DOM + inline SVG (no image assets).
import {LABELS,COLOR_NAMES} from './engine.mjs?v=5';

const SVG={
 skip:'<circle cx="12" cy="12" r="8.5"/><path d="M6 18 18 6"/>',
 rev:'<path d="M4 9h13l-3-3M20 15H7l3 3"/>',
 skipall:'<circle cx="9" cy="12" r="6"/><path d="m5 16 8-8"/><circle cx="15.5" cy="12" r="6" opacity=".55"/>',
 discard:'<path d="M5 8h14l-1.4 12H6.4Z"/><path d="M3.5 8h17M9 4h6M10 12v5m4-5v5"/>',
 swap:'<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/><circle cx="4" cy="16" r="1.4"/><circle cx="20" cy="8" r="1.4"/>',
 wild:'<path d="M12 2.5 14.6 9.4 21.5 12l-6.9 2.6L12 21.5l-2.6-6.9L2.5 12l6.9-2.6Z"/>'
};
const icon=(name,cls='')=>`<svg class="nf-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${SVG[name]}</svg>`;

function face(card){
 // 6 and 9 are underlined so they read the right way up.
 if(/^\d$/.test(card.v)){const u=card.v==='6'||card.v==='9'?' nf-u':'';return {big:`<span class="nf-num${u}">${card.v}</span>`,corner:u?`<span class="nf-u">${card.v}</span>`:card.v}}
 if(card.v==='d2'||card.v.startsWith('w')&&/\d/.test(card.v)){const n=LABELS[card.v];return {big:`<span class="nf-plus">${n}</span>`,corner:n}}
 if(card.v==='w4')return {big:'<span class="nf-plus">+4</span>',corner:'+4'};
 const glyph=SVG[card.v]?card.v:'wild';
 return {big:icon(glyph,'nf-big-ico'),corner:icon(glyph)};
}

export function cardEl(card,{small=false,back=false}={}){
 const el=document.createElement('div');
 el.className='nf-card'+(small?' small':'');
 if(back||!card){el.classList.add('back');el.innerHTML='<div class="nf-back-ring"></div><div class="nf-back-mark">'+icon('wild','nf-back-star')+'<b>FLIP</b></div>';el.setAttribute('aria-label','Face-down card');return el}
 el.dataset.color=card.c;el.dataset.kind=card.v;el.dataset.id=card.id;
 if(card.c==='w')el.classList.add('wild');
 if(['w6','w10','swap','skipall','discard'].includes(card.v))el.classList.add('chaos');
 const f=face(card);
 el.innerHTML=`<div class="nf-frame"></div><div class="nf-sheen"></div><span class="nf-corner tl">${f.corner}</span><div class="nf-portal">${f.big}</div><span class="nf-corner br">${f.corner}</span>`;
 el.setAttribute('aria-label',(card.c==='w'?'':COLOR_NAMES[card.c]+' ')+(LABELS[card.v]||card.v));
 return el;
}

export const colorHex={r:'#ff4b6e',y:'#ffc23d',g:'#27e0a0',b:'#3f8cff'};
