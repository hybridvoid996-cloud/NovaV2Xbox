// This function must be created in the top document's JavaScript realm.
// Calling a top-window API from an iframe's function retains the iframe's
// incumbent context and Chromium can reject Document Picture-in-Picture.
(()=>{
 if(window!==window.top)return;
 window.NovaScreenFloatVersion=3;
 window.NovaOpenScreenFloat=function(){
  if(!window.documentPictureInPicture?.requestWindow)throw Error('Floating screen help needs Chrome or Edge with Document Picture-in-Picture support.');
  return window.documentPictureInPicture.requestWindow({width:380,height:490,disallowReturnToOpener:true,preferInitialWindowPlacement:true});
 };
 window.NovaCaptureAndFloat=async function(options){
  // Start capture first (it checks activation), then reserve the floating
  // window in the SAME click, before awaiting the user's screen selection.
  const capture=window.navigator.mediaDevices.getDisplayMedia(options);
  let floating;
  try{
   floating=window.documentPictureInPicture?.requestWindow
    ? Promise.resolve(window.NovaOpenScreenFloat()).then(window=>({floating:window,floatError:''}),error=>({floating:null,floatError:error.message||'The browser requires another click to float.'}))
    : Promise.resolve({floating:null,floatError:'Floating screen help requires desktop Chrome or Edge with Document Picture-in-Picture support.'});
  }catch(error){floating=Promise.resolve({floating:null,floatError:error.message})}
  try{
   const stream=await capture,result=await floating;
   if(result.floating?.closed){result.floating=null;result.floatError='The floating window was closed. Use Float over websites to reopen it.'}
   return {stream,...result};
  }catch(error){
   const result=await floating;result.floating?.close();throw error;
  }
 };
})();
