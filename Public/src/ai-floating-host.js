// This function must be created in the top document's JavaScript realm.
// Calling a top-window API from an iframe's function retains the iframe's
// incumbent context and Chromium can reject Document Picture-in-Picture.
(()=>{
 if(window!==window.top)return;
 window.NovaOpenScreenFloat=function(){
  if(!window.documentPictureInPicture?.requestWindow)throw Error('Floating screen help needs Chrome or Edge with Document Picture-in-Picture support.');
  return window.documentPictureInPicture.requestWindow({width:380,height:490});
 };
})();
