import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),source=await readFile(new URL('Public/src/astra-cloud-launch.js',root),'utf8');
function runtime(){const window={};vm.runInNewContext(source,{window,Response});return window.NovaAstraCloud}
function documentFixture(){
 let callback,timedOut,hidden,disconnected=0,panel,title,stream;const clicks=[],buttons=[],listeners=new Map();
 const win={MutationObserver:class{constructor(fn){callback=fn}observe(){}disconnect(){disconnected++}},setTimeout(fn){timedOut=fn;return 1},clearTimeout(){},addEventListener(type,fn){if(type==='pagehide')hidden=fn},removeEventListener(){}};
 const doc={defaultView:win,documentElement:{},querySelectorAll:()=>buttons,getElementById:()=>title,querySelector:()=>stream,addEventListener(type,fn){const callbacks=listeners.get(type)||new Set();callbacks.add(fn);listeners.set(type,callbacks)},removeEventListener(type,fn){listeners.get(type)?.delete(fn)}};
 return {doc,buttons,clicks,notify:()=>callback(),timeout:()=>timedOut(),hide:()=>hidden(),get disconnected(){return disconnected},
  add(name,id){buttons.push({getAttribute:()=>name,click:()=>clicks.push(id)})},
  modal(name,disabled=false){
   const attrs={};const close={textContent:'',closest:()=>null,style:{setProperty(){}},setAttribute(k,v){attrs[k]=v},getAttribute:k=>attrs[k],querySelector:()=>true};
   const launch={textContent:'Play Now',closest:()=>null,disabled,getAttribute:()=>null,querySelector:()=>null,click(){clicks.push('launch')}};
   panel={parentElement:{},contains:b=>[close,launch].includes(b),querySelectorAll:()=>[close,launch]};title={textContent:name,closest:()=>panel};
   return {panel,close,launch,attrs};
  },
  stream(visible){stream=visible?{}:null},
  event(type,target,key){let prevented=false;for(const fn of listeners.get(type)||[])fn({type,target,key,preventDefault(){prevented=true},stopImmediatePropagation(){}});return prevented}
 };
}

