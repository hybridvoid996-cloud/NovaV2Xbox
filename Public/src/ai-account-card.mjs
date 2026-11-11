import './home-cosmetics.js';
export function mountAIAccountCard(host){
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/src/home-cosmetics.css';document.head.append(sheet);
 const avatar=document.createElement('span'),copy=document.createElement('span'),name=document.createElement('strong'),hint=document.createElement('small');
 avatar.className='side-account-icon';copy.append(name,hint);host.replaceChildren(avatar,copy);
 let ownProfile=null,source=window;
 try{for(let i=0;i<4;i++){if(source.novaHomeProfile||source===source.parent)break;source=source.parent}}catch{source=window}
 function paint(){
  const p=source.novaHomeProfile||ownProfile||{name:localStorage.getItem('nova_username')||'Your account'};
  window.NovaHomeCosmetics.name(name,p);window.NovaHomeCosmetics.avatar(avatar,p);
  hint.textContent=p.username?'@'+p.username:'Your Nova profile';
 }
 source.addEventListener('nova-profile-changed',paint);addEventListener('nova-profile-changed',paint);addEventListener('storage',paint);paint();
 // Embedded AI uses the shell's live profile; standalone AI subscribes only to its own record.
 if(source===window&&!window.novaHomeProfile)Promise.all([import('./account-firebase.js'),import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js')]).then(([{auth,db},{ref,onValue}])=>{
  let stop;auth.onAuthStateChanged(user=>{stop?.();ownProfile=null;paint();if(user)stop=onValue(ref(db,'novaChatV2/profiles/'+user.uid),snapshot=>{const p=snapshot.val()||{};ownProfile={...p,name:p.displayName||p.name||user.displayName||localStorage.getItem('nova_username')||'Your account',photo:p.photo||user.photoURL||''};paint()},()=>{})});
 }).catch(()=>{});
}
