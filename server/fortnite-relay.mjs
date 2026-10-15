import {Readable} from 'node:stream';
export const FORTNITE_PREFIX='/game-runtime/fortnite18/';
const origin='https://fortnite.ezgames.lol';
export function fortniteTarget(req){const incoming=new URL(req.url,'http://nova.local');let part=incoming.pathname.startsWith(FORTNITE_PREFIX)?incoming.pathname.slice(FORTNITE_PREFIX.length):req.query?.path??incoming.searchParams.get('path');if(Array.isArray(part))part=part.join('/');if(typeof part!=='string'||part.startsWith('/')||part.includes('\\')||/(?:^|\/)\.\.(?:\/|$)/.test(decodeURIComponent(part)))throw Error('Invalid game path');const target=new URL('/'+part,origin);if(target.origin!==origin)throw Error('Invalid game origin');incoming.searchParams.delete('path');target.search=incoming.searchParams.toString();return target;}
export async function handleFortnite(req,res,request=fetch){
 const fail=(code,text)=>{res.statusCode=code;res.setHeader('Content-Type','text/plain; charset=utf-8');res.end(text)};
 if(!['GET','HEAD','POST'].includes(req.method))return fail(405,'Unsupported method');let target;try{target=fortniteTarget(req)}catch{return fail(400,'Invalid game path')}
 const headers=new Headers();for(const key of ['range','authorization','content-type','x-fnvfs-path','x-fnvfs-prefetch','x-fnvfs-parts'])if(req.headers[key])headers.set(key,req.headers[key]);let body;
 if(req.method==='POST'){if(req.body){body=typeof req.body==='string'?req.body:JSON.stringify(req.body)}else{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1048576)return fail(413,'Request too large');chunks.push(chunk)}body=Buffer.concat(chunks)}if(Buffer.byteLength(body)>1048576)return fail(413,'Request too large')}
 try{const upstream=await request(target,{method:req.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(90000)});
  if(upstream.status>=300&&upstream.status<400){const next=new URL(upstream.headers.get('location'),target);if(next.origin!==origin)return fail(502,'The game redirected outside its supported host');res.statusCode=upstream.status;res.setHeader('Location',FORTNITE_PREFIX+next.pathname.slice(1)+next.search);res.end();return}
  res.statusCode=upstream.status;for(const key of ['content-type','content-range','accept-ranges','etag','last-modified']){const value=upstream.headers.get(key);if(value)res.setHeader(key,value)}
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','credentialless');res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Cache-Control',headers.has('authorization')||req.method==='POST'?'no-store':'no-cache');
  if(target.pathname==='/fortnite/sw.js')res.setHeader('Service-Worker-Allowed',FORTNITE_PREFIX+'fortnite/');
  if(req.method==='HEAD'||!upstream.body){res.end();return}
  if(target.pathname==='/fortnite/fnweb-remote.json'&&upstream.ok){const config=await upstream.json();config.worker=FORTNITE_PREFIX.slice(0,-1);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(config));return}
  Readable.fromWeb(upstream.body).on('error',()=>res.destroy()).pipe(res);
 }catch{if(!res.headersSent)fail(502,'The Fortnite game host could not be reached. Please try again.');else res.destroy()}
}
