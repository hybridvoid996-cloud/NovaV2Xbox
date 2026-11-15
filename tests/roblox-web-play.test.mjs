import test from 'node:test';
import assert from 'node:assert/strict';
import {officialWebPlayURL} from '../Public/src/roblox-web-play.mjs';
test('official browser launch accepts Place IDs and real Roblox experience links',()=>{
 for(const value of ['189707',' https://www.roblox.com/games/189707/Natural-Disaster-Survival ','https://play.roblox.com/games/start?placeId=189707'])assert.equal(officialWebPlayURL(value),'https://play.roblox.com/games/start?placeId=189707');
});
test('official browser launch cannot forward untrusted destinations or session parameters',()=>{
 for(const value of ['',0,-1,'URPLACEID','1&token=secret','https://evil.example/games/189707','https://www.roblox.com.evil.example/games/189707','https://user:pass@www.roblox.com/games/189707','javascript:alert(1)','https://www.roblox.com/users/189707'])assert.equal(officialWebPlayURL(value),null);
 assert.equal(officialWebPlayURL('https://play.roblox.com/games/start?placeId=189707&token=discarded'),'https://play.roblox.com/games/start?placeId=189707');
});
