import test from 'node:test';
import assert from 'node:assert/strict';
import {createWagerNotice} from '../Public/src/novaflip/wager-notice.mjs';
test('joining a wager lobby announces the minimum without repeating on room updates',()=>{
 const messages=[],notice=createWagerNotice(m=>messages.push(m));
 notice(true);notice(true);notice(true,true);
 assert.equal(messages.length,1);assert.match(messages[0],/5,000 Nova Coins/);
});
test('host enabling wagers announces it; disabling and enabling permits a new notice',()=>{
 const messages=[],notice=createWagerNotice(m=>messages.push(m));
 notice(false);assert.equal(messages.length,0);notice(true);notice(false);notice(true,true);
 assert.equal(messages.length,2);assert.match(messages[1],/bet is placed/);
});
