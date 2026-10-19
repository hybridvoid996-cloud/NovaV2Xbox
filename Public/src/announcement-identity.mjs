let catalog;
const fonts={default:'inherit',serif:'Georgia,serif',mono:'monospace',rounded:'Trebuchet MS,sans-serif',heavy:'Arial Black,sans-serif'};
export function announcementIdentity(item){
 const member=(window.novaOSMembers||[]).find(p=>(p.key||p.uid)===item.author)||(window.novaHomeProfile?.key===item.author?window.novaHomeProfile:{});const profile={...item,...member,...Object.fromEntries(Object.entries(item.profile||{}).filter(([,value])=>value!==''&&value!=null))};const wrap=document.createElement('span');wrap.className='nova-announcement-avatar';wrap.dataset.nitro=profile.nitroAnimation||'none';
 profile.photo=profile.photo||item.photo;const photo=document.createElement('img');photo.className='nova-announcement-photo';photo.src=/^(https?:|data:image\/|\/)/.test(profile.photo||'')?profile.photo:'/Nova12.png';photo.alt='';photo.onerror=()=>{photo.onerror=null;photo.src='/Nova12.png'};wrap.append(photo);
 const name=document.createElement('strong');name.className='nova-announcement-name';name.textContent=profile.name||item.name||'Nova Owner';name.style.fontFamily=fonts[profile.usernameFont]||fonts.default;
 for(const key of ['from','to']){const value=profile.nameRole?.[key];if(/^#[a-f0-9]{3,8}$/i.test(value||''))name.style.setProperty('--name-'+key,value)}
 if(profile.effect||profile.decoration){catalog??=fetch('/profile-assets/catalog.json').then(r=>r.ok?r.json():[]).catch(()=>[]);catalog.then(items=>{if(!wrap.isConnected)return;for(const kind of ['effect','decoration']){const asset=items.find(a=>a.id===profile[kind]&&a.kind===kind);if(!asset||!/^\/(?!\/)/.test(asset.src||''))continue;const img=document.createElement('img');img.src=asset.src;img.className='nova-announcement-'+kind;img.alt='';img.onerror=()=>img.remove();wrap.append(img)}})}
 return [wrap,name];
}
