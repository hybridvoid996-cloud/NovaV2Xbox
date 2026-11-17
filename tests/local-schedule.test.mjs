import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {localGameCatalog} from '../server/local-game-catalog.mjs';
import {nativeGameURL} from '../Public/src/native-game-frame.mjs';
test('only an installed local preview appears in the local catalog',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'nova-local-game-'));
 try{
  await writeFile(path.join(root,'library-games.json'),'[]');
  assert.equal(await localGameCatalog({headers:{host:'127.0.0.1:8780'}},root),null);
  const dir=path.join(root,'content/local-schedule-i');await mkdir(dir,{recursive:true});
  await writeFile(path.join(dir,'index.html'),'preview');await writeFile(path.join(dir,'nova-local-build.json'),JSON.stringify({addedAt:'2026-11-17T00:00:00Z'}));
  const catalog=await localGameCatalog({headers:{host:'localhost:8780'}},root);
  assert.equal(catalog[0].name,'Schedule I Demo');assert.equal(catalog[0].localOnly,true);
  assert.equal(await localGameCatalog({headers:{host:'nova.example'}},root),null);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('local Schedule I launches directly, without sending its large files through the proxy',()=>{
 const item={id:'local-schedule-i',url:'/content/local-schedule-i/index.html'};
 assert.equal(nativeGameURL(item,'game','http://localhost:8780/player.html'),'http://localhost:8780/content/local-schedule-i/index.html');
 assert.equal(nativeGameURL(item,'game','https://nova.example/player.html'),null);
 assert.equal(nativeGameURL({...item,url:'https://other.example/game'},'game','http://localhost:8780/player.html'),null);
});
test('public Schedule I uses the audited same-origin game path',()=>{
 const item={id:'schedule-i-demo',url:'content/schedule-i/index.html'};
 assert.equal(nativeGameURL(item,'game','https://nova.example/player.html'),'https://nova.example/content/schedule-i/index.html');
 assert.equal(nativeGameURL({...item,url:'https://other.example/content/schedule-i/index.html'},'game','https://nova.example/player.html'),null);
 assert.equal(nativeGameURL({...item,url:'/content/other/index.html'},'game','https://nova.example/player.html'),null);
});
