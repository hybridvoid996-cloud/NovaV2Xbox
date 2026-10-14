import {auth} from './account-firebase.js';
import {createVoiceRequest} from '../voice-request.js';
import {callNotifications} from '../voice-notifications.js';
// Advertise the signed-in account without loading the entire chat behind Home.
const identity=async()=>{await auth.authStateReady();if(!auth.currentUser||auth.currentUser.isAnonymous)throw Error('Sign in first.');return auth.currentUser;};
const request=createVoiceRequest(identity);let busy=false,stopped=false;
function runtime(){for(const f of document.querySelectorAll('iframe')){try{if(f.contentWindow.NovaVoice)return f.contentWindow.NovaVoice;}catch{}}}
const notices=callNotifications({reveal:()=>{},decline:i=>request({action:'decline',room:i.room}),accept:async invite=>{openPage('chat');const started=Date.now();while(!runtime()){if(Date.now()-started>25000)throw Error('Open Chat and answer the call there.');await new Promise(resolve=>setTimeout(resolve,250));}await runtime().answer(invite);}});
async function check(){if(stopped||busy)return;if(runtime()){notices.sync([]);return;}busy=true;try{if(auth.currentUser&&!auth.currentUser.isAnonymous){const data=await request({action:'invites'});notices.sync(data.invites||[]);}}catch{/* Next heartbeat retries without interrupting Home. */}finally{busy=false;}}
await auth.authStateReady();check();const timer=setInterval(check,3000);addEventListener('pagehide',()=>{stopped=true;clearInterval(timer);notices.destroy();});
