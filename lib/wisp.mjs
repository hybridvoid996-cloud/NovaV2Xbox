import {createZombsSocketServer} from '../server/zombs-socket.mjs';
const zombsSocketServer=createZombsSocketServer();
import { server as wisp, logging } from '@mercuryworkshop/wisp-js/server';

import '../scripts/patch-wisp.mjs';
logging.set_level(logging.NONE);
// This relay only serves the same-origin arcade client and public destinations.
Object.assign(wisp.options,{dns_result_order:'ipv4first',allow_udp_streams:false,allow_direct_ip:false,port_whitelist:[80,443],stream_limit_per_host:32,stream_limit_total:128});
wisp.options.allow_private_ips = false;
wisp.options.allow_loopback_ips = false;
export function handleUpgrade(req, socket, head) {
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
  req.url = '/wisp/';
  wisp.routeRequest(req, socket, head);
}
