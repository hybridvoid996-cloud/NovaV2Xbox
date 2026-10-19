import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeGameURL} from '../Public/src/native-game-frame.mjs';
import {gameIdentity,parseNoahCatalog,planNoahImport} from '../scripts/noah-import-plan.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url));
const manifest=JSON.parse(read('../Public/content/noah-import/manifest.json'));
const catalog=JSON.parse(read('../Public/library-games.json'));
test('alternate names deduplicate without removing sequels',()=>{
 assert.equal(gameIdentity('Skate 3'),gameIdentity('Skate 3 Rust'));
 assert.notEqual(gameIdentity('Hotline Miami 2'),gameIdentity('Hotline Miami'));
 assert.equal(planNoahImport([{title:'Skate 3'}],[{name:'Skate 3 Rust'}]).added.length,0);
});
test('source parser extracts data without executing scripts and rejects unsafe paths',()=>{
 const text='{ title: "Test", desc: "Game", url: "games/1.html", image: "images/1.jpg" }';
 assert.equal(parseNoahCatalog('throw Error("never execute");'+text)[0].title,'Test');
 assert.throws(()=>parseNoahCatalog(text.replace('games/1.html','javascript:alert(1)')));
});
test('every imported game has intact local code, cover, new badge and a constrained launch route',()=>{
 const stamps=JSON.parse(read('../Public/library-added.json'));
 assert.equal(manifest.games.length,114);
 assert.equal(new Set(catalog.map(x=>x.id)).size,catalog.length);
 for(const imported of manifest.games){
  const entry=catalog.find(x=>x.id===imported.id);assert.ok(entry);
  const html=read('../Public/content/noah-import/games/'+imported.id+'.html'),cover=read('../Public/'+entry.art);
  assert.equal(createHash('sha256').update(html).digest('hex'),imported.htmlSha256);
  assert.equal(createHash('sha256').update(cover).digest('hex'),imported.coverSha256);
  assert.ok(/<base\b/i.test(html.toString())||html.toString().includes("https://nova-content.invalid")||html.toString().includes('src="/src/'));
  assert.ok(stamps['game:'+entry.id]);
  assert.equal(nativeGameURL(entry,'game','http://localhost:8780/player.html'),entry.id===889?'http://localhost:8780/'+entry.url:null);
 }
});
