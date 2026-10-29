const $ = id => document.getElementById(id);
const cosmetics = window.NovaHomeCosmetics;
let profile = {}, coins, roleList = [], stops = [];
function cached() {
  const uid = localStorage.getItem('nova_user');
  try { const slots = JSON.parse(localStorage.getItem('nova-account-slots') || '[]'); profile = slots.find(slot => slot.uid === uid) || { name: localStorage.getItem('nova_username') || 'Nova player' }; } catch { profile = { name: 'Nova player' }; }
  try { coins = JSON.parse(localStorage.getItem('nova-progress-' + uid) || '{}').coins; } catch {}
}
function paint() {
  window.novaHomeProfile = profile;
  cosmetics.name($('username'), profile); cosmetics.avatar($('cloud-avatar'), profile);
  cosmetics.surface($('cloud-profile'), profile);
  $('cloud-status').textContent = profile.status === 'dnd' ? 'Do not disturb' : profile.status === 'idle' ? 'Idle' : profile.online ? 'Online' : 'Offline';
  $('cloud-coins').textContent = Number.isSafeInteger(coins) && coins >= 0 ? coins.toLocaleString() + ' coins' : 'Coins loading…';
  cosmetics.surface($('cloud-profile-card'), profile); cosmetics.avatar($('profile-card-avatar'), profile); cosmetics.name($('profile-card-name'), profile);
  $('profile-card-bio').textContent = profile.bio || 'Your space. Your games. Your Nova.';
  $('profile-card-coins').textContent = Number.isSafeInteger(coins) && coins >= 0 ? coins.toLocaleString() + ' Nova Coins' : 'Coin balance unavailable';
  $('profile-card-roles').replaceChildren(...(roleList.length ? roleList : profile.nameRole ? [profile.nameRole] : []).map(role => { const chip = document.createElement('span'); chip.textContent = role.name; chip.style.setProperty('--role-from', role.from); chip.style.setProperty('--role-to', role.to); return chip; }));
}
cached(); paint();
$('cloud-profile').onclick = () => $('cloud-profile-dialog').showModal(); $('profile-card-close').onclick = () => $('cloud-profile-dialog').close();
addEventListener('nova-profile-changed', paint);
addEventListener('nova-server-progress', event => { if (Number.isSafeInteger(event.detail?.coins)) { coins = event.detail.coins; paint(); } });
addEventListener('storage', event => {
  if (event.key === 'nova_user' || event.key === 'nova-account-slots') { cached(); paint(); return; }
  if (event.key === 'nova-progress-' + localStorage.getItem('nova_user')) { try { const value = JSON.parse(event.newValue || '{}'); if (Number.isSafeInteger(value.coins)) coins = value.coins; } catch {} paint(); }
});
let home;
try { if (parent !== window && parent.NovaHomeCosmetics) home = parent; } catch {}
if (home) {
  const sync = () => { profile = home.novaHomeProfile || profile; coins = home.novaHomeCoins ?? coins; paint(); };
  home.addEventListener('nova-profile-changed', sync); home.addEventListener('nova-server-progress', sync); sync();
  addEventListener('pagehide', () => { home.removeEventListener('nova-profile-changed', sync); home.removeEventListener('nova-server-progress', sync); }, { once: true });
} else {
  try {
    const [{ auth, db }, { ref, onValue }, { rolesFor }, { control }] = await Promise.all([import('./account-firebase.js'), import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js'), import('./chat-server.js?v=20261029-chat387'), import('./control-client.js')]);
    auth.onAuthStateChanged(user => {
      stops.forEach(stop => stop()); stops = []; roleList = [];
      if (!user || user.isAnonymous) { profile = { name: 'Nova player', online: false }; coins = undefined; paint(); return; }
      let account = {}, chat = {}, role = 'member', customRoles = {}, memberRoles = {};
      const sync = () => {
        roleList = rolesFor(user.uid, { roles: { [user.uid]: role }, profiles: { [user.uid]: chat }, customRoles, memberRoles: { [user.uid]: memberRoles } });
        profile = { ...chat, name: chat.name || account.name || user.displayName || 'Nova player', photo: chat.photo || account.photo || user.photoURL || '', online: true, status: chat.status || 'online', nameRole: roleList.find(role => role.id === 'owner') || roleList.find(role => customRoles[role.id]) || roleList[0] }; paint();
      };
      const watch = (path, callback) => stops.push(onValue(ref(db, path), snapshot => { callback(snapshot.val()); sync(); }, () => {}));
      watch('novaAccounts/' + user.uid, value => account = value || {});
      watch('novaChatV2/profiles/' + user.uid, value => chat = value || {});
      watch('novaChatV2/roles/' + user.uid, value => role = value || 'member');
      watch('novaChatV2/customRoles', value => customRoles = value || {});
      watch('novaChatV2/memberRoles/' + user.uid, value => memberRoles = value || {});
      watch('novaControl/progress/' + user.uid, value => { if (Number.isSafeInteger(value?.coins)) coins = value.coins; });
      control('status').then(value => { if (auth.currentUser?.uid === user.uid && Number.isSafeInteger(value.progress?.coins)) { coins = value.progress.coins; paint(); } }).catch(() => {});
      sync();
    });
    addEventListener('pagehide', () => stops.forEach(stop => stop()), { once: true });
  } catch { $('cloud-coins').textContent = Number.isSafeInteger(coins) ? coins.toLocaleString() + ' coins' : 'Balance unavailable'; }
}
