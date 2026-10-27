export function musicPlayerPageError(doc){
 try{
  const text=String(doc?.title||'')+'\n'+String(doc?.body?.textContent||'').slice(0,1500);
  return /404\s*:\s*NOT_FOUND|DEPLOYMENT_NOT_FOUND|DEPLOYMENT_DISABLED|FUNCTION_INVOCATION_TIMEOUT|The deployment could not be found|This page could not be found/i.test(text)||/vercel[\s\S]{0,180}\b404\b/i.test(text);
 }catch{return false}
}
