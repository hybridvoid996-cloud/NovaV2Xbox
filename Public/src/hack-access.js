export async function requireHackAccess(id,request=null){
 if(!['gardenless','pvz-original'].includes(id))return false;
 if(!request){try{if(window.top!==window&&typeof window.top.NovaCheckHackAccess==='function')request=window.top.NovaCheckHackAccess;}catch{}}
 for(let attempt=0;attempt<3;attempt++){
  try{const query=request||(await import('./control-client.js')).control;const data=await query('hackAccess');return Boolean(data.owned?.[id]);}
  catch{if(attempt<2)await new Promise(resolve=>setTimeout(resolve,750));}
 }
 return false;
}
