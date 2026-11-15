import {blankTabStyle,shouldOpenBlank} from './blank-tab-policy.mjs';
export function launchBlank({open=window.open.bind(window),url=location.href,store=localStorage}={}){
 const target=new URL(url,location.href);if(target.origin!==location.origin||target.pathname!=='/home.html')return false;
 let popup;try{popup=open('about:blank','_blank')}catch{return false}if(!popup||popup.closed)return false;
 try{
  const style=blankTabStyle(store.getItem('nova_cloak_title'),store.getItem('nova_cloak_icon'),location.origin),doc=popup.document;
  popup.__novaBlankHost=true;doc.title=style.title;doc.documentElement.lang='en';doc.documentElement.style.cssText='height:100%;background:#08090b';doc.body.style.cssText='margin:0;height:100%;overflow:hidden;background:#08090b';
  const viewport=doc.createElement('meta');viewport.name='viewport';viewport.content='width=device-width, initial-scale=1, viewport-fit=cover';doc.head.append(viewport);
  const icon=doc.createElement('link');icon.rel='icon';icon.href=style.icon;doc.head.append(icon);
  const frame=doc.createElement('iframe');frame.id='nova-blank-frame';frame.title='Your Nova workspace';frame.setAttribute('data-nova-src',target.href);frame.allow='autoplay; fullscreen; microphone; camera; clipboard-read; clipboard-write; display-capture; cross-origin-isolated';frame.allowFullscreen=true;frame.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0';doc.body.append(frame);
  const runtime=doc.createElement('script');runtime.src=new URL('/src/blank-host.js?v=20261115-auto1',location.origin).href;
  runtime.onerror=()=>{const fallback=new URL(target);fallback.searchParams.set('nova-regular','1');popup.location.replace(fallback.href)};doc.head.append(runtime);
  popup.opener=null;popup.focus();return true;
 }catch{try{popup.close()}catch{}return false}
}
export async function openSignedInBlank(){
 if(/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname))return false;
 if(!shouldOpenBlank({authenticated:true,complete:true,topLevel:window===top,hosted:window.NovaBlankHosted,enabled:localStorage.getItem('nova_auto_blank')!=='false',regular:new URLSearchParams(location.search).get('nova-regular')==='1'}))return false;
 window.NovaBlankLaunching=true;window.NovaHomeBoot?.stage('Loading about:blank…');
 const complete=()=>{window.NovaDynoStoper?.allowNextNavigation();try{window.close()}catch{}location.replace('about:blank')};
 if(launchBlank()){complete();return true}
 // Popups are a browser permission, not a loading prerequisite. Let the
 // caller finish normal startup instead of waiting indefinitely for a click.
 window.NovaBlankLaunching=false;
 window.NovaHomeBoot?.stage('Loading Nova assets…');
 return false;
}
