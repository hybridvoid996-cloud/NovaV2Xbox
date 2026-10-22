import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

test('Blocky Snakes releases its interstitial wait after the current Unity callback returns',async()=>{
 const source=await readFile(new URL('../Public/src/blocky-snakes-host.js',import.meta.url),'utf8');
 const messages=[];
 const window={gameInstance:{SendMessage(...args){messages.push(args)}}};
 vm.runInNewContext(source,{window,Promise});
 window.ShowAds();
 assert.deepEqual(messages,[]);
 await Promise.resolve();
 assert.deepEqual(messages,[['AdsManager','onAdServed']]);
 const html=await readFile(new URL('../Public/content/games/168.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('/src/blocky-snakes-host.js')<html.indexOf('/src/unity-legacy-native.js'));
});
