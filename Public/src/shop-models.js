let serial=0;
export function createShopModel(kind){
 const stage=document.createElement('div');stage.className='shop-model-stage model-showroom';stage.setAttribute('aria-hidden','true');
 const id='nova-model-'+(++serial),colors={decoration:['#9fe3ff','#2f6f9a','#10283d'],effect:['#ffd38a','#9a6a2c','#3b2812'],banner:['#d4b8ff','#6e4ea3','#271a40']};
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 320 260');svg.classList.add('shop-model-svg',kind==='halloween'?'shop-pumpkin':'shop-crate');
 if(kind==='halloween'){
  svg.innerHTML=`<defs><radialGradient id="${id}-body" cx="35%" cy="28%" r="75%"><stop stop-color="#ffd698"/><stop offset=".4" stop-color="#f49c42"/><stop offset=".75" stop-color="#b8541e"/><stop offset="1" stop-color="#61250f"/></radialGradient><radialGradient id="${id}-light"><stop stop-color="#fffbc7"/><stop offset=".7" stop-color="#ffcd6a"/><stop offset="1" stop-color="#ec7826"/></radialGradient><linearGradient id="${id}-stem" x2="1" y2="1"><stop stop-color="#95a268"/><stop offset="1" stop-color="#334329"/></linearGradient><radialGradient id="${id}-shadow"><stop stop-color="#02050a" stop-opacity=".65"/><stop offset="1" stop-color="#02050a" stop-opacity="0"/></radialGradient></defs><ellipse cx="162" cy="229" rx="115" ry="17" fill="url(#${id}-shadow)"/><g class="model-object"><path d="M155 72c-7-21 1-36 19-47l12 11c-18 13-23 19-18 39" fill="url(#${id}-stem)" stroke="#b9c489" stroke-opacity=".35"/><path d="M178 47c37-21 52 5 33 18-12 9-21-1-13-8" fill="none" stroke="#83975b" stroke-width="4" stroke-linecap="round"/><ellipse cx="163" cy="149" rx="99" ry="79" fill="url(#${id}-body)" stroke="#ffd6a3" stroke-opacity=".5"/><path d="M118 77c-33 37-34 102-3 141M145 73c-18 34-19 109-8 152M169 72c19 38 16 106 8 153M197 78c32 34 31 103 6 139M91 96c-21 25-17 68 0 94M225 96c25 28 22 67 1 97" fill="none" stroke="#6b2c13" stroke-width="4" stroke-opacity=".3"/><path d="M127 83c-25 34-28 85-15 119M186 80c22 37 24 83 13 119" fill="none" stroke="#ffe5af" stroke-width="3" stroke-opacity=".26"/><path d="m111 125 30 14-36 13Zm98-2-30 17 34 10Z" fill="#411b10" stroke="#e9a050" stroke-width="3"/><path d="m113 131 20 9-25 7Zm91-1-18 10 24 6Z" fill="url(#${id}-light)"/><path d="m158 141-10 21 23-1Z" fill="url(#${id}-light)" stroke="#4c2112" stroke-width="4"/><path d="m106 171 18 7 8-6 11 12 17-7 15 8 11-12 11 6 17-9-9 29-18 8-15-6-16 10-17-10-17 6-15-9Z" fill="#482010" stroke="#bd6c2b" stroke-width="2"/><path d="m115 180 12 4 8-4 9 12 16-7 14 8 14-12 8 5 10-5-7 13-13 5-13-6-17 9-16-9-14 5Z" fill="url(#${id}-light)"/><ellipse cx="121" cy="100" rx="17" ry="6" fill="#fff3ce" opacity=".15" transform="rotate(-30 121 100)"/></g>`;
 }else{
  // Nova crate: a hard-shell vault with a glowing lid seam, corner guards and the Nova star.
  // V2 crates add a holographic band and a V2 plate.
  const v2=kind.endsWith('2'),base=v2?kind.slice(0,-1):kind;
  const [light,mid,dark]=colors[base]||colors.decoration;
  svg.classList.add('nova-crate-v3');if(v2)svg.classList.add('is-v2');
  const holo=v2?`<path d="m81 97 11-7 138 30-11 7Z" fill="url(#${id}-holo)" opacity=".8"/><path d="m92 90 138 30" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/>`:'';
  const plate=v2?`<g transform="matrix(1 -.58 0 1 214 176)"><rect x="-4" y="-16" width="34" height="20" rx="4" fill="#0a0c12" stroke="${light}" stroke-opacity=".8"/><text x="13" y="-1" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="13" fill="${light}">V2</text></g>`:'';
  svg.innerHTML=`<defs>
<linearGradient id="${id}-front" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${mid}"/><stop offset=".55" stop-color="${dark}"/><stop offset="1" stop-color="#05070b"/></linearGradient>
<linearGradient id="${id}-side" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset="1" stop-color="#030508"/></linearGradient>
<linearGradient id="${id}-top" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${light}" stop-opacity=".9"/><stop offset=".5" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
<linearGradient id="${id}-holo" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#7df9ff"/><stop offset=".35" stop-color="#b48cff"/><stop offset=".7" stop-color="#ff8fd0"/><stop offset="1" stop-color="#ffd36e"/></linearGradient>
<radialGradient id="${id}-shadow"><stop stop-color="#000" stop-opacity=".6"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-glow"><stop stop-color="${light}" stop-opacity=".35"/><stop offset="1" stop-color="${light}" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}-beam" x1="0" y1="1" x2="0" y2="0"><stop stop-color="${light}" stop-opacity=".9"/><stop offset="1" stop-color="${light}" stop-opacity="0"/></linearGradient></defs>
<ellipse cx="160" cy="228" rx="118" ry="16" fill="url(#${id}-shadow)"/>
<ellipse class="crate-aura" cx="160" cy="160" rx="150" ry="100" fill="url(#${id}-glow)"/>
<path class="crate-beam" d="m86 120 104 28 70-42L136 80Z M100 118 150 -40 260 -20 250 104Z" fill="url(#${id}-beam)" opacity="0"/>
<g class="model-object">
<path d="m62 126 130 32v68L62 194Z" fill="url(#${id}-front)" stroke="${light}" stroke-opacity=".35"/>
<path d="m192 158 70-44v68l-70 44Z" fill="url(#${id}-side)" stroke="${light}" stroke-opacity=".25"/>
<path d="m200 170 54-34m-54 46 54-34m-54 46 54-34" stroke="#000" stroke-opacity=".45" stroke-width="4"/>
<path d="m62 126 130 32 70-44" fill="none" stroke="${light}" stroke-width="3" class="crate-seam"/>
<path d="m62 126 130 32 70-44" fill="none" stroke="${light}" stroke-width="10" stroke-opacity=".18" class="crate-seam-glow"/>
<path d="m62 126 14 3v68l-14-3Zm116 29 14 3v68l-14-3Zm70-31 14-9v68l-14 9Z" fill="#0a0d13" stroke="${light}" stroke-opacity=".3"/>
<g transform="matrix(1 .246 0 1 92 138)"><path d="M35 6 44 26 64 35 44 44 35 64 26 44 6 35 26 26Z" fill="#06080c" stroke="${light}" stroke-width="2"/><path d="M35 18 39 31 52 35 39 39 35 52 31 39 18 35 31 31Z" fill="${light}"/></g>
${plate}
<g class="model-lid">
<path d="m56 112 72-44 140 28-76 48Z" fill="url(#${id}-top)" stroke="${light}" stroke-width="2"/>
${holo}
<path d="m56 112 136 32v14L56 126Z" fill="${dark}" stroke="${light}" stroke-opacity=".5"/>
<path d="m192 144 76-48v14l-76 48Z" fill="#05070b" stroke="${light}" stroke-opacity=".4"/>
<path d="m110 98 30-18 70 14-30 19Z" fill="#0008" stroke="${light}" stroke-opacity=".45"/>
<path d="m140 99 10-6 22 4-10 7Z" fill="${light}" opacity=".85"/>
<path d="m84 116 18 4v10l-18-4Zm78 18 18 4v10l-18-4Z" fill="${light}" opacity=".75"/>
</g></g>`;
 }
 stage.append(svg);return stage;
}
