export const ROBLOX_LAUNCHER='https://321.tb2.net/assets/applications/content/tglscrblx/index2.html#home';
export const TGLSC_LOGIN='https://321.tb2.net/assets/applications/datapacks/register/';
export const ROBLOX_SESSION=ROBLOX_LAUNCHER.replace('#home','#session');
export function robloxLaunchMessage(event,source,token){if(!source||event.source!==source||!token)return null;let data=event.data;for(let i=0;i<4&&data?.$scramjet$messagetype==='window'&&Object.hasOwn(data,'$scramjet$data');i++)data=data.$scramjet$data;return data?.token===token&&data.novaAction==='robloxLaunch'?launchURL(data.url):null}
export function launchURL(value,base=ROBLOX_LAUNCHER){try{const u=new URL(String(value),base);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null;return u.href}catch{return null}}
export function launcherDocument(url){try{const u=new URL(url);return u.hostname==='321.tb2.net'&&(u.pathname.startsWith('/assets/applications/content/tglscrblx/')||u.pathname==='/assets/applications/datapacks/register/'||u.pathname==='/')}catch{return false}}
export function launcherLoginHTML(target,html){
 if(target.origin!=='https://321.tb2.net'||target.pathname!=='/assets/applications/datapacks/register/')return html;
 // The provider now sends successful logins to its account profile, not home.
 // Preserve password/OTP requests and change only their successful destination.
 return html.replace(/window\.location\.replace\(isEmbedded \? '\/assets\/applications\/datapacks\/profile\/' : '\/assets\/applications\/datapacks\/profile\/'\);/, 'window.location.replace('+JSON.stringify(ROBLOX_LAUNCHER)+');');
}
function launcherRuntime(config){
 const notify=(value)=>{if(!value||value==='about:blank')return;const data={novaAction:'robloxLaunch',token:config.token,url:String(value)};try{if(document.documentElement)document.documentElement.dataset.novaRobloxLaunch=JSON.stringify(data)}catch{}parent.postMessage(data,'*')};
 // Some launchers open an empty window first, then assign its destination later.
 const popup=()=>{let value='about:blank',closed=false;const loc={};Object.defineProperty(loc,'href',{get:()=>value,set:v=>{value=String(v);notify(v)}});loc.assign=loc.replace=v=>{loc.href=v};loc.toString=()=>value;const result={focus(){},blur(){},close(){closed=true},postMessage(){},document:{open(){},write(){},close(){}}};Object.defineProperty(result,'closed',{get:()=>closed});Object.defineProperty(result,'location',{get:()=>loc,set:v=>{loc.href=v}});return result};
 window.open=function(url){const win=popup();if(url)win.location=url;return win};
 document.addEventListener('click',e=>{const a=e.target.closest?.('a[target="_blank"]');if(!a||!a.href)return;e.preventDefault();notify(a.href)},true);
 // Observe only the provider's confirmed identity label, never login fields.
 // Email/OTP and saved-session checks update this label asynchronously.
 let identityObserver,observedIdentity,returning=false;
 const finishRobloxSignIn=()=>{if(location.hash!=='#session'){returning=false;identityObserver?.disconnect();observedIdentity=null;return}const identity=document.querySelector('#session-identity');if(identity&&identity!==observedIdentity&&typeof MutationObserver!=='undefined'){identityObserver?.disconnect();observedIdentity=identity;identityObserver=new MutationObserver(finishRobloxSignIn);identityObserver.observe(identity,{childList:true,characterData:true,subtree:true})}if(!returning&&/^Signed in as\s+.+\s+\(\d+\)\s*$/.test(identity?.textContent?.trim()||'')){returning=true;notify(config.launcher)}};
 const brand=()=>{if(location.pathname==='/'&&document.querySelector('iframe[src*="/tglscrblx/"]'))notify(config.launcher);const logo=document.querySelector('#topbar a[aria-label="TGLSCRBLX home"]');if(logo){logo.textContent='Nova Roblox';logo.setAttribute('aria-label','Nova Roblox home')}if(document.title.endsWith(' · TGLSC'))document.title=document.title.replace(' · TGLSC',' · Nova Roblox')};
 const ready=()=>{brand();finishRobloxSignIn()};document.addEventListener('DOMContentLoaded',ready,{once:true});addEventListener('hashchange',ready);addEventListener('pagehide',()=>identityObserver?.disconnect(),{once:true});ready();
}
export async function robloxLauncherResponse(target,response,{token}={}){
 if(!launcherDocument(target.href)||response.status!==200||!response.headers.some(([k,v])=>k.toLowerCase()==='content-type'&&v.includes('text/html')))return response;
 const body=launcherLoginHTML(target,typeof response.body==='string'?response.body:await new Response(response.body).text());
 const css=':root{color-scheme:dark;--accent:#e7e9ef}body{font-family:Inter,system-ui,sans-serif!important;background:#101114!important;color:#ededf2!important}#topbar{background:#18191ddc!important;border-bottom:1px solid #ffffff16!important;backdrop-filter:blur(16px)}#side{background:#141519cc!important;border-right:1px solid #ffffff12!important}#global-query{border-radius:16px!important;background:#ffffff09!important;border:1px solid #ffffff20!important}#home-banner{border-radius:20px!important;background:linear-gradient(120deg,#ffffff12,#ffffff03)!important;border:1px solid #ffffff18!important}#home-rows a{border-radius:16px;transition:transform .2s,box-shadow .2s}#home-rows a:hover{transform:translateY(-3px);box-shadow:0 12px 24px #0005}#gp-play{border-radius:14px!important;background:#ededf2!important;color:#131419!important}::-webkit-scrollbar{width:0;height:0}@media(max-width:1400px){body{font-size:13px!important}#side{max-width:170px}#topbar{min-height:54px!important}}@media(prefers-reduced-motion:reduce){#home-rows a{transition:none!important;transform:none!important}}';
 const injection='<style data-nova-roblox>'+css+'</style><script>('+launcherRuntime.toString()+')('+JSON.stringify({token,launcher:ROBLOX_LAUNCHER}).replaceAll('<','\\u003c')+');</script>';
 const html=/<head(?:\s[^>]*)?>/i.test(body)?body.replace(/<head(?:\s[^>]*)?>/i,m=>m+injection):injection+body;
 return {...response,body:html,headers:response.headers.filter(([k])=>!['content-length','content-encoding'].includes(k.toLowerCase()))};
}
