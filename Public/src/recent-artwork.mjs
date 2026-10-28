// Keep local artwork routes intact; older history sometimes wrapped them twice.
export function recentArtwork(value,kind='music'){
 if(typeof value!=='string'||value.length>60000)return '';
 if(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))return value;
 let src=value;
 for(let i=0;i<3;i++){
  if(!src.startsWith('/api/soundcloud?'))break;
  const u=new URL(src,'https://nova.invalid');
  if(u.searchParams.get('op')==='asset'&&u.searchParams.get('url')?.startsWith('/api/soundcloud?')){src=u.searchParams.get('url');continue}break;
 }
 if(/^\/api\/soundcloud\?op=(?:asset|void-art|noah-art|import-art)&/.test(src)||/^\/api\/movies\?op=image&/.test(src))return src;
 if(!src.startsWith('https://'))return '';
 let u;try{u=new URL(src)}catch{return ''}
 if(kind==='movie'&&['image.tmdb.org','s4.anilist.co'].includes(u.hostname))return '/api/movies?op=image&url='+encodeURIComponent(src);
 if(u.hostname==='resources.tidal.com')return '/api/soundcloud?op=noah-art&url='+encodeURIComponent(src);
 if(/^(?:i\.scdn\.co|is[1-5]-ssl\.mzstatic\.com)$/.test(u.hostname))return '/api/soundcloud?op=import-art&url='+encodeURIComponent(src);
 if(u.hostname.endsWith('.sndcdn.com')||u.hostname.endsWith('.soundcloud.cloud'))return '/api/soundcloud?op=asset&url='+encodeURIComponent(src);
 return src;
}
export function recentArtworkCandidates(item,kind){return [...new Set([item.art,item.poster,item.backdrop,item.thumb,item.thumbnail,...(Array.isArray(item.thumbs)?item.thumbs:[])].map(v=>recentArtwork(v,kind)).filter(Boolean))]}

export function setRecentMusicCover(img,track){
 const candidates=recentArtworkCandidates(track||{},'music');
 const signature=JSON.stringify(candidates);
 if(img.dataset.artwork===signature)return;
 img.dataset.artwork=signature;
 const next=()=>{const src=candidates.shift();if(src){img.src=src;return}img.onerror=null;img.src='/src/page-icons/music.svg'};
 img.onerror=next;next();
}
