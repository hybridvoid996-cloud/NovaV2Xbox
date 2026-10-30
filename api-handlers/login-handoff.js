import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {services} from '../server/voice-service.js';
const digest=value=>createHash('sha256').update(value).digest('hex');
export function origin(value){try{const u=new URL(value);return u.protocol==='https:'&&u.origin===value?u.origin:null}catch{return null}}
export function configuration(env=process.env){
 const primary=origin(env.NOVA_LOGIN_ORIGIN||'https://novaoffical1.vercel.app');
 const trusted=[...new Set([primary,...(env.NOVA_LOGIN_TRUSTED_ORIGINS||'https://novaoffical.vercel.app,https://novaoffical1.vercel.app').split(',').map(s=>origin(s.trim()))].filter(Boolean))];
 return {primary,trusted,userApproval:env.NOVA_LOGIN_USER_APPROVAL==='true'};
}
export function privateRules(rules){
 const denied=node=>Object.entries(node||{}).every(([k,v])=>['.read','.write'].includes(k)?v===false:!v||typeof v!=='object'||denied(v));
 const node=rules?.novaAuthHandoffs;
 return rules?.['.read']===false&&rules?.['.write']===false&&node?.['.read']===false&&node?.['.write']===false&&denied(node)&&!Object.entries(rules).some(([k,v])=>k.startsWith('$')&&!denied(v));
}
export const createHandler=(getServices=services,getConfig=configuration,now=Date.now)=>async(req,res)=>{
 const config=getConfig(),requestOrigin=req.headers?.origin;
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('Vary','Origin');res.setHeader('Referrer-Policy','no-referrer');
 const reply=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data))};
 if(req.method==='GET'){if(config.trusted.includes(requestOrigin)||config.userApproval&&origin(requestOrigin))res.setHeader('Access-Control-Allow-Origin',requestOrigin);return reply(200,{primary:config.primary,trusted:config.trusted,userApproval:!!config.userApproval})}
 if(!config.primary||!(config.trusted.includes(requestOrigin)||config.userApproval&&origin(requestOrigin)))return reply(403,{error:'This Nova website is not approved for shared login.'});
 res.setHeader('Access-Control-Allow-Origin',requestOrigin);
 res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
 if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}
 if(req.method!=='POST')return reply(405,{error:'Use POST.'});
 let b;try{if(req.body)b=typeof req.body==='string'?JSON.parse(req.body):req.body;else{let raw='';for await(const c of req){raw+=c;if(Buffer.byteLength(raw)>4096)return reply(413,{error:'Request too large.'})}b=JSON.parse(raw)}}catch{return reply(400,{error:'Invalid request.'})}
 if(!b||!['issue','redeem'].includes(b.action))return reply(400,{error:'Invalid action.'});
 if(b.action==='issue'&&(requestOrigin!==config.primary||!(config.trusted.includes(b.target)||config.userApproval&&origin(b.target)&&b.approved===true)||b.target===config.primary||!/^[-_A-Za-z0-9]{43}$/.test(b.challenge||'')))return reply(400,{error:'Invalid login destination.'});
 if(b.action==='redeem'&&(!/^[a-f0-9]{64}$/.test(b.code||'')||!/^[-_A-Za-z0-9]{43,128}$/.test(b.verifier||'')))return reply(400,{error:'Invalid login handoff.'});
 try{
  const {auth,db}=await getServices(false);
  if(!privateRules((await db.getRulesJSON()).rules))return reply(503,{error:'Publish the private Nova login handoff rules first.'});
  if(b.action==='issue'){
   let user;try{user=await auth.verifyIdToken((req.headers.authorization||'').replace(/^Bearer /,''),true)}catch{return reply(401,{error:'Your original Nova login has expired.'})}
   if(user.firebase?.sign_in_provider==='anonymous')return reply(403,{error:'Use a Nova account.'});
   if(!(await db.ref('novaAccounts/'+user.uid).get()).exists())return reply(403,{error:'Complete your Nova account setup.'});
   const code=randomBytes(32).toString('hex');
   await db.ref('novaAuthHandoffs/'+digest(code)).set({uid:user.uid,target:b.target,challenge:b.challenge,issuedAt:now(),expiresAt:now()+90000,used:false});
   // Remove a bounded batch of expired records without delaying or invalidating a handoff.
   try{const stale=(await db.ref('novaAuthHandoffs').orderByChild('expiresAt').endAt(now()).limitToFirst(50).get()).val()||{};if(Object.keys(stale).length)await db.ref('novaAuthHandoffs').update(Object.fromEntries(Object.keys(stale).map(k=>[k,null])))}catch{}
   return reply(200,{code});
  }
  const challenge=createHash('sha256').update(b.verifier).digest('base64url'),node=db.ref('novaAuthHandoffs/'+digest(b.code));
  const result=await node.transaction(record=>{
   if(!record||record.used||record.expiresAt<=now()||record.target!==requestOrigin||typeof record.challenge!=='string'||record.challenge.length!==challenge.length||!timingSafeEqual(Buffer.from(record.challenge),Buffer.from(challenge)))return;
   return {...record,used:true};
  });
  if(!result.committed)return reply(401,{error:'The login handoff expired or was already used. Sign in normally to continue.'});
  const record=result.snapshot.val(),uid=record.uid,account=await auth.getUser(uid);
  if(account.disabled||new Date(account.tokensValidAfterTime||0).getTime()>record.issuedAt)return reply(403,{error:'This account cannot sign in. Please sign in normally.'});
  return reply(200,{token:await auth.createCustomToken(uid)});
 }catch{return reply(503,{error:'Shared Nova login is unavailable. You can still sign in normally.'})}
};
export default createHandler();
