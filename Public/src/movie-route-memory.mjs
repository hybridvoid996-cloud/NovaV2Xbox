// Remember only confirmed playback, never a page that merely finished loading.
export function createMovieRouteMemory(storage,now=Date.now){
 const key='nova-movie-working-routes-v1';
 const read=()=>{try{return JSON.parse(storage.getItem(key))||{}}catch{return {}}};
 return {
  order(title,routes){const entry=read()[title];return entry&&now()-entry.at<7*86400000&&routes.includes(entry.url)?[entry.url,...routes.filter(url=>url!==entry.url)]:routes.slice()},
  remember(title,url){try{const entries=Object.entries({...read(),[title]:{url,at:now()}}).filter(([,v])=>Number.isFinite(v?.at)&&now()-v.at<7*86400000).sort((a,b)=>b[1].at-a[1].at).slice(0,40);storage.setItem(key,JSON.stringify(Object.fromEntries(entries)))}catch{}}
 };
}