test('every merged catalog entry retains its identity, source attribution and optimized cover',async()=>{
 const games=JSON.parse(await readFile(new URL('Public/library-cloud.json',root),'utf8'));
 assert.equal(games.length,495);assert.equal(new Set(games.map(g=>g.id)).size,games.length);assert.equal(games.filter(g=>Object.keys(g.providers).some(p=>p!=='luna')).length,493);
 const astra=games.filter(g=>g.providers.astra),gsn=games.filter(g=>g.providers.gsn);
 assert.equal(astra.length,275);assert.equal(new Set(gsn.map(g=>g.providers.gsn.sourceId)).size,209);
 assert.equal(games.filter(g=>g.providers.gsn&&!g.providers.astra).length,29);
 const occurrences=new Map();
 for(const g of games){
  assert.equal(g.kind,'cloud');
  if(g.providers.astra){assert.equal(g.url,'https://astra-education.top/lite');assert.equal(g.sourceOccurrence,occurrences.get(g.name)||0);occurrences.set(g.name,g.sourceOccurrence+1);assert.match(g.sourceArt,/^https:\/\/astra-education\.top\/cg\//)}
  if(g.providers.gsn){const url=new URL(g.providers.gsn.url);assert.equal(url.origin,'https://gsnproxy.b-cdn.net');assert.equal(url.searchParams.get('game'),g.providers.gsn.sourceId);assert.equal(url.pathname,'/releases/browser-20261001-1/apps/cloud/index.html')}
  assert.match(g.art,/^cloud-covers\/[a-zA-Z0-9_-]+\.webp$/);const bytes=await readFile(new URL('Public/'+g.art,root));assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');assert.ok((await stat(new URL('Public/'+g.art,root))).size<150000)
 }
});

test('selects the correct duplicate only after the remote library hydrates, once per document',()=>{const api=runtime(),fixture=documentFixture();api.attach(fixture.doc,{name:'NBA 2K23',sourceOccurrence:1});fixture.add('Other game','other');fixture.add('NBA 2K23','first');api.attach(fixture.doc,{name:'NBA 2K23',sourceOccurrence:1});fixture.notify();assert.deepEqual(fixture.clicks,[]);fixture.add('NBA 2K23','second');fixture.notify();fixture.notify();api.attach(fixture.doc,{name:'NBA 2K23'});assert.deepEqual(fixture.clicks,['second']);assert.equal(fixture.disconnected,0);fixture.hide();assert.equal(fixture.disconnected,1)});
test('unavailable titles release the observer and never open a different game',()=>{const api=runtime(),fixture=documentFixture();fixture.add('Other game','other');api.attach(fixture.doc,{name:'Unavailable'});fixture.timeout();assert.equal(fixture.disconnected,1);assert.deepEqual(fixture.clicks,[])});
test('auto launches only the selected panel once its launch button becomes enabled',()=>{
 const api=runtime(),fixture=documentFixture();fixture.add('Stardew Valley','selected');
 const modal=fixture.modal('Stardew Valley',true);api.attach(fixture.doc,{name:'Stardew Valley'});
 assert.deepEqual(fixture.clicks,['selected']);assert.equal(modal.close.hidden,true);assert.equal(modal.attrs['aria-hidden'],'true');
 assert.equal(fixture.event('click',modal.panel.parentElement),true);assert.equal(fixture.event('keydown',null,'Escape'),true);
 assert.equal(fixture.event('click',{closest:()=>modal.launch}),false);
 modal.launch.disabled=false;fixture.notify();fixture.notify();assert.deepEqual(fixture.clicks,['selected','launch']);
 fixture.hide();assert.equal(fixture.event('keydown',null,'Escape'),false);assert.equal(fixture.disconnected,1);
});
test('does not launch or lock an unrelated provider dialog',()=>{
 const api=runtime(),fixture=documentFixture();fixture.add('Stardew Valley','selected');const modal=fixture.modal('Other game');
 api.attach(fixture.doc,{name:'Stardew Valley'});fixture.notify();assert.deepEqual(fixture.clicks,['selected']);
 assert.equal(modal.close.hidden,undefined);assert.equal(fixture.event('keydown',null,'Escape'),false);fixture.timeout();
});
test('router compatibility preserves the response and removes stale body length/encoding',async()=>{const api=runtime();const response=await api.patchRouter({status:200,statusText:'OK',headers:[['Content-Type','text/javascript'],['content-length','80'],['Content-Encoding','gzip']],body:new TextEncoder().encode('s.replaceState({...s.state,idx:o},"");const plain=1;')});assert.equal(response.body,'s.replaceState({...s.state,idx:o},"",location.href);const plain=1;');assert.deepEqual(JSON.parse(JSON.stringify(response.headers)),[['Content-Type','text/javascript']]);assert.equal(response.status,200)});

test('cloud transport adapters are limited to cloud players and leave writes/other sites intact',async()=>{
 const requests=[],patched=[];let transport;
 const response=()=>({body:'fixture',status:200,statusText:'OK',headers:[['Content-Type','text/javascript']]});
 const active={state:'activated'},registration={active,addEventListener(){}};
 const sandbox={URL,setTimeout,clearTimeout,location:{origin:'https://nova.example',protocol:'https:'},navigator:{serviceWorker:{register:async()=>registration}},document:{createElement:()=>({}),head:{append(script){queueMicrotask(()=>script.onload())}}},LibcurlTransport:{LibcurlClient:class{init(){return Promise.resolve()}async request(target,method){requests.push([target.href,method]);return target.pathname==='/api/auth/me'?{...response(),status:401,statusText:'Unauthorized',body:'{"error":"Not authenticated"}'}:response()}}},$scramjetController:{Controller:class{constructor(options){transport=options.transport}wait(){return Promise.resolve()}}},NovaAstraCloud:{async patchRouter(r){patched.push(r);return {...r,body:'patched'}}}};
 sandbox.window=sandbox;sandbox.isSecureContext=true;vm.runInNewContext((await readFile(new URL('Public/src/connection.js',root),'utf8')).replace("await import('/src/ad-policy.mjs')", "({isAdRequest:()=>false,adBlockingEnabled:()=>false})").replace("await import('/src/transport-recovery.mjs')", "({shouldReconnectTransport:()=>false})"),{...sandbox,localStorage:{}});
 await sandbox.NovaConnection.create({cloudGame:true});
 const router=new URL('https://astra-education.top/assets/math-sheets-test.js'),ad=new URL('https://pl31545542.profitableratecpmnetwork.com/overlay.js');
 assert.equal((await transport.request(router,'GET')).body,'patched');assert.equal(patched.length,1);
 await transport.request(router,'POST');await transport.request(new URL('https://other.example/assets/math-sheets-test.js'),'GET');assert.equal(patched.length,1);
 const before=requests.length;assert.match((await transport.request(ad,'GET')).body,/omitted/);assert.equal(requests.length,before);
 await transport.request(ad,'POST');assert.equal(requests.length,before+1);
 await sandbox.NovaConnection.create();await transport.request(router,'GET');await transport.request(ad,'GET');assert.equal(patched.length,1);assert.equal(requests.length,before+3);
 const optional=new URL('https://js.rev.iq/astra-education.top');
 await sandbox.NovaConnection.create({cloudGame:true});const checkpoint=requests.length;
 assert.match((await transport.request(optional,'GET')).body,/omitted/);assert.equal(requests.length,checkpoint);
 await transport.request(optional,'POST');assert.equal(requests.length,checkpoint+1);
 await transport.request(new URL('https://js.rev.iq/other.example'),'GET');assert.equal(requests.length,checkpoint+2);
 const auth=await transport.request(new URL('https://astra-education.top/api/auth/me'),'GET');
 assert.equal(auth.status,401);assert.equal(auth.body,'{"error":"Not authenticated"}');
 await sandbox.NovaConnection.create();await transport.request(optional,'GET');assert.equal(requests.length,checkpoint+4);
 const page=new URL('https://cdn.jsdelivr.net/gh/achroma-ubg/svg@latest/pages/games.html');await sandbox.NovaConnection.create({cloudGame:true,cloudProvider:'achroma'});assert.ok((await transport.request(page,'GET')).headers.some(([n,v])=>n.toLowerCase()==='content-type'&&v.startsWith('text/html')));await sandbox.NovaConnection.create();assert.ok(!(await transport.request(page,'GET')).headers.some(([n,v])=>v.startsWith('text/html')));
});

test('stream Exit preserves provider cleanup and returns Home once after the stream disappears',()=>{
 const fixture=documentFixture(),api=runtime();let exits=0;fixture.add('Grand Theft Auto V','selected');fixture.modal('Grand Theft Auto V');
 api.attach(fixture.doc,{name:'Grand Theft Auto V'},{onExit:()=>exits++});fixture.stream(true);
 const exit={textContent:'Exit',closest:()=>({})};assert.equal(fixture.event('click',{closest:()=>exit}),false);
 fixture.notify();assert.equal(exits,0,'Wait for the provider session to end');fixture.stream(false);fixture.notify();fixture.notify();assert.equal(exits,1);
});
test('an Exit label outside the streaming HUD never routes Home',()=>{
 const fixture=documentFixture(),api=runtime();let exits=0;fixture.add('Grand Theft Auto V','selected');fixture.modal('Grand Theft Auto V');
 api.attach(fixture.doc,{name:'Grand Theft Auto V'},{onExit:()=>exits++});fixture.stream(true);
 fixture.event('click',{closest:()=>({textContent:'Exit',closest:()=>null})});fixture.stream(false);fixture.notify();assert.equal(exits,0);
});

test('current Astra dialogs without the old title ID still launch exactly the selected game',()=>{const api=runtime(),f=documentFixture();f.add('Stumble Guys','selected');const {panel}=f.modal('Stumble Guys');f.doc.getElementById=()=>null;const query=f.doc.querySelectorAll;f.doc.querySelectorAll=selector=>selector.includes('dialog')?[panel]:query(selector);panel.querySelector=()=>({textContent:'Stumble Guys'});api.attach(f.doc,{name:'Stumble Guys'});f.notify();assert.deepEqual(f.clicks,['selected','launch']);f.hide()});

test('empty proxy documents remain eligible for attachment after hydration',()=>{const api=runtime(),f=documentFixture();assert.equal(api.attach(f.doc,{name:'NBA 2K23'}),false);f.add('NBA 2K23','selected');f.modal('NBA 2K23');let ready=0;assert.equal(api.attach(f.doc,{name:'NBA 2K23'},{onReady:()=>ready++}),true);assert.deepEqual(f.clicks,['selected','launch']);assert.equal(ready,1);f.notify();assert.equal(ready,1);f.hide()});
