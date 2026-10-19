import { cloudHistory, recordCloudGame } from './cloud-history.js';
const $ = id => document.getElementById(id);
const el = (tag, text, cls) => { const node = document.createElement(tag); if (text) node.textContent = text; if (cls) node.className = cls; return node; };
const storageKey = () => 'nova_cloud_favorites_' + (localStorage.getItem('nova_user') || localStorage.getItem('nova_username') || 'guest');
const providerNames={"astra":"Nova Server 1","gsn":"Nova Server 2","ghost":"Nova Server 3","achroma":"Nova Server 4","synapse":"Nova Server 5","luna":"Nova Server 6","niche":"Nova Server 7"};
const providerLabel=game=>Object.keys(game.providers||{astra:{}}).filter(id=>providerNames[id]).map(id=>providerNames[id]).join(' + ');
let games = [], filter = 'all', selected, searchTimer, activeTab = 'explore';
const saved = () => { try { const rows = JSON.parse(localStorage.getItem(storageKey()) || '[]'); return Array.isArray(rows) ? rows : []; } catch { return []; } };
const motion = () => matchMedia('(prefers-reduced-motion:reduce)').matches || localStorage.getItem('nova_reduce_motion') === 'true' ? 'instant' : 'smooth';
function artwork(game, eager = false) {
  const img = new Image(); img.alt = ''; img.loading = eager ? 'eager' : 'lazy'; img.decoding = 'async'; img.width = 480; img.height = 320; img.src = game.art;
  img.onerror = () => { img.onerror = null; img.src = 'Nova12.png'; }; return img;
}
function paintFavorite(button, game, detail = false) {
  const yes = saved().includes(game.id); button.textContent = detail ? (yes ? '♥ In your library' : '♡ Add to library') : (yes ? '♥' : '♡');
  button.setAttribute('aria-pressed', String(yes)); button.setAttribute('aria-label', (yes ? 'Remove from library: ' : 'Add to library: ') + game.name);
}
function favorite(game) {
  const ids = saved(), index = ids.indexOf(game.id); index < 0 ? ids.push(game.id) : ids.splice(index, 1);
  try { localStorage.setItem(storageKey(), JSON.stringify(ids)); refreshPersonal(); render(); if (selected) paintFavorite($('details-favorite'), selected, true); }
  catch { $('error').hidden = false; $('error').textContent = 'Your library could not be saved. Your browser storage may be full.'; }
}
function card(game, recent = false) {
  const article = el('article', null, 'cloud-card'), cover = el('button', null, 'cover-button'); cover.type = 'button'; cover.setAttribute('aria-label', 'View ' + game.name);
  const overlay = el('span', null, 'cover-overlay'); overlay.append(el('span', 'CLOUD PLAY', 'cover-label'), el('strong', game.name), el('span', '▶ Explore game', 'cover-action'));
  cover.append(artwork(game), overlay); cover.onclick = () => details(game);
  const heart = el('button', null, 'favorite'); heart.dataset.gameId = game.id; heart.type = 'button'; paintFavorite(heart, game); heart.onclick = () => favorite(game);
  const title = el('h3', game.name); title.title = game.name;
  article.append(cover, heart, title, el('small', game.users ? game.users.toLocaleString() + (game.users === 1 ? ' user picked this' : ' users picked this') : recent ? playedLabel(game.playedAt) : 'Cloud play · ' + providerLabel(game))); if (game.rank) article.append(el('span', String(game.rank).padStart(2, '0'), 'cloud-rank')); return article;
}
function playedLabel(time) {
  const days = Math.floor(Math.max(0, Date.now() - time) / 86400000);
  return days === 0 ? 'Played today' : days === 1 ? 'Played yesterday' : 'Played ' + days + ' days ago';
}
function fill(host, rows, recent = false) { host.replaceChildren(...rows.map(game => card(game, recent))); }
function refreshPersonal() {
  const ids = saved(), rows = games.filter(game => ids.includes(game.id)); $('favorites-section').hidden = !rows.length; fill($('favorites-shelf'), rows);
  const history = cloudHistory(games); fill($('recent-shelf'), history.slice(0, 12), true); $('recent-empty').hidden = !!history.length;
  document.querySelectorAll('.favorite').forEach(button => { const game = games.find(game => game.id === button.dataset.gameId); if (game) paintFavorite(button, game); });
}
const searchName = name => name.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function render() {
  const query = $('cloud-search').value.trim(), tokens = searchName(query === 'gta' || query.toLowerCase() === 'gta' ? 'grand theft auto' : query).split(' ').filter(Boolean);
  const ids = saved(), base = filter === 'recent' ? cloudHistory(games) : games;
  let rows = base.filter(game => tokens.every(token => searchName(game.name).includes(token)) && (filter !== 'favorites' || ids.includes(game.id)));
  if ($('sort').value !== 'featured') rows.sort((a, b) => a.name.localeCompare(b.name) * ($('sort').value === 'za' ? -1 : 1));
  fill($('cloud-grid'), rows, filter === 'recent'); $('results-count').textContent = rows.length + ' ' + (rows.length === 1 ? 'game' : 'games');
  $('empty').hidden = rows.length > 0; $('empty').textContent = query ? 'No games found. Try a different name or clear your search.' : filter === 'favorites' ? 'Make this library yours. Tap a heart on any game to save it.' : filter === 'recent' ? 'Games you launch will appear here. Explore the library to get started.' : 'No games found.';
  $('results-title').textContent = query ? 'Search results' : filter === 'favorites' ? 'My library' : filter === 'recent' ? 'Recently played' : 'All cloud games';
  $('discovery').hidden = !!query || filter !== 'all'; $('clear-search').hidden = !query;
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  const active = query ? 'browse' : filter === 'favorites' ? 'my-library' : filter === 'recent' ? 'recent' : ['explore', 'browse'].includes(activeTab) ? activeTab : 'explore';
  document.querySelectorAll('.cloud-nav button').forEach(button => { const yes = button.id === active; button.classList.toggle('active', yes); if (yes) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
}
function details(game) { selected = game; $('details-art').src = game.art; $('details-name').textContent = game.name; $('details-provider').textContent = 'Available on '+providerLabel(game)+'. Launch through Nova and follow the provider’s connection prompts.'; paintFavorite($('details-favorite'), game, true); $('game-details').showModal(); }
function launch(game) {
  $('game-details').close(); recordCloudGame(game); refreshPersonal();
  let novaParent = false; try { novaParent = parent !== window && !!parent.NovaRecent && !parent.NovaSplit?.owns(window); } catch {}
  if (novaParent) parent.postMessage({ novaAction: 'cloudLaunch', id: game.id }, location.origin);
  else location.href = 'player.html?kind=cloud&id=' + encodeURIComponent(game.id);
}
function tab(id) {
  activeTab = id; filter = id === 'my-library' ? 'favorites' : id === 'recent' ? 'recent' : 'all'; $('cloud-search').value = ''; if (id === 'recent') $('sort').value = 'featured';
  render(); document.querySelectorAll('.cloud-nav button').forEach(button => { button.classList.toggle('active', button.id === id); if (button.id === id) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
  if (id === 'explore') window.scrollTo({ top: 0, behavior: motion() }); else $('all-games').scrollIntoView({ behavior: motion() });
}
for (const id of ['explore', 'recent', 'my-library', 'browse']) $(id).onclick = () => tab(id);
$('hero-browse').onclick = () => tab('browse'); $('view-favorites').onclick = () => tab('my-library'); $('view-recent').onclick = () => tab('recent');
$('details-close').onclick = () => $('game-details').close(); $('details-play').onclick = () => selected && launch(selected); $('details-favorite').onclick = () => selected && favorite(selected);
$('game-details').addEventListener('click', event => { if (event.target !== $('game-details')) return; const rect = event.target.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close(); });
$('cloud-search').oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(render, 80); };
$('sort').onchange = render; document.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => { filter = button.dataset.filter; if (filter === 'recent') $('sort').value = 'featured'; render(); });
function search(value) { clearTimeout(searchTimer); $('cloud-search').value = value; filter = 'all'; render(); $('all-games').scrollIntoView({ behavior: motion() }); }
document.querySelectorAll('[data-search]').forEach(button => button.onclick = () => search(button.dataset.search)); $('clear-search').onclick = () => { search(''); $('cloud-search').focus(); };
addEventListener('keydown', event => { if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) && !$('game-details').open) { event.preventDefault(); $('cloud-search').focus(); } });
document.querySelectorAll('[data-shelf]').forEach(button => button.onclick = () => $(button.dataset.shelf).scrollBy({ left: Number(button.dataset.direction) * $(button.dataset.shelf).clientWidth * .8, behavior: motion() }));
let popularRequest;
async function refreshPopular() {
  if (popularRequest || !games.length) return;
  popularRequest = true;
  try {
    const { loadCloudPopular } = await import('./cloud-popular.js');
    const { rankings } = await loadCloudPopular();
    const rows = rankings.map((row, i) => ({ ...games.find(game => game.id === row.id), users: row.users, rank: i + 1 })).filter(game => game.id);
    fill($('popular-shelf'), rows); $('popular-status').textContent = rows.length ? 'Ranked by unique Nova users' : 'Be the first to pick a game';
    $('popular-empty').hidden = !!rows.length; $('popular-empty').textContent = 'Community picks will appear as Nova users launch cloud games.';
  } catch {
    $('popular-status').textContent = 'Community rankings unavailable'; $('popular-empty').hidden = false;
    $('popular-empty').textContent = 'Community counts will appear when Nova’s live services are available.';
  } finally { popularRequest = false; }
}
function sync() { refreshPersonal(); render(); if (!document.hidden) refreshPopular(); }
addEventListener('storage', sync); addEventListener('pageshow', sync); document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
addEventListener('message', event => { if (event.origin === location.origin && event.source === parent && event.data?.novaAction === 'cloudLaunchError') { $('error').hidden = false; $('error').textContent = event.data.message; } });
try {
  const response = await fetch('library-cloud.json'); if (!response.ok) throw Error('Cloud library unavailable. Please try again.'); games = await response.json();
  $('catalog-count').textContent = games.length + ' games to discover'; $('source-count').textContent = games.length + ' games · Astra + Nova Cloud + GhostCloud + Achroma';
  const byName = name => games.find(game => game.name === name);
  fill($('spotlight'), ['Grand Theft Auto V', 'Fortnite', 'Hogwarts Legacy', 'Cyberpunk 2077', 'Elden Ring', 'Roblox', 'Forza Horizon 4', 'Marvel’s Spider-Man Remastered'].map(byName).filter(Boolean));
  fill($('discover-shelf'), ['Stardew Valley', 'Hades', 'Cuphead', 'Among Us', 'Stray', 'It Takes Two', 'Hollow Knight', 'Dead Cells', 'Rocket League Sideswipe', 'Clash Royale', "Baldur's Gate 3", 'The Witcher 3'].map(byName).filter(Boolean));
  const featured = byName('Grand Theft Auto V') || games[0]; $('hero-play').disabled = false; $('hero-play').textContent = '▶ Explore ' + featured.name; $('hero-play').onclick = () => details(featured);
  const heroGames = ['Cyberpunk 2077', 'Grand Theft Auto V', 'Forza Horizon 4', 'Fortnite', 'Hogwarts Legacy', 'Elden Ring', 'Roblox', 'Hades', 'Marvel’s Spider-Man Remastered'].map(byName).filter(Boolean);
  $('hero-art').replaceChildren(...[0, 1, 2].map(column => {
    const host = el('div', null, 'hero-column'), track = el('div', null, 'hero-track');
    const rows = heroGames.filter((_, index) => index % 3 === column);
    for (let repeat = 0; repeat < 2; repeat++) {
      const group = el('div', null, 'hero-group');
      for (const game of rows) { const frame = el('div', null, 'hero-cover'); frame.append(artwork(game, repeat === 0), el('span', game.name)); group.append(frame); }
      track.append(group);
    }
    host.append(track); return host;
  })); refreshPopular();
  refreshPersonal(); render();
} catch (error) { $('catalog-count').textContent = 'Library unavailable'; $('results-count').textContent = ''; $('error').hidden = false; $('error').textContent = error.message; }
