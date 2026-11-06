import test from 'node:test';import assert from 'node:assert/strict';
import {relayOriginAllowed} from '../server/relay-origin.mjs';
const req=origin=>({headers:{host:'relay.example.com',origin}});
test('relay keeps same-host behavior and permits only explicitly approved separate HTTPS origins',()=>{
 assert.equal(relayOriginAllowed(req('https://relay.example.com'),{}),true);
 const env={NOVA_ALLOWED_ORIGINS:'https://nova.example.com'};
 assert.equal(relayOriginAllowed(req('https://nova.example.com'),env),true);
 for(const value of ['https://nova.example.com.evil.test','https://nova.example.com/path','http://nova.example.com','null',undefined])assert.equal(relayOriginAllowed(req(value),env),false);
 assert.equal(relayOriginAllowed(req('https://nova.example.com'),{}),false);
});
