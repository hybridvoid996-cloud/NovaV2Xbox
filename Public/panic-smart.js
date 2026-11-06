(() => {
  'use strict';
  if (window.NovaPanicSmart) return;
  const DEFAULT_URL = 'https://classroom.google.com/';
  const KEY = 'nova_panic_smart_key', URL_KEY = 'nova_panic_smart_url', ENABLED = 'nova_panic_smart_enabled';
  const read = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
  const enabled = () => read(ENABLED, 'false') === 'true';
  const shortcut = () => read(KEY, 'F8').toUpperCase();
  const validURL = value => {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  };
  let overlay, previousFocus, recording = false, recordTimer, connectionScript;
  const documents = new WeakSet(), frames = new WeakSet();

  function host() {
    let target = window;
    try { while (target.parent !== target && target.parent.NovaPanicSmart) target = target.parent; } catch {}
    return target.NovaPanicSmart;
  }

  function close() {
    if (!overlay) return;
    overlay.close();
    overlay.remove();
    overlay = null;
    if (previousFocus?.isConnected) previousFocus.focus({preventScroll: true});
  }

  function open() {
    const owner = host();
    if (owner !== api) return owner.open();
    if (!enabled() || overlay || window.NovaCommunity?.isSiteBanned()) return;
    previousFocus = document.activeElement;
    const destination = validURL(read(URL_KEY, DEFAULT_URL)) || DEFAULT_URL;
    overlay = document.createElement('dialog');
    overlay.id = 'nova-smart-overlay';
    overlay.setAttribute('aria-label', 'Panic Button Smart');
    overlay.innerHTML = '<button type="button" data-back>← Go back to Nova</button><div data-panic-status role="status">Connecting to the website…</div><div data-panic-view></div>';
    const activeOverlay=overlay;
    const launch=async()=>{
      const notice=activeOverlay.querySelector('[data-panic-status]');notice.textContent='Connecting to the website…';notice.hidden=false;
      try{
        if(!window.NovaConnection){connectionScript??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/src/connection.js?v=20261102-panic466';script.onload=resolve;script.onerror=()=>{connectionScript=null;reject(Error('Nova connection could not load.'))};document.head.append(script)});await connectionScript}
        if(overlay!==activeOverlay)return;
        const controller=await window.NovaConnection.create({onRequestError:()=>{if(overlay===activeOverlay){notice.hidden=false;notice.textContent='The website could not be reached. Go back to Nova and try again.'}}});
        if(overlay!==activeOverlay)return;
        const view=controller.createFrame();view.element.title='Your Smart Panic website';view.element.setAttribute('sandbox','allow-scripts allow-forms allow-same-origin allow-downloads');
        activeOverlay.querySelector('[data-panic-view]').replaceChildren(view.element);
        view.element.addEventListener('load',()=>{if(overlay===activeOverlay)notice.hidden=true});
        view.go(destination);
      }catch(error){if(overlay===activeOverlay)notice.textContent='The proxy could not connect. Go back to Nova and try again.'}
    };
    launch();
    overlay.querySelector('[data-back]').onclick = close;
    overlay.addEventListener('cancel', event => { event.preventDefault(); close(); });
    document.body.appendChild(overlay);
    // Top-layer modal covers Nova without navigating or replacing its pages.
    overlay.showModal();
    overlay.querySelector('button').focus();
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }

  function status(message) {
    const el = document.getElementById('panicSmartStatus');
    if (el) el.textContent = message;
  }

  function refresh() {
    const display = document.getElementById('panicSmartKeyDisplay');
    if (display && !recording) display.textContent = shortcut();
    const toggle = document.getElementById('panicSmartEnabled');
    if (toggle) toggle.checked = enabled();
  }

  function cancelRecording() {
    recording = false;
    clearTimeout(recordTimer);
    if (document.documentElement.dataset.novaPanicRecording === 'smart') delete document.documentElement.dataset.novaPanicRecording;
    refresh();
  }

  function record() {
    if (document.documentElement.dataset.novaPanicRecording === 'legacy') return;
    recording = true;
    document.documentElement.dataset.novaPanicRecording = 'smart';
    document.getElementById('panicSmartKeyDisplay').textContent = 'Press a key…';
    status('Press one key. Escape cancels. Avoid keys you use for typing or games.');
    clearTimeout(recordTimer);
    recordTimer = setTimeout(() => { cancelRecording(); status('Key selection cancelled.'); }, 10000);
  }

  function onKey(event) {
    if (event.defaultPrevented || event.repeat || event.isComposing) return;
    const doc = event.target?.ownerDocument || document;
    if (recording && doc === document) {
      event.preventDefault(); event.stopImmediatePropagation();
      const key = event.key.toUpperCase();
      if (key === 'ESCAPE') { cancelRecording(); status('Key selection cancelled.'); return; }
      if (['CONTROL','ALT','SHIFT','META','UNIDENTIFIED'].includes(key) || event.ctrlKey || event.altKey || event.metaKey) {
        status('Choose a single key without Ctrl, Alt, or Command.'); return;
      }
      if (key === read('nova_panic_key', '').toUpperCase()) {
        status('That key already belongs to the original Panic Key. Choose a different key.'); return;
      }
      try { localStorage.setItem(KEY, key); } catch { status('Your browser could not save the key.'); cancelRecording(); return; }
      cancelRecording(); status(`Smart Panic key saved: ${key === ' ' ? 'Space' : key}`);
      return;
    }
    if (doc.documentElement.dataset.novaPanicRecording || !enabled()) return;
    if (event.ctrlKey || event.altKey || event.metaKey || event.key.toUpperCase() !== shortcut()) return;
    // Preserve an existing redirect key if it predates Smart Panic settings.
    if (shortcut() === read('nova_panic_key', '').toUpperCase()) return;
    event.preventDefault(); event.stopImmediatePropagation();
    open();
  }

  function watchFrame(frame) {
    if (frame.closest('#nova-smart-overlay')) return;
    const attach = () => { try { if (frame.contentDocument) watchDocument(frame.contentDocument); } catch {} };
    if (!frames.has(frame)) { frames.add(frame); frame.addEventListener('load', attach); }
    attach();
  }

  function watchDocument(doc) {
    if (documents.has(doc)) return;
    documents.add(doc);
    doc.defaultView?.addEventListener('keydown', onKey, true);
    doc.querySelectorAll('iframe').forEach(watchFrame);
    const observer = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches('iframe')) watchFrame(node);
        node.querySelectorAll('iframe').forEach(watchFrame);
      }
    });
    observer.observe(doc, {childList: true, subtree: true});
  }

  const api = window.NovaPanicSmart = {open, close, cancelRecording};
  watchDocument(document);
  window.addEventListener('storage', refresh);
  function init() {
    const style = document.createElement('style');
    style.textContent = `#nova-smart-overlay{position:fixed!important;inset:0!important;box-sizing:border-box;margin:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;border:0!important;padding:0!important;background:#f5f5f5;z-index:2147483647;overflow:hidden}#nova-smart-overlay::backdrop{background:#111}#nova-smart-overlay [data-panic-view]{position:absolute;inset:0}#nova-smart-overlay iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:white}#nova-smart-overlay [data-back]{position:absolute;left:16px;top:16px;z-index:5;padding:12px 17px;border-radius:15px;border:1px solid #ffffff60;background:#20202080;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:inset 0 1px #ffffff35,0 5px 20px #0002;color:#fff;font:500 13px system-ui;cursor:pointer;transition:background .2s,transform .2s}#nova-smart-overlay [data-back]:hover{background:#303030ab;transform:translateY(-1px)}#nova-smart-overlay [data-back]:focus-visible{outline:2px solid #fff;outline-offset:3px}#nova-smart-overlay [data-panic-status]{position:absolute;z-index:4;left:16px;bottom:20px;max-width:calc(100% - 32px);padding:12px 16px;border-radius:12px;background:#202020b0;color:white;font:13px system-ui;backdrop-filter:blur(15px)}#nova-smart-overlay [hidden]{display:none!important}@media(prefers-reduced-motion:reduce){#nova-smart-overlay [data-back]{transition:none}}`;
    document.head.appendChild(style);
    const keyButton = document.getElementById('panicSmartKeyBtn');
    if (keyButton) {
      keyButton.onclick = record;
      const urlInput = document.getElementById('panicSmartUrl');
      urlInput.value = read(URL_KEY, DEFAULT_URL);
      document.getElementById('panicSmartSave').onclick = () => {
        const url = validURL(urlInput.value.trim());
        if (!url) { status('Enter a full http:// or https:// website address.'); return; }
        try { localStorage.setItem(URL_KEY, url); urlInput.value = url; status('Smart Panic website saved.'); }
        catch { status('Your browser could not save this setting.'); }
      };
      document.getElementById('panicSmartEnabled').onchange = event => {
        try { localStorage.setItem(ENABLED, String(event.target.checked)); status(event.target.checked ? 'Smart Panic enabled.' : 'Smart Panic disabled.'); }
        catch { status('Your browser could not save this setting.'); }
        refresh();
        host().refresh?.();
      };
    }
    refresh();
  }
  api.refresh = refresh;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
