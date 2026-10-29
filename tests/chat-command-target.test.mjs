import test from 'node:test';import assert from 'node:assert/strict';import {resolveCommandTarget as resolve} from '../Public/src/chat-command-target.mjs';
const profiles={abc:{name:'Owner',displayName:'Custom name'},def:{name:'Friend'},ghi:{name:'Friend'}};
test('badge and staff commands resolve picker mentions and canonical usernames',()=>{for(const target of ['@<abc>','<@abc>','<@!abc>','abc','@Owner','"Owner"'])assert.equal(resolve(target,profiles)[0],'abc');assert.equal(resolve('',profiles,'abc')[0],'abc')});
test('ambiguous and missing recipients never silently choose an account',()=>{assert.equal(resolve('Friend',profiles),null);assert.equal(resolve('missing',profiles),null);assert.equal(resolve('Custom name',profiles),null)});
