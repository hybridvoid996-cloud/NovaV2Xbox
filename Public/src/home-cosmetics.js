(()=>{
const assets=new Map(),fonts={default:'inherit',serif:'Georgia, serif',mono:'monospace',rounded:'Trebuchet MS, sans-serif',heavy:'Arial Black, sans-serif'};
const image=(src,cls)=>{const img=new Image();img.src=src;img.alt='';img.className=cls;img.draggable=false;img.onerror=()=>img.remove();return img};
const asset=(id,kind)=>{const item=assets.get(id);return item?.kind===kind?item.src:''};
function name(node,p={}){node.textContent=p.name||'Guest';node.classList.add('nova-home-name');node.style.fontFamily=fonts[p.usernameFont]||fonts.default;node.style.setProperty('--role-from',p.nameRole?.from||'#a7afc4');node.style.setProperty('--role-to',p.nameRole?.to||'#eeeeff')}
function avatar(host,p={},showEffect=true){
 host.replaceChildren();host.classList.add('nova-home-avatar');host.dataset.nitro=p.nitroAnimation||'none';
 const face=document.createElement('span');face.className='nova-home-face';face.textContent=(p.name||'N')[0].toUpperCase();
 if(typeof p.photo==='string'&&/^(https?:|data:image\/|blob:)/.test(p.photo)){const img=image(p.photo,'nova-home-photo');img.onerror=()=>img.remove();face.append(img)}
 host.append(face);const effect=showEffect&&asset(p.effect,'effect');if(effect)host.append(image(effect,'nova-home-avatar-effect'));
 const decoration=asset(p.decoration,'decoration');if(decoration)host.append(image(decoration,'nova-home-decoration'));
 const dot=document.createElement('span');dot.className='nova-home-presence';dot.dataset.status=p.status||(p.online?'online':'offline');dot.setAttribute('aria-label',dot.dataset.status);host.append(dot);
}
function surface(host,p={},chat=false){
 host.classList.add('nova-home-surface');host.dataset.profileTheme=p.profileTheme||'default';
 host.querySelectorAll(':scope > .nova-home-effect, :scope > .nova-home-banner').forEach(n=>n.remove());
 const banner=chat?(asset(p.chatBanner,'banner')||asset(p.banner,'banner')||(typeof p.banner==='string'&&/^(https:|data:image\/)/.test(p.banner)?p.banner:'')):(typeof p.banner==='string'&&/^https?:|^data:image\//.test(p.banner)?p.banner:'');
 host.classList.toggle('nova-home-has-banner',!!banner);if(banner)host.prepend(image(banner,'nova-home-banner'));
 const effect=asset(p.effect,'effect');if(effect)host.prepend(image(effect,'nova-home-effect'));
}
let coinOwner,coins;
function resetCoins(){const owner=localStorage.getItem('nova_user');if(owner===coinOwner)return;coinOwner=owner;coins=undefined;try{const saved=JSON.parse(localStorage.getItem('nova-progress-'+owner));if(Number.isSafeInteger(saved?.coins)&&saved.coins>=0)coins=saved.coins}catch{}}
function balance(value){resetCoins();if(Number.isSafeInteger(value)&&value>=0)coins=value;const status=document.querySelector('.profile small');if(!status)return;let count=status.querySelector('.nova-home-coins');if(!count){count=document.createElement('span');count.className='nova-home-coins';status.append(count)}count.hidden=coins===undefined;count.textContent=coins===undefined?'':' · '+coins.toLocaleString()+' coins';count.setAttribute('aria-label',coins===undefined?'Coin balance loading':coins.toLocaleString()+' Nova Coins');window.novaHomeCoins=coins}
function header(){const p=window.novaHomeProfile||{};const n=document.getElementById('username'),a=document.querySelector('.profile .avatar');if(n)name(n,p);if(a)avatar(a,p);balance()}
window.NovaHomeCosmetics={avatar,name,surface,header,balance};
addEventListener('nova-profile-changed',header);addEventListener('nova-server-progress',e=>balance(e.detail?.coins));
addEventListener('storage',()=>balance());
addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.novaAction!=='novaCoinsChanged')return;const frame=[...document.querySelectorAll('iframe')].find(f=>f.contentWindow===e.source);if(frame&&Number.isSafeInteger(e.data.coins)&&e.data.coins>=0)dispatchEvent(new CustomEvent('nova-server-progress',{detail:{coins:e.data.coins}}))});
fetch('/profile-assets/catalog.json').then(r=>{if(!r.ok)throw Error('Catalog unavailable');return r.json()}).then(items=>{for(const item of items)assets.set(item.id,item);dispatchEvent(new Event('nova-profile-changed'));dispatchEvent(new Event('nova-guide-data'))}).catch(()=>{});
})();
