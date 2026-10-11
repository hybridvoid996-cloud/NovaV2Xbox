export const MAX_CHAT_VIDEO=250*1024*1024;
export const VIDEO_TYPES=['video/mp4','video/webm','video/quicktime'];
export function checkVideo(file){if(!VIDEO_TYPES.includes(file.type))throw Error('Choose an MP4, WebM, or MOV video.');if(!file.size||file.size>MAX_CHAT_VIDEO)throw Error('Choose a video up to 250 MB.');}
export async function uploadChatVideo(file,progress=()=>{}){
 checkVideo(file);
 const [{app,auth},sdk]=await Promise.all([import('./account-firebase.js'),import('https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js')]);
 const user=auth.currentUser;if(!user||user.isAnonymous)throw Error('Sign into Nova to upload a video.');
 const target=sdk.ref(sdk.getStorage(app),'chat-videos/'+user.uid+'/'+crypto.randomUUID());
 const task=sdk.uploadBytesResumable(target,file,{contentType:file.type});
 try{await new Promise((resolve,reject)=>task.on('state_changed',s=>progress(Math.round(s.bytesTransferred/s.totalBytes*100)),reject,resolve));return {type:'video',name:file.name.slice(0,100),url:await sdk.getDownloadURL(target)};}
 catch(e){if(['storage/unauthorized','storage/bucket-not-found','storage/unknown'].includes(e.code))throw Error('Video storage is not ready. The owner needs to enable Firebase Storage and publish the chat video storage rules.');throw Error('Video upload failed. Check your connection and try again.');}
}
