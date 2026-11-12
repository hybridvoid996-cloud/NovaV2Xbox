import {blankTabStyle,shouldOpenBlank} from './blank-tab-policy.mjs';
export function launchBlank({open=window.open.bind(window),url=location.href,store=localStorage}={}){
 const target=new URL(url,location.href);if(target.origin!==location.origin||target.pathname!=='/home.html')return false;
 const popup=open('about:blank','_blank');if(!popup||popup.closed)return false;
 try{
  const style=blankTabStyle(store.getItem('nova_cloak_title'),store.getItem('nova_cloak_icon'),location.origin),doc=popup.document;
  popup.__novaBlankHost=true;doc.title=style.title;doc.documentElement.lang='en';doc.documentElement.style.cssText='height:100%;background:#08090b';doc.body.style.cssText='margin:0;height:100%;overflow:hidden;background:#08090b';
  const icon=doc.createElement('link');icon.rel='icon';icon.href=style.icon;doc.head.append(icon);
  const frame=doc.createElement('iframe');frame.id='nova-blank-frame';frame.title='Your Nova workspace';frame.setAttribute('data-nova-src',target.href);frame.allow='autoplay; fullscreen; microphone; camera; clipboard-read; clipboard-write; display-capture';frame.allowFullscreen=true;frame.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0';doc.body.append(frame);
  const runtime=doc.createElement('script');runtime.src=new URL('/src/blank-host.js?v=20261030-blank412',location.origin).href;
  runtime.onerror=()=>{popup.location.replace(target.href)};doc.head.append(runtime);
  popup.opener=null;popup.focus();return true;
 }catch{try{popup.close()}catch{}return false}
}
export async function openSignedInBlank(){
 if(!shouldOpenBlank({authenticated:true,complete:true,topLevel:window===top,hosted:window.NovaBlankHosted,enabled:localStorage.getItem('nova_auto_blank')!=='false',regular:new URLSearchParams(location.search).get('nova-regular')==='1'}))return false;
 window.NovaBlankLaunching=true;window.NovaHomeBoot?.stage('Loading about:blank…');
 const complete=()=>{window.NovaDynoStoper?.allowNextNavigation();try{window.close()}catch{}location.replace('about:blank')};
 if(launchBlank()){complete();return true}
 // Browsers may require a genuine gesture. Keep the loading cover in place
 // until that gesture opens the workspace, without rendering Home underneath.
 window.NovaHomeBoot?.stage('Loading about:blank… Click anywhere to open Nova.');
 const pending=new AbortController();let finish;const opened=new Promise(resolve=>finish=resolve);
 const retry=e=>{
  if(!e.isTrusted||e.type==='keydown'&&(e.repeat||e.ctrlKey||e.metaKey||e.altKey||!['Enter',' '].includes(e.key)))return;
  if(localStorage.getItem('nova_auto_blank')==='false'){pending.abort();window.NovaBlankLaunching=false;finish(false);return}
  if(launchBlank()){pending.abort();e.preventDefault();e.stopImmediatePropagation();finish(true);complete()}
  else window.NovaNotice?.('system',{title:'Allow Nova to open its workspace',text:'Your browser blocked the blank tab. Allow popups for this Nova address in your browser settings.'});
 };
 addEventListener('click',retry,{capture:true,signal:pending.signal});
 addEventListener('keydown',retry,{capture:true,signal:pending.signal});
 return opened;
}
