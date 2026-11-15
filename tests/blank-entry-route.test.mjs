import test from 'node:test';
import assert from 'node:assert/strict';
import {routeBlankEntry} from '../Public/src/blank-entry-route.mjs';

test('allowed automatic popup loads Home in the blank tab and retires the source',()=>{
 const launches=[],destinations=[];
 const result=routeBlankEntry({href:'https://nova.example/blank-entry.html?view=games#friends',launch:options=>{launches.push(options.url);return true},navigate:url=>destinations.push(url)});
 assert.equal(result,'blank');
 assert.deepEqual(launches,['https://nova.example/home.html?view=games#friends']);
 assert.deepEqual(destinations,['about:blank']);
});

test('blocked and failed popup attempts automatically load Home without a button',()=>{
 for(const launch of [()=>false,()=>{throw Error('Popup denied')}]){
  const destinations=[];
  assert.equal(routeBlankEntry({href:'https://nova.example/blank-entry.html?view=games#friends',launch,navigate:url=>destinations.push(url)}),'regular');
  assert.deepEqual(destinations,['https://nova.example/home.html?view=games&nova-regular=1#friends']);
 }
});

test('localhost variants never attempt a popup',()=>{
 for(const hostname of ['localhost','127.0.0.1','[::1]']){
  let destination;
  routeBlankEntry({href:'http://'+hostname+':8797/blank-entry.html',launch:()=>assert.fail('Local preview must stay in this tab'),navigate:url=>destination=url});
  assert.equal(destination,'http://'+hostname+':8797/home.html?nova-regular=1');
 }
});

test('explicit regular mode and disabled preference do not reopen the popup',()=>{
 for(const config of [{href:'https://nova.example/blank-entry.html?nova-regular=1'},{href:'https://nova.example/blank-entry.html',enabled:false}]){
  let destination;
  routeBlankEntry({...config,launch:()=>assert.fail('No popup expected'),navigate:url=>destination=url});
  assert.equal(destination,'https://nova.example/home.html?nova-regular=1');
 }
});
