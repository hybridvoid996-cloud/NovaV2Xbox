import {Readable} from 'node:stream';
export const WII_PREFIX='/game-runtime/wii/';
const upstreamBase='https://playobsidian.com/cdn/assets/html/46975ef1-a576-49c2-b0ae-b740301204d2/1/';
export function wiiTarget(req){
 const incoming=new URL(req.url,'http://nova.local');let part=incoming.pathname.startsWith(WII_PREFIX)?incoming.pathname.slice(WII_PREFIX.length):req.query?.path??incoming.searchParams.get('path');if(Array.isArray(part))part=part.join('/');
 if(typeof part!=='string')throw Error('Missing path');part=decodeURIComponent(part);
 if(part.startsWith('/')||part.includes('\\')||part.includes('\0')||/(^|\/)\.\.?($|\/)/.test(part)||/[?#%]/.test(part))throw Error('Invalid path');
 part=part.replace(/^game\/part\//,'game/');if(part==='game/main.dol')part='game/sys/main.dol';
 const target=new URL(part||'index.html',upstreamBase);if(!target.href.startsWith(upstreamBase))throw Error('Invalid target');return target;
}
export async function handleWii(req,res,request=fetch){
 const fail=(status,message)=>{res.statusCode=status;res.setHeader('Content-Type','text/plain; charset=utf-8');res.end(message)};
 if(!['GET','HEAD'].includes(req.method))return fail(405,'This game relay supports reads only.');let target;try{target=wiiTarget(req)}catch{return fail(400,'Invalid game asset path.')}
 // Log/nand endpoints belong to the source's local launcher, not Nova's users.
 if(['log','nand'].includes(target.pathname.slice(new URL(upstreamBase).pathname.length)))return fail(404,'Not available');
 try{const headers=new Headers();if(req.headers.range)headers.set('Range',req.headers.range);const response=await request(target,{method:req.method,headers,redirect:'error',signal:AbortSignal.timeout(60000)});res.statusCode=response.status;
 for(const key of ['content-type','content-length','content-range','accept-ranges','etag','last-modified']){const value=response.headers.get(key);if(value)res.setHeader(key,value)}
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','credentialless');res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Cache-Control','no-cache');
 if(req.method==='HEAD'||!response.body)return res.end();Readable.fromWeb(response.body).on('error',()=>res.destroy()).pipe(res);
 }catch{if(!res.headersSent)fail(502,'Wii game files could not be reached. Retry shortly.');else res.destroy()}
}
