import {isLocalNova} from './blank-tab-policy.mjs';

// A browser may deny automatic popups. Never trap startup behind a button or
// retry loop: continue in this tab when a blank workspace cannot be opened.
export function routeBlankEntry({href,enabled=true,launch,navigate}){
 const entry=new URL(href),home=new URL('/home.html',entry.origin);
 home.search=entry.search;home.hash=entry.hash;
 const regular=home.searchParams.get('nova-regular')==='1';
 if(enabled&&!regular&&!isLocalNova(entry.hostname)){
  let opened=false;
  try{opened=launch({url:home.href})===true}catch{}
  if(opened){navigate('about:blank');return 'blank'}
 }
 home.searchParams.set('nova-regular','1');
 navigate(home.href);
 return 'regular';
}
