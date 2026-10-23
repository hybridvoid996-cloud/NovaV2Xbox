import test from 'node:test';
import assert from 'node:assert/strict';
import {repairGameAssetURL} from '../Public/src/game-asset-route.mjs';
test('Class of 09 media resolves from its matching original export rather than Nova page location',()=>{
 const url=new URL('https://nova-content.invalid/content/games/game/opening.webm?v=1');
 assert.equal(repairGameAssetURL(url,259).href,'https://raw.githubusercontent.com/giorgirick2-gif/game-webports-onawebsite/b3042ae7a56b2ede39ea4b4371b1d0ab3af8828a/class-of-09/game/opening.webm?v=1');
 assert.equal(repairGameAssetURL(url,968),url);
 const other=new URL('https://other.test/content/games/game/opening.webm');assert.equal(repairGameAssetURL(other,259),other);
});
test('Bendy uses the same original engine files when its CDN rejects them',()=>{
 const root='https://cdn.jsdelivr.net/gh/genizy/web-port@main/bendy/Build/';
 for(const file of ['BATIM.wasm.code.unityweb','BATIM.wasm.framework.unityweb']){
  const url=new URL(root+file+'?v=1');
  assert.equal(repairGameAssetURL(url,215).href,'https://raw.githubusercontent.com/genizy/web-port/main/bendy/Build/'+file+'?v=1');
  assert.equal(repairGameAssetURL(url,216),url);
 }
 const other=new URL('https://other.test/bendy/Build/BATIM.wasm.code.unityweb');assert.equal(repairGameAssetURL(other,215),other);
});
test('CircloO 2 resolves only its identified missing shared sounds within the same export',()=>{
 const root='https://cdn.jsdelivr.net/gh/bubbls/UGS-Assets@a39ea4b5ce534bf7b1c21000a2a0929fef178a1e/circlo02/html5game_a5/';
 for(const sound of ['music','levelgrow','levelfinished','menu_choose','menu_back']){
  const url=new URL(root+'snd_'+sound+'_circloo1.ogg?v=1');
  assert.equal(repairGameAssetURL(url,275).href,root+'snd_'+sound+'.ogg?v=1');
  assert.equal(repairGameAssetURL(url,274),url);
 }
 const unrelated=new URL(root+'snd_other_circloo1.ogg');assert.equal(repairGameAssetURL(unrelated,275),unrelated);
 const other=new URL('https://other.example/snd_music_circloo1.ogg');assert.equal(repairGameAssetURL(other,275),other);
});
test('Monster Tracks recovers its original files without changing their filenames',()=>{
 const url=new URL('https://cdn.jsdelivr.net/gh/genizy/google-class/monster-tracks/webapp/index.wasm?v=1');
 assert.equal(repairGameAssetURL(url,36).href,'https://raw.githubusercontent.com/genizy/google-class/main/monster-tracks/webapp/index.wasm?v=1');
 assert.equal(repairGameAssetURL(url,35),url);
});

test('Fear and Hunger resolves its lowercased export files without changing other games or hosts',()=>{const url=new URL('https://cdn.jsdelivr.net/gh/web-ports/fear-and-hunger-2@latest/js/plugins/VE_FogAndOverlay.js?v=1');assert.equal(repairGameAssetURL(url,794).href,'https://cdn.jsdelivr.net/gh/web-ports/fear-and-hunger-2@latest/js/plugins/ve_fogandoverlay.js?v=1');assert.equal(repairGameAssetURL(url,793),url);const other=new URL('https://other.example/js/plugins/VE_FogAndOverlay.js');assert.equal(repairGameAssetURL(other,794),other)});
