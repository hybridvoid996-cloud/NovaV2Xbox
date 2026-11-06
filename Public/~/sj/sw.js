importScripts('/~/sj/controller/controller.sw.js');
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
// Player/Search live outside this worker's /~/sj/ scope. Include those pages
// when reviving controllers after the browser stops an idle worker.
const revivals=new Set();
async function notifyControllerOwners(){
 const owners=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 for(const client of owners)client.postMessage({$controller$swrevive:{}});
}
self.addEventListener('message',()=>{for(const check of [...revivals])check()});
self.addEventListener('activate',e=>e.waitUntil(notifyControllerOwners()));
async function restoreController(event){
 if($scramjetController.shouldRoute(event))return;
 await new Promise((resolve,reject)=>{
  let timer;const check=()=>{if(!$scramjetController.shouldRoute(event))return;clearTimeout(timer);revivals.delete(check);resolve()};
  revivals.add(check);timer=setTimeout(()=>{revivals.delete(check);reject(Error('Nova connection is waking up. Reload this game to reconnect.'))},3500);
  notifyControllerOwners().then(check,error=>{clearTimeout(timer);revivals.delete(check);reject(error)});
 });
}
// The controller owns response rewriting and transport. Never retry writes or
// turn missing resources into successful responses.
async function routeSafely(event){
 await restoreController(event);
 try{return await $scramjetController.route(event)}catch(error){
  if(!['GET','HEAD'].includes(event.request.method)||event.request.signal.aborted||!/connect|network|socket|closed|reset|fetch|timeout/i.test(String(error)))throw error;
  await new Promise(resolve=>setTimeout(resolve,300));
  return $scramjetController.route(event);
 }
}
self.addEventListener('fetch',e=>{const known=$scramjetController.shouldRoute(e),prefix=new URL('p/',self.registration?.scope||'https://nova.invalid/~/sj/').pathname;if(known||new URL(e.request.url).pathname.startsWith(prefix))e.respondWith(routeSafely(e).catch(error=>new Response(error.message,{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}})))});
self.addEventListener('message',e=>{if(e.data?.novaHealth)e.ports[0]?.postMessage({ok:true,revision:'nova-recovery-20260930'})});
