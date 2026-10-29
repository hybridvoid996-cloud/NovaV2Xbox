/* Keep GhostCloud controls available without reserving space above the stream. */
(()=>{
 function attach(doc,{signal,onHome=()=>{}}={}){
  if(signal?.aborted||doc.getElementById('nova-ghost-player-style'))return;
  const style=doc.createElement('style');style.id='nova-ghost-player-style';style.textContent=`
#puzzle-cancel,#player-cancel{display:none!important}
#puzzle-modal{background:#080c1699!important;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
#puzzle-modal .modal{background:linear-gradient(145deg,#252d3aef,#121722f5)!important;border:1px solid #ffffff38!important;border-radius:26px!important;box-shadow:inset 0 1px 0 #ffffff30,0 24px 80px #0006!important;color:#fff!important;padding:28px!important}
#puzzle-modal .modal:before{content:'NOVA CLOUD';display:block;margin-bottom:16px;font:700 10px system-ui;letter-spacing:.22em;color:#bdcde4}
#puzzle-title{font:650 24px system-ui!important;letter-spacing:-.04em!important}#puzzle-modal .puzzle-hint{color:#bdc5d3!important;line-height:1.6!important;font:13px/1.6 system-ui!important}
#puzzle-stage{border-radius:14px!important;overflow:hidden}#puzzle-track{border-radius:16px!important;background:#ffffff12!important;border:1px solid #ffffff26!important}#puzzle-thumb{border-radius:13px!important;background:#e0ebff!important;color:#182132!important;box-shadow:inset 0 1px 0 white,0 3px 12px #0003!important}#puzzle-fill{background:#cbdfff30!important}#puzzle-refresh{border:1px solid #ffffff38!important;border-radius:18px!important;background:#ffffff0d!important;color:white!important}
#player-status .player-status-inner{border:1px solid #ffffff25;border-radius:26px;background:#151c2cd9;padding:28px;backdrop-filter:blur(16px)}
#player-modal .player-watermark{font-family:system-ui!important}#player-modal .player-container{inset:0!important;border-radius:0!important;box-shadow:none!important}
#player-modal .player-video{top:0!important;left:0!important;width:100%!important;height:100%!important;object-fit:cover!important}
#player-modal .player-status,#player-modal .player-recover{inset:0!important}
#player-modal .player-bar{position:absolute!important;inset:0 0 auto!important;z-index:10!important;padding-right:104px!important;background:rgba(12,15,20,.88)!important;backdrop-filter:blur(16px);opacity:0!important;visibility:hidden!important;pointer-events:none!important;transform:translateY(-100%);transition:opacity .18s,transform .18s,visibility .18s}
#player-modal.nova-controls-open .player-bar{opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:translateY(0)}
#player-modal .player-sound{top:12px!important}
#player-modal.nova-controls-open .player-sound{top:54px!important}
#nova-ghost-controls{position:absolute;right:12px;top:10px;z-index:12;padding:7px 12px;border:1px solid #ffffff30;border-radius:10px;background:#10131899;color:#fff;font:600 12px system-ui;cursor:pointer;backdrop-filter:blur(12px);opacity:.65;transition:opacity .18s}
#nova-ghost-controls:hover,#nova-ghost-controls:focus-visible{opacity:1;outline:2px solid #ffffff70;outline-offset:2px}
@media(prefers-reduced-motion:reduce){@scope (:root:not(.nova-motion-enabled)){#player-modal .player-bar,#nova-ghost-controls{transition:none}}}
/* Glass surfaces stay static; only the small loader animates. */
#player-status,#player-recover{background:radial-gradient(ellipse at 35% 20%,#a2bde01a,transparent 65%),#090c14c9!important;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
#player-status .player-status-inner,#player-recover .player-recover-inner{width:min(360px,calc(100vw - 64px));box-sizing:border-box;padding:32px 26px!important;border:1px solid #ffffff40!important;border-radius:30px!important;background:linear-gradient(140deg,#ffffff24,#ffffff08 55%,#ffffff12)!important;box-shadow:inset 0 1px 0 #ffffff65,inset 0 -1px 0 #ffffff0b,0 24px 80px #0004!important;text-align:center;font-family:system-ui!important}
#player-status .player-status-inner:before,#player-recover .player-recover-inner:before{content:'NOVA CLOUD';display:block;margin-bottom:20px;color:#dbe5f4;font:650 10px system-ui;letter-spacing:.23em}
#player-status-title{color:#fff!important;font:600 clamp(20px,3vw,26px)/1.25 system-ui!important;letter-spacing:-.04em!important;margin:16px 0 10px!important}
#player-status-msg,#player-recover-text{color:#ccd3df!important;font:13px/1.65 system-ui!important;overflow-wrap:anywhere}
#ps-icon{width:64px!important;height:64px!important;border-radius:19px!important;border:1px solid #ffffff38;box-shadow:0 6px 24px #0003;object-fit:cover}
#player-status .ps-dots{display:flex!important;justify-content:center;gap:7px;margin:24px auto 3px!important}#player-status .ps-dots span{width:8px!important;height:8px!important;background:#e4efff!important;border:1px solid #ffffff70;border-radius:50%;box-shadow:0 0 10px #ffffff24;animation:nova-ghost-pulse 1.3s ease-in-out infinite!important}#player-status .ps-dots span:nth-child(2){animation-delay:.15s!important}#player-status .ps-dots span:nth-child(3){animation-delay:.3s!important}
#player-modal .btn,#player-modal .btn-icon,#player-modal .player-sound,#player-modal .player-tapstart,#nova-ghost-controls{border:1px solid #ffffff40!important;border-radius:16px!important;background:linear-gradient(145deg,#ffffff24,#ffffff09)!important;box-shadow:inset 0 1px 0 #ffffff40,0 5px 16px #0002!important;color:#fff!important;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
#player-modal .player-bar{background:linear-gradient(140deg,#222936b8,#111722b8)!important;border-bottom:1px solid #ffffff25;box-shadow:inset 0 1px 0 #ffffff26}
#player-hud,#player-timer,#player-shortcuts{border:1px solid #ffffff30!important;background:linear-gradient(140deg,#242b38c9,#141b25c9)!important;border-radius:16px!important;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:inset 0 1px 0 #ffffff30}
@keyframes nova-ghost-pulse{0%,100%{opacity:.35;transform:translateY(0)}50%{opacity:1;transform:translateY(-4px)}}
@media(prefers-reduced-motion:reduce){@scope (:root:not(.nova-motion-enabled)){#player-status .ps-dots span{animation:none!important}}}
`;doc.head.append(style);
  let button,seenSession=false,returning=false;const visible=id=>{const el=doc.getElementById(id);return !!el&&!el.classList.contains("hidden")};const goHome=()=>{if(returning)return;returning=true;onHome()};const navigate=e=>{if(!e.target.closest?.("#player-close,#player-cancel,#puzzle-cancel,a[href]"))return;e.preventDefault();e.stopImmediatePropagation();goHome()};doc.addEventListener("click",navigate,true);const update=()=>{if(visible("player-modal")||visible("puzzle-modal"))seenSession=true;else if(seenSession&&!visible("settings-modal")){goHome();return}const puzzleTitle=doc.getElementById("puzzle-title");if(puzzleTitle&&puzzleTitle.textContent!=="Nova · Quick human check")puzzleTitle.textContent="Nova · Quick human check";const mark=doc.getElementById("player-watermark");if(mark&&mark.textContent!=="NOVA CLOUD")mark.textContent="NOVA CLOUD";const modal=doc.getElementById('player-modal'),container=modal?.querySelector('.player-container');if(!container||button?.isConnected)return;
   button=doc.createElement('button');button.id='nova-ghost-controls';button.type='button';button.textContent='Controls';button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Show game controls');
   button.onclick=()=>{const open=modal.classList.toggle('nova-controls-open');button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Hide game controls':'Show game controls');button.textContent=open?'Hide':'Controls'};container.append(button);
  };
  update();const observer=new doc.defaultView.MutationObserver(update);observer.observe(doc.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  const cleanup=()=>{doc.removeEventListener("click",navigate,true);observer.disconnect();button?.remove();style.remove();doc.getElementById('player-modal')?.classList.remove('nova-controls-open')};
  signal?.addEventListener('abort',cleanup,{once:true});doc.defaultView.addEventListener('pagehide',cleanup,{once:true});
 }
 window.NovaGhostCloud={attach};
})();
