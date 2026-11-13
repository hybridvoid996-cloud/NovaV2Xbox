// Only the account's appearance preferences go to its paired desktop.
// Never forward the account record (which may contain private account fields).
export function remoteProfile(uid,account={},origin='https://main.dnw9x6dxqh8lf.amplifyapp.com'){
 const preferences=account.preferences||{};
 let background=null;
 try{
  const gradient=JSON.parse(preferences.nova_grad||'null');
  if(gradient&&[gradient.c1,gradient.c2,gradient.c3].every(c=>typeof c==='string'&&/^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/i.test(c))){
   background={type:'gradient',colors:[gradient.c1,gradient.c2,gradient.c3],direction:/^(?:to (?:left|right|top|bottom)(?: (?:left|right|top|bottom))?|[0-9.-]+deg)$/.test(gradient.dir)?gradient.dir:'135deg'};
  }
 }catch{}
 if(!background&&typeof preferences.nova_wallpaper==='string'&&preferences.nova_wallpaper.length<=4000){
  try{
   const url=new URL(preferences.nova_wallpaper,origin);
   // No local browser blobs, embedded uploads, credentials, or private file URLs.
   if(url.protocol==='https:'&&!url.username&&!url.password)background={type:preferences.nova_wallpaper_is_video==='true'||/\.mp4(?:$|[?#])/i.test(url.href)?'video':'image',url:url.href};
  }catch{}
 }
 return {uid,name:String(account.name||'Nova player').trim().slice(0,60),photo:String(account.photo||'').trim().slice(0,2000),background};
}
