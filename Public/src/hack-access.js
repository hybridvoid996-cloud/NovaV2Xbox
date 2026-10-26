export async function requireHackAccess(id,request=null){
 if(!['gardenless','pvz-original','blooket','kahoot'].includes(id))return false;
 if(!request&&typeof location!=='undefined'&&location.hostname==='nova-content.invalid')request=async()=>{const response=await fetch('/api/owner-control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'hackAccess'})});const data=await response.json();if(!response.ok)throw Error(data.error||'Ownership check failed');return data;};
 if(!request){try{if(window.top!==window&&typeof window.top.NovaCheckHackAccess==='function')request=window.top.NovaCheckHackAccess;}catch{}}
 for(let attempt=0;attempt<3;attempt++){
  try{const query=request||(await import('./control-client.js')).control;const data=await query('hackAccess');return Boolean(data.owned?.[id]);}
  catch{if(attempt<2)await new Promise(resolve=>setTimeout(resolve,750));}
 }
 return false;
}
