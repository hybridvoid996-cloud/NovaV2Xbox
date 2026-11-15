// This function must be created in the top document's JavaScript realm.
// Calling a top-window API from an iframe's function retains the iframe's
// incumbent context and Chromium can reject Document Picture-in-Picture.
(()=>{
 if(window!==window.top)return;
 window.NovaOpenScreenFloat=function(){
  if(!window.documentPictureInPicture?.requestWindow)throw Error('Floating screen help needs Chrome or Edge with Document Picture-in-Picture support.');
  return window.documentPictureInPicture.requestWindow({width:380,height:490});
 };
 window.NovaCaptureAndFloat=async function(options){
  const stream=await window.navigator.mediaDevices.getDisplayMedia(options);
  let floating=null,floatError='';
  // Screen selection restores activation in supporting browsers. Request PiP
  // immediately in the top realm, before video playback or UI awaits use it up.
  if(window.documentPictureInPicture?.requestWindow){
   try{floating=await window.NovaOpenScreenFloat()}
   catch(error){floatError=error.message||'The browser requires another click to float.'}
  }else floatError='Floating screen help requires a browser with Document Picture-in-Picture, such as desktop Chrome or Edge.';
  return {stream,floating,floatError};
 };
})();
