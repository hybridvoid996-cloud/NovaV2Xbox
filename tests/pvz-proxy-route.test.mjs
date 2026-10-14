import test from 'node:test';import assert from 'node:assert/strict';import {nativeGameURL} from '../Public/src/native-game-frame.mjs';
test('both PvZ library entries use the proxy rather than direct-frame exceptions',()=>{for(const [id,url]of [[232,'content/games/232.html'],[597,'content/games/597-a.html']])assert.equal(nativeGameURL({id,url},'game','https://nova.example/player.html'),null);});
