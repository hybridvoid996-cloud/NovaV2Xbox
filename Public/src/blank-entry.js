(()=>{
 try{
  if(window!==top||/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)||new URLSearchParams(location.search).get('nova-regular')==='1'||localStorage.getItem('nova_auto_blank')==='false')return;
  // Move before account restoration, wallpaper, libraries or app startup.
  location.replace('/blank-entry.html'+location.search+location.hash);
 }catch{}
})();
