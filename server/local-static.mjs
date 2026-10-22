import {stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
export async function serveLocalStatic(req,res,root){
 let name;try{name=decodeURIComponent(new URL(req.url,'http://local').pathname)}catch{res.writeHead(400);res.end();return}
 const base=path.resolve(root),file=path.resolve(base,'.'+(name==='/'?'/home.html':name==='/computer'?'/computer.html':name));
 if(!file.startsWith(base+path.sep)){res.writeHead(404);res.end('Not found');return}
 let info;try{info=await stat(file);if(!info.isFile())throw Error()}catch{res.writeHead(404);res.end('Not found');return}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return}
 const size=info.size,etag='"'+size.toString(16)+'-'+Math.trunc(info.mtimeMs).toString(16)+'"';
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.mp4':'video/mp4','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.woff2':'font/woff2','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');
 res.setHeader('Cache-Control','no-cache');res.setHeader('ETag',etag);res.setHeader('Last-Modified',info.mtime.toUTCString());res.setHeader('Accept-Ranges','bytes');
 if(req.headers['if-none-match']?.split(',').map(v=>v.trim()).some(v=>v==='*'||(v.startsWith('W/')?v.slice(2):v)===etag)){res.writeHead(304);res.end();return}
 let start=0,end=size-1,partial=false;const range=req.headers.range;
 if(range&&(!req.headers['if-range']||req.headers['if-range']===etag||req.headers['if-range']===info.mtime.toUTCString())){
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(match&&(match[1]||match[2])){partial=true;if(match[1]){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1}else start=Math.max(0,size-Number(match[2]));
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return}
  }
 }
 if(partial)res.setHeader('Content-Range','bytes '+start+'-'+end+'/'+size);res.setHeader('Content-Length',Math.max(0,end-start+1));res.statusCode=partial?206:200;
 if(req.method==='HEAD'||size===0){res.end();return}
 const stream=createReadStream(file,{start,end});const cancel=()=>stream.destroy();res.once('close',cancel);stream.once('error',()=>{if(!res.headersSent){res.statusCode=500;res.removeHeader('Content-Length');res.end('File unavailable')}else res.destroy()});stream.once('close',()=>res.removeListener('close',cancel));stream.pipe(res);
}
