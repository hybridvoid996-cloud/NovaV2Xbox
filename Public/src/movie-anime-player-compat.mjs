// Keep Nova's audio choice in step with the public anime players' own settings.
export function animePlayerHTML(html,value){
 let url;try{url=new URL(value)}catch{return html}
 if(url.protocol!=='https:')return html;
 const audio=url.searchParams.get('lang');
 if(!['sub','dub'].includes(audio))return html;
 let settings;
 if(url.hostname==='ani.pm'&&/^\/ani\/[a-z0-9-]+$/i.test(url.pathname))settings=`const key='anipm:app:v1';let prefs={};try{prefs=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{}localStorage.setItem(key,JSON.stringify({...prefs,defaultLang:${JSON.stringify(audio)}}));`;
 else if(url.hostname==='hianime.ms'&&/^\/watch-[a-z0-9-]+-episode-\d+-[a-z0-9]+$/i.test(url.pathname)){
  settings=`localStorage.setItem('hk-audio',${JSON.stringify(audio)});`;
  // The watch page's own redirect is incompatible with any embedded player.
  // Nova already sandboxes top navigation; remove only this exact frame-buster.
  html=html.replace('if(window.top!==window.self){window.top.location.href=window.location.href;}','');
 }else return html;
 const script='<script>try{'+settings+'}catch{}</script>';
 return /<head\b[^>]*>/i.test(html)?html.replace(/<head\b[^>]*>/i,head=>head+script):script+html;
}
