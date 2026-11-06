export function relayOriginAllowed(req,env=process.env){
 const value=req.headers?.origin;
 try{
  const origin=new URL(value);
  if(origin.origin!==value)return false;
  if(origin.host===req.headers.host)return true;
  // Separate AWS relay hosting is opt-in, with exact HTTPS origins only.
  return origin.protocol==='https:'&&String(env.NOVA_ALLOWED_ORIGINS||'').split(',').map(v=>v.trim()).includes(value);
 }catch{return false}
}
