import test from 'node:test';import assert from 'node:assert/strict';import {changeEngagement,engagementTotals} from '../server/game-engagement.mjs';
test('repeat openings increase total views',()=>{let r=changeEngagement(null,'a','view');r=changeEngagement(r,'a','view');r=changeEngagement(r,'b','view');assert.equal(engagementTotals(r,'a').views,3);});
test('votes are exclusive, switchable and removable',()=>{let r=changeEngagement(null,'a','like');r=changeEngagement(r,'b','like');r=changeEngagement(r,'a','dislike');assert.deepEqual(engagementTotals(r,'a'),{views:0,likes:1,dislikes:1,choice:'dislike'});r=changeEngagement(r,'a','dislike');assert.deepEqual(engagementTotals(r,'a'),{views:0,likes:1,dislikes:0,choice:null});});


test('existing unique-view totals migrate without losing history and reads or votes add no views',()=>{let r={viewers:{a:true,b:true},votes:{}};assert.equal(engagementTotals(r,'a').views,2);r=changeEngagement(r,'a','view');assert.equal(engagementTotals(r,'a').views,3);r=changeEngagement(r,'a','like');assert.equal(engagementTotals(r,'a').views,3);assert.equal(r.viewers,undefined);});
