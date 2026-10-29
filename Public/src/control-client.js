import {apiResponse} from './api-response.mjs';
import {auth} from './account-firebase.js';
export async function control(action,data={}){await auth.authStateReady();if(!auth.currentUser)throw Error('Sign in to Nova first.');const response=await fetch('/api/owner-control',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await auth.currentUser.getIdToken()},body:JSON.stringify({action,...data})});const body=await apiResponse(response);if(!response.ok){const error=Error(body.error||'Request failed.');error.status=response.status;throw error;}if(action!=='storeStatus'&&!(['storeArcade','storeTrade'].includes(action)&&data.op==='status')&&Number.isSafeInteger(body.coins)){dispatchEvent(new CustomEvent('nova-server-progress',{detail:{coins:body.coins}}));if(parent!==window)parent.postMessage({novaAction:'novaCoinsChanged',coins:body.coins},location.origin)}return body}

// Embedded native games use the authenticated Nova shell for ownership checks.
if(typeof window!=='undefined')window.NovaCheckHackAccess=()=>control('hackAccess');
