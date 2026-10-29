import {authorizeSearchTicket,tunnel} from '../server/search-private-proxy.mjs';
import {services} from '../server/voice-service.js';
import {createZombsSocketServer} from '../server/zombs-socket.mjs';
const zombsSocketServer=createZombsSocketServer();
import { server as wisp, logging } from '@mercuryworkshop/wisp-js/server';

import '../scripts/patch-wisp.mjs';
logging.set_level(logging.NONE);
// This relay only serves the same-origin arcade client and public destinations.
Object.assign(wisp.options,{dns_result_order:'ipv4first',allow_udp_streams:false,allow_direct_ip:false,port_whitelist:[80,443],stream_limit_per_host:32,stream_limit_total:128});
wisp.options.allow_private_ips = false;
wisp.options.allow_loopback_ips = false;
export async function handleUpgrade(req, socket, head) {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if(pathname==='/api/zombs-socket')return zombsSocketServer.emit('upgrade',req,socket,head);
  const origin = req.headers.origin;
  let sameOrigin = false;
  try { sameOrigin = new URL(origin).host === req.headers.host; } catch {}
  if (!['/wisp', '/wisp/', '/api/wisp', '/api/wisp/'].includes(pathname) || !sameOrigin) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
  }
  // Wisp treats paths without a trailing slash as a different proxy protocol.
  // Vercel rewrites /wisp/ to /api/wisp, so normalize only after validation.
  const ticket=new URL(req.url,'http://localhost').searchParams.get('searchTicket');
  let options={};
  if(ticket){
    try{
      const proxy=await authorizeSearchTicket(ticket,await services(false));
      options.TCPSocket=class {
        constructor(hostname,port){this.hostname=hostname;this.port=port;this.socket=null;this.closed=false}
        async connect(){const socket=await tunnel(proxy,this.hostname,this.port);if(this.closed){socket.destroy();throw Error('Connection closed')}this.socket=socket;socket.setTimeout(120000,()=>socket.destroy());this.iterator=socket[Symbol.asyncIterator]();}
        async recv(){if(!this.socket)return null;const next=await this.iterator.next();return next.done?null:next.value}
        async send(data){if(!this.socket)throw Error('Not connected');await new Promise((resolve,reject)=>this.socket.write(data,error=>error?reject(error):resolve()))}
        pause(){this.socket?.pause()}resume(){this.socket?.resume()}
        close(){this.closed=true;this.socket?.destroy();this.socket=null}
      };
    }catch{socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return}
  }
  req.url = '/wisp/';
  wisp.routeRequest(req, socket, head,options);
}
