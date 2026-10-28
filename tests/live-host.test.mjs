import test from 'node:test';
import assert from 'node:assert/strict';
import {ownsLiveHost} from '../Public/src/live-host.mjs';
const page=(parent,scripts=[])=>{const w={document:{scripts:scripts.map(src=>({src}))}};w.parent=parent||w;return w};
test('standalone pages and embedded Home under a blank wrapper own a live host',()=>{
 assert.equal(ownsLiveHost(page()),true);
 assert.equal(ownsLiveHost(page(page())),true);
});
test('child apps share the ancestor broadcast without creating duplicates',()=>{
 const home=page(null,['https://nova.test/src/live-announcements.js?v=350']);
 assert.equal(ownsLiveHost(page(home)),false);
 const active=page();active.__novaLiveActive=true;
 assert.equal(ownsLiveHost(page(active)),false);
 assert.equal(ownsLiveHost(active),false);
});
test('an inaccessible wrapper does not suppress the accessible Nova banner',()=>{
 const wrapper={get document(){throw Error('cross-origin')}};
 assert.equal(ownsLiveHost(page(wrapper)),true);
});
