import http from 'node:http';
import {readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serveLocalStatic} from './local-static.mjs';

const aliases={
 'account-login':'account-login','account-support':'account-support',
 'account-recovery':'account-recovery','login-handoff':'login-handoff','secure-appeal':'secure-appeal'
};
export async function createProductionServer({load=url=>import(url),publicRoot=fileURLToPath(new URL('../Public/',import.meta.url)),onError=()=>console.error('Nova request failed')}={}){
 const apiNames=new Set((await readdir(new URL('../api/',import.meta.url))).filter(n=>n.endsWith('.js')).map(n=>n.slice(0,-3)));
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy','credentialless');
  res.setHeader('X-Content-Type-Options','nosniff');
  const fail=(status,error)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({error}))};
  try{
   const url=new URL(req.url,'http://nova.internal');
   if(url.pathname==='/healthz'){res.setHeader('Cache-Control','no-store');res.statusCode=200;res.end('ok');return}
   if(/^\/(?:__|testing-preview|cosmetics-preview|rank-preview|nova-phone-preview)/.test(url.pathname)||url.pathname==='/api/local-ai-preview')return fail(404,'Not found.');
   let module;
   if(url.pathname.startsWith('/game-runtime/fortnite18/'))module=new URL('./fortnite-relay.mjs',import.meta.url);
   else if(url.pathname.startsWith('/game-runtime/wii/'))module=new URL('./wii-relay.mjs',import.meta.url);
   else if(url.pathname.startsWith('/api/')){
    const endpoint=url.pathname.slice(5);
    if(aliases[endpoint])module=new URL('../api-handlers/'+aliases[endpoint]+'.js',import.meta.url);
    else if(apiNames.has(endpoint))module=new URL('../api/'+endpoint+'.js',import.meta.url);
    else return fail(404,'Unknown API endpoint.');
   }
   if(module){
    res.setHeader('Cache-Control','no-store');
    req.query=Object.fromEntries(url.searchParams);
    // Vercel parsed JSON before calling handlers; reproduce that contract here.
    if(['POST','PUT','PATCH'].includes(req.method)&&String(req.headers['content-type']||'').split(';')[0].trim()==='application/json'){
     const chunks=[];let size=0;
     for await(const chunk of req){size+=chunk.length;if(size>8*1024*1024)return fail(413,'Request too large.');chunks.push(chunk)}
     try{req.body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}catch{return fail(400,'Invalid JSON request.')}
    }
    res.status=code=>{res.statusCode=code;return res};
    res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));return res};
    res.send=value=>{res.end(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value));return res};
    const exports=await load(module.href);
    const handler=exports.default||exports.handleFortnite||exports.handleWii;
    if(typeof handler==='function')await handler(req,res);
    else if(handler&&typeof handler.emit==='function')handler.emit('request',req,res);
    else throw Error('Invalid endpoint handler');
    return;
   }
   // Production root follows the existing Vercel index/login page.
   if(url.pathname==='/')req.url='/index.html'+url.search;
   await serveLocalStatic(req,res,publicRoot);
  }catch(error){onError(error);if(!res.headersSent)fail(500,'Nova could not complete this request.');else res.destroy()}
 });
 server.on('upgrade',async(req,socket,head)=>{try{const {handleUpgrade}=await load(new URL('../lib/wisp.mjs',import.meta.url).href);await handleUpgrade(req,socket,head)}catch{socket.destroy()}});
 server.requestTimeout=120000;server.headersTimeout=15000;
 return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const server=await createProductionServer();
 server.listen(Number(process.env.PORT)||8080,process.env.HOST||'127.0.0.1',()=>console.log('Nova production server ready'));
 const stop=()=>server.close(()=>process.exit(0));process.once('SIGTERM',stop);process.once('SIGINT',stop);
}
