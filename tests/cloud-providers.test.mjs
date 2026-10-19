import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {mergeCloudCatalog,normalizeCloudTitle} from '../scripts/cloud-catalog.mjs';
const root=new URL('../',import.meta.url),source=await readFile(new URL('Public/src/cloud-providers.js',root),'utf8');
const dual={id:'jy0108',name:'Grand Theft Auto V',art:'cloud-covers/jy0108.webp',providers:{astra:{url:'https://astra-education.top/lite',name:'Grand Theft Auto V',sourceOccurrence:0},gsn:{url:'https://gsnproxy.b-cdn.net/releases/browser-20261001-1/apps/cloud/index.html?game=jy0108',name:'Grand Theft Auto V',sourceId:'jy0108'}}};
function node(){const listeners=new Map(),classes=new Set();return{children:[],dataset:{},style:{},classList:{add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle(){}},append(...rows){this.children.push(...rows)},replaceChildren(...rows){this.children=rows},setAttribute(){},addEventListener(k,fn){const set=listeners.get(k)||new Set();set.add(fn);listeners.set(k,set)},removeEventListener(k,fn){listeners.get(k)?.delete(fn)},event(k){for(const fn of listeners.get(k)||[])fn({preventDefault(){}})},showModal(){this.open=true},close(){this.open=false},focus(){this.focused=true},get firstElementChild(){return this.children[0]}}}
function fixture(){const nodes=new Map(),get=k=>{if(!nodes.has(k))nodes.set(k,node());return nodes.get(k)};const document={getElementById:get,createElement:()=>node(),body:node(),documentElement:node(),querySelector:s=>get(s.replace(/^#/,''))};const window={};vm.runInNewContext(source,{window,document,DOMException});return{api:window.NovaCloudProviders,document,get}}
test('single providers launch directly without touching a dialog, including old catalog fallback',async()=>{
 const window={};vm.runInNewContext(source,{window,DOMException});const api=window.NovaCloudProviders;
 assert.equal((await api.choose({...dual,providers:{gsn:dual.providers.gsn}})).id,'gsn');
 assert.equal((await api.choose({name:'Fortnite',url:'https://astra-education.top/lite'})).id,'astra');
 await assert.rejects(api.choose({providers:{unknown:{url:'https://other.example'}}}),/no available/);
});
test('shared titles wait for an explicit choice and resolve the selected launch metadata once',async()=>{
 const f=fixture();let settled=false;const promise=f.api.choose(dual).then(value=>{settled=true;return value});
 await Promise.resolve();assert.equal(settled,false);assert.equal(f.get('cloud-picker').open,true);assert.equal(f.document.body.classList.contains('picking-cloud'),true);
 assert.equal(f.get('cloud-game-name').textContent,dual.name);assert.equal(f.get('cloud-game-art').src,dual.art);
 const buttons=f.get('cloud-options').children;assert.equal(buttons.length,2);assert.equal(buttons[0].focused,true);
 buttons[1].onclick();buttons[0].onclick();const selected=await promise;assert.equal(selected.id,'gsn');assert.equal(selected.label,'Nova Server 2');assert.equal(selected.mark,'2');assert.equal(selected.url,dual.providers.gsn.url);
 assert.equal(f.get('cloud-picker').open,false);assert.equal(f.document.body.classList.contains('picking-cloud'),false);assert.equal(f.get('cloud-options').children.length,0);
});
test('cancel and page exit release the pending choice without starting a provider',async()=>{
 const f=fixture();let cancelled=0;const promise=f.api.choose(dual,{onCancel:()=>cancelled++});f.get('cloud-cancel').event('click');
 await assert.rejects(promise,{name:'AbortError'});assert.equal(cancelled,1);assert.equal(f.get('cloud-picker').open,false);
 const controller=new AbortController(),pending=f.api.choose(dual,{signal:controller.signal,onCancel:()=>cancelled++});controller.abort();
 await assert.rejects(pending,{name:'AbortError'});assert.equal(cancelled,1);assert.equal(f.document.body.classList.contains('picking-cloud'),false);
 await assert.rejects(f.api.choose(dual,{signal:controller.signal}),{name:'AbortError'});
});
test('Escape cancels and returns through the same exit callback',async()=>{
 const f=fixture();let cancelled=0;const promise=f.api.choose(dual,{onCancel:()=>cancelled++});f.get('cloud-picker').event('cancel');
 await assert.rejects(promise,{name:'AbortError'});assert.equal(cancelled,1);
});
test('import is idempotent, preserves Astra IDs and counts every GSN source game once',async()=>{
 const games=JSON.parse(await readFile(new URL('Public/library-cloud.json',root),'utf8')),rows=JSON.parse(await readFile(new URL('scripts/data/gsn-cloud-20261001.json',root),'utf8'));
 const result=mergeCloudCatalog(games,rows);assert.equal(result.shared,209);assert.equal(result.added,0);assert.deepEqual(result.games,games);
 assert.equal(games.find(g=>g.id==='jy0091').providers.gsn.sourceId,'jy0091');
 assert.equal(games.find(g=>g.id==='jy0108').name,'Grand Theft Auto V');assert.equal(games.find(g=>g.id==='gsn-bs0095').name,'Red Dead Redemption');
});
test('matching ignores punctuation and trademark styling but preserves editions and sequels',()=>{
 assert.equal(normalizeCloudTitle('Batman™: Arkham Knight'),normalizeCloudTitle('Batman: Arkham Knight'));
 assert.equal(normalizeCloudTitle('God of War: Ragnarök'),normalizeCloudTitle('God of War: Ragnarok'));
 assert.notEqual(normalizeCloudTitle('Red Dead Redemption'),normalizeCloudTitle('Red Dead Redemption 2'));
 assert.notEqual(normalizeCloudTitle('Tomb Raider'),normalizeCloudTitle('Tomb Raider - Definitive Edition'));
 const row={kind:'cloud',id:'cloud-jy0108',title:'Grand Theft Auto V',appPath:'/releases/browser-20261001-1/apps/cloud/index.html?game=jy0108',cover:'/cover.webp'};
 assert.throws(()=>mergeCloudCatalog([], [row,row]),/duplicate/);assert.throws(()=>mergeCloudCatalog([], [{...row,appPath:'https://other.example/game'}]),/Invalid GSN/);
});

async function playerFixture(){
 const f=fixture(),windowListeners=new Map(),timers=[],requests=[],adapters=[],gsnLoads=[];let resolveChoice;
 const promise=new Promise(resolve=>resolveChoice=resolve),frame=node();frame.contentDocument={documentElement:{dataset:{}},URL:'https://provider.example',querySelectorAll:()=>[],body:{innerText:'Provider launch'}};
 const sandbox={MutationObserver:class{observe(){}disconnect(){}},document:Object.assign(f.document,{addEventListener(){}}),localStorage:{getItem:()=>null},navigator:{userAgent:'Desktop'},location:{href:'http://localhost:8780/player.html?kind=cloud&id=jy0108',search:'?kind=cloud&id=jy0108',origin:'http://localhost:8780'},URLSearchParams,URL,AbortController,DOMException,performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout(fn,ms){timers.push(ms);return 1},clearTimeout(){},setInterval(){return 1},clearInterval(){},addEventListener(k,fn){windowListeners.set(k,fn)},fetch:async()=>({ok:true,json:async()=>[dual]}),NovaCloudProviders:{choose:()=>promise,entries:()=>[1,2]},NovaConnection:{prepare:async()=>{},create:async()=>({createFrame:()=>({element:frame,go:url=>requests.push(url)})})},NovaAstraCloud:{attach:(_doc,item)=>adapters.push(item)},postMessage(){}};
 sandbox.NovaGSNCloud={attach:(_doc,callbacks)=>{gsnLoads.push(callbacks);return true}};
 sandbox.window=sandbox;sandbox.parent=sandbox;vm.runInNewContext((await readFile(new URL('Public/src/player.js',root),'utf8')).replace("const {importedCloudLaunch}=await import('./imported-cloud-games.mjs?v=20261017-repair136');","const importedCloudLaunch=()=>null;").replace('(async()=>{','globalThis.playerExecution=(async()=>{'),sandbox);const execution=sandbox.playerExecution;
 await new Promise(resolve=>setImmediate(resolve));return{f,execution,resolveChoice,timers,requests,frame,adapters,gsnLoads,windowListeners};
}
test('player never starts a session or launch timeout while the picker is pending; GSN uses its per-game URL',async()=>{
 const f=await playerFixture();assert.deepEqual(f.requests,[]);assert.equal(f.timers.includes(60000),false);
 f.resolveChoice({id:'gsn',label:'Nova Cloud',...dual.providers.gsn});await f.execution;assert.deepEqual(f.requests,[dual.providers.gsn.url]);assert.ok(f.timers.includes(60000));
 f.frame.event('load');assert.equal(f.adapters.length,0);assert.equal(f.f.get('cloud-controls').hidden,false);assert.equal(f.f.get('cloud-switch').hidden,false);
 assert.equal(f.f.document.body.classList.contains('ready'),false,'Document load does not hide the GSN loading screen');
 f.gsnLoads[0].onStatus('Waiting for a server · Queue 4');assert.equal(f.f.get('message').textContent,'Waiting for a server · Queue 4');
 f.gsnLoads[0].onReady();assert.equal(f.f.document.body.classList.contains('ready'),true,'Video playback reveals the game');assert.equal(f.f.get('cloud-controls').hidden,true,'Cloud controls disappear during gameplay');
});
test('Astra selection retains the game selector metadata and does not mount GSN controls',async()=>{
 const f=await playerFixture();f.resolveChoice({id:'astra',label:'Astra',...dual.providers.astra});await f.execution;
 assert.deepEqual(f.requests,[dual.providers.astra.url]);f.frame.event('load');assert.equal(f.adapters[0].name,dual.name);assert.equal(f.adapters[0].sourceOccurrence,0);
 assert.notEqual(f.f.get('cloud-controls').hidden,false);
});
test('leaving before selecting cannot launch an orphaned cloud session',async()=>{
 const f=await playerFixture();f.windowListeners.get('pagehide')();f.resolveChoice({id:'gsn',...dual.providers.gsn});await f.execution;
 assert.deepEqual(f.requests,[]);assert.equal(f.timers.includes(60000),false);
});

 test('GhostCloud selection launches its native game link through the shared proxy',async()=>{
 const f=await playerFixture(),url='https://ghost-mathmulti.zeoghost.workers.dev/?play=jy0108';
 f.resolveChoice({id:'ghost',label:'GhostCloud',url,sourceId:'jy0108'});await f.execution;
 assert.deepEqual(f.requests,[url]);f.frame.event('load');assert.equal(f.adapters.length,0);assert.equal(f.gsnLoads.length,0);
 });
 test('three providers include GhostCloud with the selected title link',async()=>{
 const f=fixture(),url='https://ghost-mathmulti.zeoghost.workers.dev/?play=jy0108';
 const promise=f.api.choose({...dual,providers:{...dual.providers,ghost:{url,sourceId:'jy0108'}}});
 const buttons=f.get('cloud-options').children;assert.equal(buttons.length,3);buttons.find(b=>b.dataset.cloudProvider==='ghost').onclick();const choice=await promise;assert.equal(choice.id,'ghost');assert.equal(choice.url,url);
 });

test('Synapse uses the official direct game entry without the intermediate Achroma catalog',async()=>{const f=fixture();const chosen=await f.api.choose({name:'Brawl Stars',providers:{synapse:{url:'https://cdn.jsdelivr.net/gh/achroma-ubg/svg@latest/pages/games.html',sourceId:'com.supercell.brawlstars',source:'Synapse'}}});assert.equal(chosen.url,'https://bikesense.org/synapse/index.html?game=com.supercell.brawlstars');assert.equal(chosen.nativeSynapse,true);assert.equal(chosen.sourceId,'com.supercell.brawlstars');});

test('Luna appears alongside existing providers with exact selected title metadata',async()=>{const f=fixture(),metadata={url:'https://luna.loan/',name:'Brawl Stars',sourceId:'com.supercell.brawlstars',source:'Luna'};const promise=f.api.choose({name:'Brawl Stars',providers:{luna:metadata,synapse:{url:'https://bikesense.org/synapse/index.html',sourceId:'com.supercell.brawlstars'}}});const buttons=f.get('cloud-options').children;assert.equal(buttons.length,2);const luna=buttons.find(b=>b.dataset.cloudProvider==='luna');assert.ok(luna);luna.onclick();const selected=await promise;assert.equal(selected.sourceId,metadata.sourceId);assert.equal(selected.url,metadata.url);assert.equal(selected.label,'Nova Server 6')});

test('Niche is available on matching titles and broken GTA File is removed',async()=>{const f=fixture(),catalog=JSON.parse(await readFile(new URL('Public/library-cloud.json',root),'utf8'));assert.equal(catalog.filter(g=>g.providers?.niche).length,225);assert.ok(catalog.every(g=>!g.providers?.gtafile));const gta=catalog.find(g=>g.id==='jy0108');const choices=f.api.entries(gta);assert.ok(!choices.some(g=>g.id==='gtafile'));assert.equal(choices.find(g=>g.id==='niche').sourceId,'jy0108');assert.equal(choices.find(g=>g.id==='niche').label,'Nova Server 7')});
