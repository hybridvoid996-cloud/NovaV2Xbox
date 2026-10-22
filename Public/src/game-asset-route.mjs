export function repairGameAssetURL(target, gameId) {
 if (String(gameId) === '36' && target.hostname === 'cdn.jsdelivr.net' && target.pathname.startsWith('/gh/genizy/google-class/monster-tracks/')) {
  return new URL('https://raw.githubusercontent.com/genizy/google-class/main/monster-tracks/' + target.pathname.slice('/gh/genizy/google-class/monster-tracks/'.length) + target.search);
 }
 // This export names its five shared sounds without the legacy level suffix.
 if (String(gameId) === '275' && target.hostname === 'cdn.jsdelivr.net' && /^\/gh\/bubbls\/UGS-Assets@[a-f0-9]{40}\/circlo02\/html5game_a5\/snd_(?:music|levelgrow|levelfinished|menu_choose|menu_back)_circloo1\.ogg$/.test(target.pathname)) {
  const result = new URL(target); result.pathname = result.pathname.replace('_circloo1.ogg', '.ogg'); return result;
 }
 if (String(gameId) === '794' && target.hostname === 'cdn.jsdelivr.net' && target.pathname === '/content/games/fonts/mplus-1m-regular.ttf') return new URL('https://cdn.jsdelivr.net/gh/web-ports/fear-and-hunger-2@latest/fonts/mplus-1m-regular.ttf');
 const fearRoot = '/gh/web-ports/fear-and-hunger-2@latest/';
 if (String(gameId) === '794' && target.hostname === 'cdn.jsdelivr.net' && target.pathname.startsWith(fearRoot)) {
  const result = new URL(target); result.pathname = fearRoot + target.pathname.slice(fearRoot.length).toLowerCase(); return result;
 }
 return target;
}
