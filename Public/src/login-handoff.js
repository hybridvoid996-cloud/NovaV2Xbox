import {browserLocalPersistence,setPersistence,signInWithCustomToken} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
const storageKey='nova-login-handoff',attemptKey='nova-login-handoff-attempted';
const random=()=>{const bytes=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')};
const hash=async value=>btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
async function request(url,options={},timeout=8000){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);try{const response=await fetch(url,{...options,cache:'no-store',credentials:'omit',signal:controller.signal});const data=await response.json();if(!response.ok)throw Error(data.error||'Shared login is unavailable.');return data}finally{clearTimeout(timer)}}
export const loginConfig=()=>request('/api/login-handoff');
export async function automaticLogin(auth){
 if(window.top!==window||!['/','/home.html','/account.html','/index.html'].includes(location.pathname))return;
 try{
  const query=new URLSearchParams(location.search);
  const failedAt=Number(sessionStorage.getItem('nova-login-failed-at'));if(failedAt&&Date.now()-failedAt>60000){sessionStorage.removeItem('nova-login-main-unavailable');sessionStorage.removeItem(attemptKey);sessionStorage.removeItem('nova-login-failed-at')}
  if(auth.currentUser&&!auth.currentUser.isAnonymous){sessionStorage.removeItem('nova-login-main-unavailable');sessionStorage.removeItem('nova-login-failed-at');return;}
  if(query.has('logout')){localStorage.setItem('nova-login-handoff-signed-out','1');return}
  if(auth.currentUser&&!auth.currentUser.isAnonymous||query.has('add')||query.has('local-login')||sessionStorage.getItem('nova-login-main-unavailable')||localStorage.getItem('nova-login-handoff-signed-out')||sessionStorage.getItem('nova-adding-account')||sessionStorage.getItem(attemptKey))return;
  const config=await loginConfig();
  if(!config.primary||config.primary===location.origin||!(config.trusted.includes(location.origin)||config.userApproval&&new URL(location.origin).protocol==='https:'))return;
  // Check reachability and the ORIGINAL site's allowlist before navigating away.
  const original=await request(new URL('/api/login-handoff',config.primary),{},2500);
  if(original.primary!==config.primary||!(original.trusted.includes(location.origin)||original.userApproval&&new URL(location.origin).protocol==='https:'))return;
  const state=random(),verifier=random(),challenge=await hash(verifier);
  sessionStorage.setItem(attemptKey,'1');sessionStorage.setItem(storageKey,JSON.stringify({state,verifier,primary:config.primary,expiresAt:Date.now()+720000,returnPath:location.pathname==='/account.html'?'/home.html':location.pathname+location.search}));
  const url=new URL('/login-bridge.html',config.primary);url.hash=new URLSearchParams({state,challenge,target:location.origin}).toString();
  location.replace(url.href);await new Promise(()=>{});
 }catch{sessionStorage.setItem('nova-login-failed-at',String(Date.now()));sessionStorage.setItem('nova-login-main-unavailable','1'); /* Stay on this copy and use its server-backed login. */ }
}
export async function bridge(auth){
 const saved=sessionStorage.getItem('nova-login-bridge-pending');const parameters=new URLSearchParams(location.hash.slice(1)||saved||''),state=parameters.get('state'),target=parameters.get('target'),challenge=parameters.get('challenge'),config=await loginConfig();
 if(location.origin!==config.primary||target===config.primary||!(config.trusted.includes(target)||config.userApproval&&validDestination(target))||!/^[-_A-Za-z0-9]{43}$/.test(state||'')||!/^[-_A-Za-z0-9]{43}$/.test(challenge||''))throw Error('This Nova login destination has not been approved.');
 history.replaceState(null,'',location.pathname);
 if(!auth.currentUser||auth.currentUser.isAnonymous){sessionStorage.setItem('nova-login-bridge-pending',parameters.toString());location.replace('/account.html?bridge=1');return}
 sessionStorage.removeItem('nova-login-bridge-pending');
 const approved=config.trusted.includes(target)||await approveDestination(auth.currentUser.uid,target);
 const callback=new URL('/login-callback.html',target),result=new URLSearchParams({state});
 try{
  if(!approved)throw Error('not-approved');
  const response=await request('/api/login-handoff',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await auth.currentUser.getIdToken()},body:JSON.stringify({action:'issue',target,challenge,approved})});result.set('code',response.code);
 }catch{result.set('error','unavailable')}
 callback.hash=result.toString();location.replace(callback.href);
}
export async function completeLogin(auth){
 const parameters=new URLSearchParams(location.hash.slice(1));history.replaceState(null,'',location.pathname);
 let pending;try{pending=JSON.parse(sessionStorage.getItem(storageKey)||'null')}catch{}
 sessionStorage.removeItem(storageKey);
 if(!pending||parameters.get('state')!==pending.state||pending.expiresAt<Date.now())throw Error('This login request expired. Please sign in normally.');
 const config=await loginConfig();
 if(config.primary!==pending.primary||!(config.trusted.includes(location.origin)||config.userApproval&&new URL(location.origin).protocol==='https:'))throw Error('Shared login is not enabled on this Nova site.');
 if(parameters.has('error')){location.replace('/account.html');return}
 if(!auth.currentUser||auth.currentUser.isAnonymous){
  const result=await request(new URL('/api/login-handoff',pending.primary),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'redeem',code:parameters.get('code'),verifier:pending.verifier})});
  await setPersistence(auth,browserLocalPersistence);await signInWithCustomToken(auth,result.token);
 }
 const path=typeof pending.returnPath==='string'&&pending.returnPath.startsWith('/')&&!pending.returnPath.startsWith('//')?pending.returnPath:'/home.html';
 location.replace(new URL(path,location.origin).origin===location.origin?path:'/home.html');
}

function validDestination(value){try{const url=new URL(value);return url.protocol==='https:'&&url.origin===value&&!url.username&&!url.password}catch{return false}}
async function approveDestination(uid,target){
 const key='nova-approved-copy:'+uid+':'+target;if(localStorage.getItem(key)==='1')return true;
 const status=document.getElementById('status');status.textContent='Allow '+target+' to use your Nova account? Only continue if you trust this website. It will receive a login session for your account.';
 document.getElementById('spinner').hidden=true;
 const actions=document.createElement('div');actions.className='login-approval-actions';
 const allow=document.createElement('button'),deny=document.createElement('button');allow.textContent='Allow this website';deny.textContent='Cancel';actions.append(allow,deny);status.after(actions);
 return new Promise(resolve=>{allow.onclick=()=>{localStorage.setItem(key,'1');actions.remove();resolve(true)};deny.onclick=()=>{actions.remove();resolve(false)}});
}
