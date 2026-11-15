// Official Roblox sessions stay on Roblox's own origin, outside Nova's proxy.
export function officialWebPlayURL(value){
 const raw=String(value??'').trim();let id=raw;
 if(/^https:\/\//i.test(raw)){
  try{const url=new URL(raw);if(!['www.roblox.com','roblox.com','play.roblox.com'].includes(url.hostname)||url.username||url.password)return null;
   id=url.pathname.match(/^\/games\/(\d+)(?:\/|$)/)?.[1]||(/^\/games\/start\/?$/.test(url.pathname)?url.searchParams.get('placeId'):null);
  }catch{return null}
 }
 if(!/^[1-9]\d{0,15}$/.test(id||''))return null;
 return 'https://play.roblox.com/games/start?placeId='+id;
}
export function mountOfficialWebPlay({button,dialog,form,input,error}){
 button.onclick=()=>{error.textContent='';dialog.showModal();input.focus()};
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 form.onsubmit=event=>{event.preventDefault();const url=officialWebPlayURL(input.value);if(!url){error.textContent='Enter a valid Place ID or Roblox game link.';return}
  // Open synchronously from the click so first-party sign-in can work normally.
  const opened=window.open(url,'_blank');if(opened){opened.opener=null;dialog.close()}else error.textContent='Your browser blocked the new tab. Allow this launch and try again.';
 };
}
