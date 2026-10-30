// Local visual QA only. Never uses the live Firebase database or real AI.
import http from 'node:http';
import path from 'node:path';
import {setup} from './account-support-fixture.mjs';
import {serveLocalStatic} from '../../server/local-static.mjs';
const fixture=setup();
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 res.setHeader('Cache-Control','no-store');
 if(url.pathname==='/src/account-firebase.js'){
  res.setHeader('Content-Type','text/javascript');return res.end("export const auth={currentUser:{uid:'owner',getIdToken:async()=>'owner'},authStateReady:async()=>{},onAuthStateChanged:()=>()=>{}},db={};");
 }
 if(['/api/account-support','/api/owner-control'].includes(url.pathname)){
  res.setHeader('Content-Type','application/json');
  try{let raw='';for await(const chunk of req)raw+=chunk;const b=JSON.parse(raw||'{}');
   if(b.action==='dashboard')return res.end(JSON.stringify({users:[{uid:'one',name:'Player One'},{uid:'owner',name:'Owner'}],roles:{owner:'owner'},audit:{},timeline:{}}));
   if(b.action==='status')return res.end(JSON.stringify({owner:true}));
   const owner=url.pathname==='/api/owner-control'?'owner':undefined;
   const result=await fixture.call(b.operation,b,owner,{answer:async(req,res)=>res.end(JSON.stringify({text:JSON.stringify({reply:'Thanks. What games do you remember playing? Please don’t send your password.',summary:'Visitor recalls Player One. Ownership has not been verified. A human must check independent evidence.'})}))});
   return res.end(JSON.stringify(result));
  }catch(e){res.statusCode=e.status||500;return res.end(JSON.stringify({error:e.message}))}
 }
 return serveLocalStatic(req,res,path.resolve('Public'));
});
server.listen(8796,'127.0.0.1',()=>console.log('Isolated support preview on port 8796 · fake accounts only'));
