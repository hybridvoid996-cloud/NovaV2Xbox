import {withSharedBackend} from '../server/shared-backend.mjs';
import {services} from '../server/voice-service.js';
const apiKey='AIzaSyDV9MRbv7IDXjowddQoXAN1hJPlCGMyxR8';
export const createHandler=(getServices=services,request=fetch)=>async(req,res)=>{
 const reply=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
 if(req.method!=='POST')return reply(405,{error:'Use POST.'});
 let body;
 try{if(req.body)body=typeof req.body==='string'?JSON.parse(req.body):req.body;else{let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>8192)return reply(413,{error:'Request too large.'});}body=JSON.parse(text);}}catch{return reply(400,{error:'Invalid request.'});}
 const username=typeof body?.username==='string'?body.username.trim().toLowerCase():'';
 const email=typeof body?.email==='string'?body.email.trim():'';
 if((email?!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254:!/^[a-z0-9_ -]{2,24}$/.test(username))||typeof body.password!=='string'||!body.password||body.password.length>4096)return reply(401,{error:'Invalid credentials.'});
 try{
  const {auth,db}=await getServices(false);
  let uid,account;if(!email){
  const accounts=(await db.ref('novaAccounts').get()).val()||{};
  const matches=Object.entries(accounts).filter(([,value])=>String(value.username||value.name||'').trim().toLowerCase()===username);
  // Existing display names are not unique; never guess which account is intended.
  if(matches.length!==1)return reply(401,{error:'Invalid credentials. Use email if your username is shared.'});
  uid=matches[0][0];account=await auth.getUser(uid);
  if(!account.email||account.disabled)return reply(401,{error:'Invalid credentials.'});}
  const check=await request('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+apiKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email||account.email,password:body.password,returnSecureToken:true})});
  const result=await check.json();
  if(!check.ok||!result.localId||uid&&result.localId!==uid)return reply(401,{error:'Invalid credentials.'});
  if(email){uid=result.localId;account=await auth.getUser(uid);if(account.disabled||!(await db.ref('novaAccounts/'+uid).get()).exists())return reply(401,{error:'Invalid credentials.'});}
  return reply(200,{token:await auth.createCustomToken(uid)});
 }catch{return reply(503,{error:'Nova sign-in is temporarily unavailable.'});}
};
export default withSharedBackend('account-login',createHandler());
