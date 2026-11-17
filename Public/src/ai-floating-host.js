// This function must be created in the top document's JavaScript realm.
// Calling a top-window API from an iframe's function retains the iframe's
// incumbent context and Chromium can reject Document Picture-in-Picture.
(()=>{
 if(window!==window.top)return;
 if(window.NovaScreenFloatVersion===4)return;
 window.NovaScreenFloatVersion=4;
 let opening=null,attached=null;
 window.NovaBindScreenFloat=function(callback){
  attached=callback;
  try{window.navigator.mediaSession?.setActionHandler('enterpictureinpicture',async()=>{
   if(attached!==callback)return;
   try{const floating=await window.NovaOpenScreenFloat();if(attached===callback)await callback(floating)}catch{}
  })}catch{}
  return ()=>{if(attached!==callback)return;attached=null;try{window.navigator.mediaSession?.setActionHandler('enterpictureinpicture',null)}catch{}};
 };
 window.NovaOpenScreenFloat=function(){
  if(!window.documentPictureInPicture?.requestWindow)throw Error('Floating screen help needs Chrome or Edge with Document Picture-in-Picture support.');
  const current=window.documentPictureInPicture.window;
  if(current&&!current.closed)return Promise.resolve(current);
  if(opening)return opening;
  const pending=window.documentPictureInPicture.requestWindow({width:380,height:490,disallowReturnToOpener:true,preferInitialWindowPlacement:true});
  opening=Promise.resolve(pending);
  opening.then(()=>{opening=null},()=>{opening=null});
  return opening;
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
