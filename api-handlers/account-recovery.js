import {services} from '../server/voice-service.js';
import {withSharedBackend} from '../server/shared-backend.mjs';
import {redeemAccountRecovery} from '../server/account-recovery.mjs';
export const createHandler=(getServices=services)=>async(req,res)=>{
 const reply=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data))};
 if(req.method!=='POST')return reply(405,{error:'Use POST.'});
 try{
  let body=req.body;if(body===undefined){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4096)return reply(413,{error:'Request too large.'})}body=JSON.parse(raw)}else if(typeof body==='string'){if(Buffer.byteLength(body)>4096)return reply(413,{error:'Request too large.'});body=JSON.parse(body)}
  if(body&&JSON.stringify(body).length>4096)return reply(413,{error:'Request too large.'});
  if(!body||typeof body.username!=='string'||body.username.length>100||typeof body.code!=='string'||body.code.length>100)return reply(401,{error:'The recovery details are invalid or expired.'});
  const {auth,db}=await getServices(false);
  return reply(200,await redeemAccountRecovery({db,auth,username:body.username,code:body.code,ip:req.headers?.['x-forwarded-for']?.split(',')[0]||req.socket?.remoteAddress||'unknown'}));
 }catch(error){if(error instanceof SyntaxError)return reply(400,{error:'Invalid request.'});return reply(error.status||503,{error:error.status?error.message:'Account recovery is unavailable. Ask the owner for a new code if yours was already submitted.'})}
};
export default withSharedBackend('account-recovery',createHandler());
