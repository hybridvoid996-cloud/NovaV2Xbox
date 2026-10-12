import test from 'node:test';import assert from 'node:assert/strict';import {changeEngagement,engagementTotals} from '../server/game-engagement.mjs';
test('repeat openings count each player once',()=>{let r=changeEngagement(null,'a','view');r=changeEngagement(r,'a','view');r=changeEngagement(r,'b','view');assert.equal(engagementTotals(r,'a').views,2);});
test('votes are exclusive, switchable and removable',()=>{let r=changeEngagement(null,'a','like');r=changeEngagement(r,'b','like');r=changeEngagement(r,'a','dislike');assert.deepEqual(engagementTotals(r,'a'),{views:0,likes:1,dislikes:1,choice:'dislike'});r=changeEngagement(r,'a','dislike');assert.deepEqual(engagementTotals(r,'a'),{views:0,likes:1,dislikes:0,choice:null});});

