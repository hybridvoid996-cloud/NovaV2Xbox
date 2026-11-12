import test from 'node:test';
import assert from 'node:assert/strict';
import {isRankRuntimeHost} from '../Public/src/nova-rank-host.mjs';
import {advanceRank} from '../Public/src/nova-rank-core.mjs';
test('rank tracking starts in a normal tab and Nova blank workspace, not nested players',()=>{
 const top={};top.top=top;assert.equal(isRankRuntimeHost(top),true);
 const home={top,parent:{__novaBlankHost:true},location:{href:'https://nova.test/home.html'},frameElement:{id:'nova-blank-frame'}};
 assert.equal(isRankRuntimeHost(home),true);
 assert.equal(isRankRuntimeHost({...home,location:{href:'https://nova.test/player.html?kind=game&id=1'}}),false);
 assert.equal(isRankRuntimeHost({...home,parent:{}}),false);
 assert.equal(isRankRuntimeHost({...home,frameElement:{id:'system'}}),false);
 assert.equal(isRankRuntimeHost({get top(){throw Error('Cross origin')}}),false);
});
test('active play in the blank workspace can accumulate ELO while idle play does not',()=>{
 const event={active:true,game:'game:1',session:'12345678-1234-1234-1234-123456789012'};let record={};
 for(let i=0;i<=4;i++)record=advanceRank(record,event,1700000000000+i*15000).record;
 assert.equal(record.elo,1);assert.equal(record.seconds,60);
 const paused=advanceRank(record,{...event,active:false},1700000075000).record;
 assert.equal(paused.elo,1);
});
