// Movies need advancing playback; games/apps need recent trusted interaction.
export function findChallengeActivity(win,{now=Date.now(),lastInput=-Infinity,movie}={}){
 try{if(win.document.hidden||!win.document.hasFocus())return null}catch{return null}
 function scan(current,depth=0){if(depth>6)return null;try{
  const doc=current.document,url=new URL(current.location.href);if(doc.querySelector('dialog[open],.guide[open]'))return null;
  if(url.pathname.endsWith('/player.html')&&doc.body.classList.contains('ready')){const kind=url.searchParams.get('kind')||'game';if(['game','cloud','app'].includes(kind)&&now-lastInput<60000&&doc.hasFocus())return {active:true,kind,game:url.searchParams.get('id')}}
  if(url.pathname.endsWith('/novamovies.html')&&movie?.source===current&&doc.hasFocus()&&now-movie.at<12000&&!movie.ended)return {active:true,kind:'movie',game:String(movie.id),mediaType:movie.isAnime?'anime':movie.type,position:movie.position,season:movie.season,episode:movie.episode};
  const frames=[...doc.querySelectorAll('iframe')].filter(f=>!f.hidden&&f.getClientRects().length&&current.getComputedStyle(f).visibility!=='hidden');frames.sort((a,b)=>Number(b===doc.activeElement)-Number(a===doc.activeElement));for(const frame of frames){const found=scan(frame.contentWindow,depth+1);if(found)return found}
 }catch{}return null}
 return scan(win);
}
