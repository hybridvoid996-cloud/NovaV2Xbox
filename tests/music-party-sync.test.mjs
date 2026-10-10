import test from 'node:test';import assert from 'node:assert/strict';
import {partyClockOffset} from '../Public/src/music-party-sync.mjs';
test('waiting for a party event does not introduce seconds of audio clock drift',()=>{
 assert.equal(partyClockOffset({serverNow:9100,serverWaitMs:8000},1000,9200),0);
 assert.equal(partyClockOffset({serverNow:9400,serverWaitMs:8000},1000,9200),300);
 assert.equal(partyClockOffset({serverNow:1100},1000,1200),0);
 assert.equal(partyClockOffset({},1000,1200),null);
});
