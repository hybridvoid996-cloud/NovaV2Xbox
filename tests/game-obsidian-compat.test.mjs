import test from 'node:test';import assert from 'node:assert/strict';import {repairObsidianGame} from '../Public/src/game-obsidian-compat.mjs';test('Terraria eval import resolves against its module instead of the document',async()=>{const url=new URL('https://playobsidian.com/cdn/assets/html/a498930d-5864-472b-ac6f-e1e41886c095/1.4.5.5/assets/index.js'),response={status:200,headers:[['content-type','text/javascript'],['content-length','42']],body:"const dotnet=(await eval('import(\"../_framework/dotnet.js\")')).dotnet"};const r=await repairObsidianGame(url,response,{gameId:1041});assert.match(r.body,/await import/);assert.ok(!r.body.includes('eval('));assert.equal(r.headers.length,1);assert.equal(await repairObsidianGame(url,response,{gameId:1}),response)});
test('Wii uses the published partition layout while local disc files remain unchanged',async()=>{
 const url=new URL('https://playobsidian.com/cdn/assets/html/46975ef1-a576-49c2-b0ae-b740301204d2/1/rgh-worker.js'),response={status:200,headers:[['content-type','text/javascript']],body:"function fileUrl(path) { return cfg.base + path.split('/').map(encodeURIComponent).join('/'); }"};
 const repaired=await repairObsidianGame(url,response,{gameId:1047});const resolve=new Function('cfg','path',repaired.body+';return fileUrl(path)');
 assert.equal(resolve({base:'https://game/',localFiles:null},'game/part/sys/main.dol'),'https://game/game/sys/main.dol');assert.equal(resolve({base:'https://game/'},'game/main.dol'),'https://game/game/sys/main.dol');assert.equal(resolve({base:'https://game/',localFiles:{}},'game/part/sys/main.dol'),'https://game/game/part/sys/main.dol');assert.equal(await repairObsidianGame(url,response,{gameId:1041}),response);
});
test('Minecraft server list works with signed hints and ordinary launch options',async()=>{
 const url=new URL('https://playobsidian.com/cdn/assets/html/440c5a5c-4e43-4404-90dd-67d0c877fcf3/versions/servers.js');const response={status:200,headers:[],body:'const servers = [{addr:"wss://test.example"}]; function setServers(){window.eaglercraftXOpts.servers = servers;} setServers();'};
 const patched=await repairObsidianGame(url,response,{gameId:1044});for(const key of ['eaglercraftXOpts','eaglercraftXOptsHints']){const window={[key]:{}};new Function('window',patched.body)(window);assert.equal(window[key].servers[0].addr,'wss://test.example')}
 assert.equal(await repairObsidianGame(url,response,{gameId:1041}),response);
});

test('Minecraft 26 isolates incompatible worlds without changing older builds',async()=>{const url=new URL('https://playobsidian.com/cdn/assets/html/440c5a5c-4e43-4404-90dd-67d0c877fcf3/versions/eaglercraft-26.2-zeus-skins.html');const response={status:200,headers:[],body:'window.eaglercraftXOpts={worldsDB: "worlds", resourcePacksDB: "resourcePacks"};'};const result=await repairObsidianGame(url,response,{gameId:1044});assert.match(result.body,/nova-minecraft-26-worlds/);assert.match(result.body,/nova-minecraft-26-resourcePacks/);assert.equal(await repairObsidianGame(new URL('EaglercraftX_1.8_u53_Offline_Signed.html',url),response,{gameId:1044}),response);assert.equal(await repairObsidianGame(url,response,{gameId:181}),response);});

test('Wii relative asset base resolves against its source, not the proxy document',async()=>{const url=new URL('https://playobsidian.com/cdn/assets/html/46975ef1-a576-49c2-b0ae-b740301204d2/1/rgh-host.js');const r={status:200,headers:[],body:"const url=new URL(data.assetBase,location.href);const cfg={base:remoteBase || new URL('./', location.href).href};"};const p=await repairObsidianGame(url,r,{gameId:1047});const run=new Function('data','location','remoteBase',p.body+';return [url.href,cfg.base]');const base=new URL('./',url).href;assert.deepEqual(run({assetBase:'./'},{href:'https://nova.test/~/sj/p/session/encoded'},null),[base,base]);assert.deepEqual(run({assetBase:'https://files.test/wii/'},{href:'https://nova.test/elsewhere'},'https://files.test/wii/'),['https://files.test/wii/','https://files.test/wii/']);assert.equal(await repairObsidianGame(url,r,{gameId:1044}),r);});

test('Terraria runtime stays valid after the proxy removes debugger statements',async()=>{
 const url=new URL('https://playobsidian.com/cdn/assets/html/a498930d-5864-472b-ac6f-e1e41886c095/1.4.5.5/_framework/dotnet.runtime.x6mqyd7uyt.js');
 const response={status:200,headers:[['content-length','20']],body:'function ready(){if(globalThis.dotnetDebugger)debugger}'};
 const patched=await repairObsidianGame(url,response,{gameId:1041});
 const filtered=patched.body.replace(/debugger;?/g,'');
 new Function('globalThis',filtered+';ready();')({dotnetDebugger:true});
 new Function('globalThis',filtered+';ready();')({dotnetDebugger:false});
 assert.deepEqual(patched.headers,[]);assert.equal(await repairObsidianGame(url,response,{gameId:1047}),response);
});
