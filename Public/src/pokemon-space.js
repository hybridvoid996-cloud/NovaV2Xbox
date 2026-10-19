(() => {
const root = document.documentElement;
const id = Number(root.dataset.pokemonId);
const base = new URL('/content/pokemon-space/', location.href);
const start = document.querySelector('#start');
const status = document.querySelector('#status');
const retry = document.querySelector('#retry');
const abort = new AbortController();
let busy = false, timer, poll, blob;
function fail(message) {
  clearTimeout(timer); clearInterval(poll);
  root.dataset.pokemonState = 'error';
  status.hidden = false; status.textContent = message;
  retry.hidden = false;
}
retry.onclick = () => location.reload();
start.onclick = async () => {
  if (busy) return;
  busy = true; start.disabled = true;
  root.dataset.pokemonState = 'loading';
  status.hidden = false; status.textContent = 'Loading game files…';
  timer = setTimeout(() => { abort.abort(); fail('Loading took too long. Check your connection and try again.'); }, 120000);
  try {
    const response = await fetch(new URL('manifest.json', base), {signal: abort.signal});
    if (!response.ok) throw Error('Game information could not load.');
    const manifest = await response.json();
    const config = manifest.games.find(game => game.id === id);
    if (!config?.files?.length) throw Error('Game files are unavailable.');
    // Two downloads at a time keep large DS games from flooding slower connections.
    const buffers = new Array(config.files.length);
    let next = 0, complete = 0;
    await Promise.all(Array.from({length: Math.min(2, config.files.length)}, async () => {
      while (next < config.files.length) {
        const index = next++, file = config.files[index];
        const res = await fetch(new URL(file.path, base), {signal: abort.signal});
        if (!res.ok) throw Error('A game file could not download.');
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength !== file.bytes) throw Error('A game file was incomplete.');
        buffers[index] = buffer; complete++;
        status.textContent = `Loading game files: ${complete}/${config.files.length}`;
      }
    }));
    blob = URL.createObjectURL(new Blob(buffers));
    buffers.length = 0;
    document.querySelector('#welcome').hidden = true;
    document.querySelector('#game').hidden = false;
    status.textContent = 'Starting emulator…';
    const runtime = new URL('/content/emulator/pokemon-red/', location.href).href;
    Object.assign(window, {
      EJS_player: '#game', EJS_core: config.core, EJS_gameUrl: blob,
      EJS_gameName: `nova-pokemon-${id}`, EJS_pathtodata: runtime,
      EJS_startOnLoaded: true, EJS_threads: false, EJS_color: '#65d998',
      EJS_onGameStart() {
        clearTimeout(timer); clearInterval(poll);
        root.dataset.pokemonState = 'running'; status.hidden = true;
      }
    });
    poll = setInterval(() => {
      const message = window.EJS_emulator?.textElem?.textContent || '';
      if (/networkerror|failed to|not found|unavailable/i.test(message)) fail(message);
    }, 1000);
    const script = document.createElement('script');
    script.src = runtime + 'loader.js?v=20261017-pokemon137';
    script.onerror = () => fail('The emulator could not load. Please try again.');
    document.head.append(script);
  } catch (error) { abort.abort(); fail(error.name === 'AbortError' ? 'Loading was interrupted. Please try again.' : error.message); }
};
addEventListener('pagehide', () => {
  abort.abort(); clearTimeout(timer); clearInterval(poll);
  if (blob) URL.revokeObjectURL(blob);
}, {once: true});

})();
