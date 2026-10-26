export async function redeemRecoveryCode(username,code,{request=fetch}={}){
 const response=await request('/api/account-recovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:String(username||'').trim(),code:String(code||'').trim()}),signal:AbortSignal.timeout(15000)});
 let result;try{result=await response.json()}catch{throw Error('Account recovery could not connect. Please try again.')}
 if(!response.ok)throw Error(result.error||'The recovery details are invalid or expired.');
 if(typeof result.token!=='string'||!result.token)throw Error('The recovery response was incomplete. Ask the owner for a new code.');
 return result.token;
}
