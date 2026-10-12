import test from 'node:test';
import assert from 'node:assert/strict';
import {runtime} from './buildnow-engine-fixture.mjs';
import {patchWasm} from '../server/buildnow-engine.mjs';
import {createToolsRestorer,normalizeTools} from '../server/buildnow-settings.mjs';

test('new round reacquires a living owned avatar even if the previous controller remains allocated',async()=>{
 const f=runtime({hostname:'nova.example',offline:false});await f.load();f.api.setFlight(true);f.api.setSilent(true);
 const first=f.api.snapshot().playerGeneration;f.advance(300);f.setOpponentOwned(true);f.dispatch(1,f.opponent);
 let state=f.api.snapshot();assert.equal(state.playerId,f.opponent);assert.equal(state.hasPlayer,true);assert.equal(state.playerGeneration,first+1);assert.equal(state.flight,false);assert.equal(state.silent,false);
 const config=normalizeTools({enabled:{flight:true,silent:true},engine:{flight:{speed:18}}}),restore=createToolsRestorer(()=>config,()=>f.api);
 restore.sync(state);assert.equal(f.api.snapshot().flight,true);assert.equal(f.api.snapshot().silent,true);
 f.key('keydown','KeyD');f.advance(17);f.dispatch(2,f.opponentMotor);assert.equal(f.physicsOwners.at(-1),f.opponent);assert(f.physicsWrites.at(-1)[0]>0);
 f.advance(61);f.dispatch(1,f.own);assert.equal(f.api.snapshot().playerId,f.opponent,'a fresh new avatar is not replaced by the retained previous controller');
});

test('same native pointer with a replacement motor starts a fresh control generation',async()=>{
 const f=runtime({hostname:'nova.example',offline:false});await f.load();f.api.setFlight(true);f.api.setSilent(true);const generation=f.api.snapshot().playerGeneration;
 f.writeWord(f.own+180,f.opponentMotor);f.writeWord(f.own+264,2);f.advance(101);f.dispatch(1);
 const state=f.api.snapshot();assert.equal(state.playerId,f.own);assert.equal(state.playerGeneration,generation+1);assert.equal(state.flight,false);assert.equal(state.silent,false);
 createToolsRestorer(()=>normalizeTools({enabled:{flight:true,silent:true}}),()=>f.api).sync(state);
 f.key('keydown','KeyD');f.advance(17);f.dispatch(2,f.opponentMotor);assert.equal(f.api.snapshot().flight,true);assert(f.physicsWrites.at(-1)[0]>0);
});

test('reused controller revives and restores controls after death without overwriting saved intent',async()=>{
 const f=runtime({hostname:'nova.example',offline:false});await f.load();const config=normalizeTools({enabled:{flight:true,silent:true}}),restore=createToolsRestorer(()=>config,()=>f.api);
 restore.sync(f.api.snapshot());const generation=f.api.snapshot().playerGeneration;
 f.writeByte(f.own+1331,1);f.advance(101);f.dispatch(1);restore.sync(f.api.snapshot());assert.equal(f.api.snapshot().hasPlayer,false);assert.equal(f.api.snapshot().flight,false);
 f.writeByte(f.own+1331,0);f.writeWord(f.own+264,2);f.advance(101);f.dispatch(1);restore.sync(f.api.snapshot());
 assert.equal(f.api.snapshot().playerGeneration,generation+1);assert.equal(f.api.snapshot().flight,true);assert.equal(f.api.snapshot().silent,true);assert.equal(config.enabled.flight,true);
});

test('saved tuning reapplies for reused pointers with a new generation without repeatedly setting active controls',()=>{
 const state={ready:true,controlsAllowed:true,hasPlayer:true,playerId:10,playerGeneration:1,flight:false},calls=[];
 const engine={setFlightOptions:x=>calls.push(['options',x.speed]),setFlight:x=>{calls.push(['flight',x]);state.flight=x;}};
 const restore=createToolsRestorer(()=>normalizeTools({enabled:{flight:true},engine:{flight:{speed:20}}}),()=>engine);
 restore.sync(state);restore.sync(state);assert.deepEqual(calls,[['options',20],['flight',true]]);
 state.playerGeneration=2;state.flight=false;restore.sync(state);assert.deepEqual(calls,[['options',20],['flight',true],['options',20],['flight',true]]);
});

test('flight hook executes after native movement preparation and before the native move consumes velocity',async()=>{
 const section=(id,bytes)=>[id,bytes.length,...bytes],body=[0,32,0,16,0,32,0,16,0,11];let hash=2166136261;for(const byte of body)hash=Math.imul(hash^byte,16777619)>>>0;
 const bytes=new Uint8Array([0,97,115,109,1,0,0,0,
 ...section(1,[3,96,1,127,0,96,4,127,127,127,127,0,96,2,127,127,0]),
 ...section(2,[2,1,97,1,78,0,0,1,97,1,75,0,1]),...section(3,[1,2]),...section(7,[1,2,103,111,0,2]),...section(10,[1,body.length,...body])]);
 const profile={byteLength:bytes.length,importCount:2,callbackImport:1,functions:1,magic:0x4e564100,hooks:[{fn:2,size:body.length,hash,id:2,args:[0,1,null],at:5,before:[32,0,16,0],after:[32,0]}]};
 const patched=patchWasm(bytes,profile);assert(WebAssembly.validate(patched));let velocity=0,nativeCalls=0;const consumed=[];
 const {instance}=await WebAssembly.instantiate(patched,{a:{N:()=>{if(!nativeCalls++)velocity=0;else consumed.push(velocity);},K:()=>{velocity=12;}}});instance.exports.go(1,0);assert.deepEqual(consumed,[12]);
 assert.throws(()=>patchWasm(bytes,{...profile,hooks:[{...profile.hooks[0],before:[0,0,0,0]}]}),/movement boundary/);
});

test('brief local-player callback stalls keep enabled controls, while expired controllers retire',async()=>{
 const f=runtime({hostname:'nova.example',offline:false});await f.load();f.api.setFlight(true);f.api.setSilent(true);
 f.advance(500);let state=f.api.snapshot();assert.equal(state.hasPlayer,true);assert.equal(state.flight,true);assert.equal(state.silent,true);
 f.advance(1001);state=f.api.snapshot();assert.equal(state.hasPlayer,false);assert.equal(state.flight,false);assert.equal(state.silent,false);
});
