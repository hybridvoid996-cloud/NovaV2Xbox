import {runtime} from './buildnow-engine-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash, webcrypto} from 'node:crypto';
import {
  patchWasm, directedVector, bindPlayer, choosePlayerTarget, installEngine, engineRuntimeSource,
} from '../server/buildnow-engine.mjs';

const epsilon = 1e-9;
const near = (actual, expected) => assert(Math.abs(actual - expected) < epsilon, `${actual} differs from ${expected}`);
const player = (pointer, position, seen = 1000, extra = {}) => ({pointer, position, seen, dead: false, mine: false, ...extra});
const region = (x, origin, extra = {}) => ({x, y: 0, worldOrigin: origin, worldPoint: origin.map((value, axis) => value + (axis === 1 ? 1 : 0)), ...extra});

test('shot direction is normalized and preserves projectile speed', () => {
  const direction = directedVector([1, 2, 3], [4, 6, 3]);
  direction.forEach((value, index) => near(value, [0.6, 0.8, 0][index]));
  const projectile = directedVector([1, 2, 3], [4, 6, 3], 37);
  near(Math.hypot(...projectile), 37);
  projectile.forEach((value, index) => near(value, [22.2, 29.6, 0][index]));
  assert.deepEqual(directedVector([0, 0, 0], [0, -5, 0], 8), [0, -8, 0]);
});

test('shot direction rejects degenerate, malformed, and nonfinite vectors or speeds', () => {
  for (const origin of [null, [], [0, 0], [0, 0, 0, 0], [NaN, 0, 0], [Infinity, 0, 0], new Array(3)]) {
    assert.equal(directedVector(origin, [1, 2, 3]), null);
  }
  for (const target of [undefined, [], [1, 2], [1, 2, 3, 4], [1, Infinity, 3]]) {
    assert.equal(directedVector([0, 0, 0], target), null);
  }
  for (const speed of [0, -1, NaN, Infinity, '5']) assert.equal(directedVector([0, 0, 0], [1, 2, 3], speed), null);
  assert.equal(directedVector([1, 2, 3], [1, 2, 3]), null);
  assert.equal(directedVector([0, 0, 0], [0.0005, 0, 0]), null);
  assert.equal(directedVector([-Number.MAX_VALUE, 0, 0], [Number.MAX_VALUE, 0, 0]), null, 'overflow cannot produce an invalid direction');
  near(directedVector([0, 0, 0], [1e200, 0, 0], 1e200)[0], 1e200);
});

test('player binding selects the nearest fresh live registered player within tolerance', () => {
  const valid = player(10, [1, 2, 3]);
  const players = [
    player(20, [0, 2, 3], 749),
    player(30, [0, 2, 3], 1000, {dead: true}),
    player(40, [NaN, 2, 3]),
    player(41, [0, 2, 3], NaN),
    player(42, [0, 2, 3], 1001),
    valid,
    player(50, [2, 2, 3]),
  ];
  assert.equal(bindPlayer([0, 2, 3], players, 1000), valid);
  assert.equal(bindPlayer([0, 2, 3], [player(60, [3, 2, 3])], 1000), null, 'tolerance boundary is excluded');
  assert.equal(bindPlayer([0, 2, 3], [player(60, [0, 2, 3], 750)], 1000)?.pointer, 60, '250 ms old remains fresh');
  assert.equal(bindPlayer([100, 100, 100], players, 1000), null);
  assert.equal(bindPlayer([NaN, 2, 3], players, 1000), null);
  assert.equal(bindPlayer([0, 2], players, 1000), null);
});

test('malformed registered positions cannot authorize geometry as a player target', () => {
  for (const position of [[0, 0], [0, 0, 0, 0], [0, 0, Infinity], new Array(3)]) {
    assert.equal(bindPlayer([0, 0, 0], [player(10, position)], 1000), null);
  }
});

test('target selection excludes stale, dead, own, and unregistered geometry', () => {
  const players = [
    player(10, [0, 0, 0], 1000, {mine: true, controlled: true}),
    player(11, [10, 0, 0]),
    player(12, [20, 0, 0], 749),
    player(13, [30, 0, 0], 1000, {dead: true}),
    player(14, [40, 0, 0]),
  ];
  const regions = [region(0, [0, 0, 0]), region(1, [10, 0, 0]), region(2, [20, 0, 0]), region(3, [30, 0, 0]), region(4, [100, 0, 0]), region(15, [40, 0, 0])];
  assert.equal(choosePlayerTarget(regions, players, 11, 1000)?.player, 14);
  assert.equal(choosePlayerTarget(regions.slice(0, -1), players, 11, 1000), null);
});

test('client ownership alone does not exclude a training target', () => {
  const ownedTarget = player(10, [10, 0, 0], 1000, {mine: true, controlled: false});
  assert.equal(choosePlayerTarget([region(0, [10, 0, 0])], [ownedTarget], 20, 1000)?.player, 10);
  assert.equal(choosePlayerTarget([region(0, [10, 0, 0])], [ownedTarget], 10, 1000), null, 'the actual own pointer stays excluded');
  assert.equal(choosePlayerTarget([region(0, [10, 0, 0])], [{...ownedTarget, controlled: true}], 20, 1000), null);
});

test('binding resolves renderer origins while retaining freshness and live-target checks', () => {
  const actor = player(10, [30, 0, 0], 1000, {renderPositions: [[10, 0, 0], [20, 0, 0]]});
  assert.equal(bindPlayer([10, 0, 0], [actor], 1000), actor);
  assert.equal(bindPlayer([20, 0, 0], [actor], 1000), actor);
  const closer = player(20, [50, 0, 0], 1000, {renderPositions: [[10.5, 0, 0]]});
  assert.equal(bindPlayer([10.4, 0, 0], [actor, closer], 1000), closer, 'the nearest renderer wins');
  assert.equal(bindPlayer([10, 0, 0], [{...actor, seen: 749}], 1000), null);
  assert.equal(bindPlayer([10, 0, 0], [{...actor, dead: true}], 1000), null);
  const dead = {...actor, dead: true};
  assert.equal(bindPlayer([10, 0, 0], [dead], 1000, 3, {includeDead: true}), dead, 'visual identity lookup can still identify a dead body');
  for (const point of [[10, 0], [10, 0, 0, 0], [NaN, 0, 0], new Array(3)]) {
    assert.equal(bindPlayer([10, 0, 0], [player(30, [30, 0, 0], 1000, {renderPositions: [point]})], 1000), null);
  }
});

test('target selection uses screen scale and FOV diameter and retains world coordinates', () => {
  const players = [player(10, [10, 0, 0]), player(20, [20, 0, 0])];
  const atBoundary = region(100, [10, 0, 0]);
  const outside = region(101, [20, 0, 0]);
  assert.equal(choosePlayerTarget([atBoundary], players, 0, 1000, {fov: 200})?.player, 10);
  assert.equal(choosePlayerTarget([outside], players, 0, 1000, {fov: 200}), null);
  assert.equal(choosePlayerTarget([atBoundary], players, 0, 1000, {fov: 200, scaleX: 2}), null);
  assert.equal(choosePlayerTarget([outside], players, 0, 1000, {fov: 200, fullView: true})?.player, 20);
  const horizontal = region(30, [10, 0, 0]);
  const vertical = region(0, [20, 0, 0], {y: 20});
  const result = choosePlayerTarget([horizontal, vertical], players, 0, 1000, {fov: 200, scaleY: 2});
  assert.equal(result.player, 10, 'scaled distance chooses the horizontal target');
  assert.deepEqual(result.worldPoint, horizontal.worldPoint);
  assert.equal(horizontal.player, undefined, 'selection does not mutate regions');
});

test('target selection rejects malformed world points and screen coordinates', () => {
  const players = [player(10, [10, 0, 0])];
  for (const extra of [{worldPoint: [10, 0]}, {worldPoint: [10, 0, 0, 0]}, {worldPoint: [10, NaN, 0]}, {worldPoint: new Array(3)}, {x: NaN}, {y: Infinity}, {x: Number.MAX_VALUE}]) {
    assert.equal(choosePlayerTarget([region(0, [10, 0, 0], extra)], players, 0, 1000, {fullView: true}), null);
  }
});

function leb(value) {
  const bytes = [];
  do { const byte = value & 127; value >>>= 7; bytes.push(byte | (value ? 128 : 0)); } while (value);
  return bytes;
}
function fnv(bytes) { let hash = 2166136261; for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619) >>> 0; return hash; }
function syntheticWasm() {
  const section = (id, payload) => [id, ...leb(payload.length), ...payload];
  const sum = [1, 1, 0x7f, 0x20, 0, 0x20, 1, 0x6a, 0x22, 2, 0x0b];
  const constant = [0, 0x41, 7, 0x0b];
  const code = [2, ...leb(sum.length), ...sum, ...leb(constant.length), ...constant];
  const bytes = new Uint8Array([
    0, 97, 115, 109, 1, 0, 0, 0,
    ...section(1, [3, 0x60, 4, 0x7f, 0x7f, 0x7f, 0x7f, 0, 0x60, 2, 0x7f, 0x7f, 1, 0x7f, 0x60, 0, 1, 0x7f]),
    ...section(2, [1, 1, 97, 2, 75, 105, 0, 0]),
    ...section(3, [2, 1, 2]),
    ...section(7, [2, 3, 115, 117, 109, 0, 1, 5, 111, 116, 104, 101, 114, 0, 2]),
    ...section(10, code),
  ]);
  return {bytes, profile: {byteLength: bytes.length, importCount: 1, callbackImport: 0, functions: 2, magic: 0x4e564100, hooks: [{fn: 1, size: sum.length, hash: fnv(sum), id: 4, args: [0, 1, null]}]}};
}

test('WASM hook preserves locals, function results, and unhooked functions while dispatching arguments', async () => {
  const {bytes, profile} = syntheticWasm();
  const original = bytes.slice();
  const calls = [];
  const output = patchWasm(bytes, profile);
  assert(WebAssembly.validate(bytes));
  assert(WebAssembly.validate(output));
  assert.deepEqual(bytes, original, 'patching does not mutate the input');
  const {instance} = await WebAssembly.instantiate(output, {a: {Ki: (...args) => calls.push(args)}});
  assert.equal(instance.exports.sum(12, -7), 5);
  assert.deepEqual(calls, [[12, -7, 0, profile.magic + 4]]);
  assert.equal(instance.exports.other(), 7);
  assert.equal(calls.length, 1, 'unhooked method does not dispatch');
});

test('WASM patch fails closed on changed size, method fingerprint, method count, or missing hook', () => {
  const {bytes, profile} = syntheticWasm();
  assert.throws(() => patchWasm(bytes, {...profile, byteLength: bytes.length + 1}), /Unsupported game build/);
  assert.throws(() => patchWasm(bytes, {...profile, functions: 3}), /Game methods changed/);
  assert.throws(() => patchWasm(bytes, {...profile, hooks: [{...profile.hooks[0], hash: 0}]}), /Game controller changed/);
  assert.throws(() => patchWasm(bytes, {...profile, hooks: [{...profile.hooks[0], size: 1}]}), /Game controller changed/);
  assert.throws(() => patchWasm(bytes, {...profile, hooks: [{...profile.hooks[0], fn: 99}]}), /Game controller missing/);
  const wrongMagic = bytes.slice(); wrongMagic[0] = 1;
  assert.throws(() => patchWasm(wrongMagic, profile), /Unsupported game build/);
  const brokenBoundary = bytes.slice(); brokenBoundary[9] = 127;
  assert.throws(() => patchWasm(brokenBoundary, profile), /Invalid game boundary/);
});

// All runtime memory, methods, and controller objects below are synthetic test fixtures.

test('runtime leaves unsupported fingerprints untouched and cannot enable controls', async () => {
  const fixture = runtime({expectedHash: 'unsupported'}), blob = new Blob([fixture.emptyWasm]);
  assert.equal(await fixture.api.prepareWasm(blob), blob);
  assert.equal(fixture.patchCalls, 0);
  assert.equal(fixture.api.snapshot().ready, false);
  assert.match(fixture.api.snapshot().message, /Unsupported game build/);
  assert.throws(() => fixture.api.setFlight(true), /still loading/);
  assert.throws(() => fixture.api.setSilent(true), /still loading/);
});

test('runtime refuses invalid patched WASM without claiming controls are ready', async () => {
  const fixture = runtime({validPatch: false}), blob = new Blob([fixture.emptyWasm]);
  assert.equal(await fixture.api.prepareWasm(blob), blob);
  assert.equal(fixture.patchCalls, 1);
  assert.equal(fixture.api.snapshot().ready, false);
  assert.match(fixture.api.snapshot().message, /failed validation/);
});

test('runtime requires a spawned owned controller in every session before enabling controls', async () => {
  const fixture = runtime();
  await fixture.load({observe: false});
  assert.equal(fixture.api.snapshot().ready, true);
  assert.throws(() => fixture.api.setFlight(true), /character to spawn/);
  assert.throws(() => fixture.api.setSilent(true), /character to spawn/);
  fixture.dispatch(1);
  fixture.setOffline(false);
  assert.equal(fixture.api.setFlight(true).flight,true);
  assert.equal(fixture.api.setSilent(true).silent,true);
});

const nearVector=(actual,expected)=>actual.forEach((value,index)=>assert(Math.abs(value-expected[index])<1e-5, value+' differs from '+expected[index]));
function flyTicks(fixture,count=1,elapsed=1000/60,motor=fixture.motor){for(let i=0;i<count;i++){fixture.advance(elapsed);fixture.dispatch(2,motor);}}

test('flight settings have safe defaults, bounded partial changes, and isolated snapshots', async () => {
  const fixture=runtime();
  assert.deepEqual({...fixture.api.snapshot().flightSettings},{speed:12,boost:2,acceleration:40,followPitch:false});
  const configured=fixture.api.setFlightOptions({speed:999,boost:999,acceleration:999,followPitch:true});
  assert.deepEqual({...configured.flightSettings},{speed:60,boost:4,acceleration:120,followPitch:true});
  configured.flightSettings.speed=999;
  assert.equal(fixture.api.snapshot().flightSettings.speed,60,'return values do not expose mutable engine settings');
  fixture.api.setFlightOptions({speed:-1,boost:-1,acceleration:-1});
  assert.deepEqual({...fixture.api.snapshot().flightSettings},{speed:2,boost:1,acceleration:5,followPitch:true});
  fixture.api.setFlightOptions({speed:NaN,boost:Infinity,acceleration:'40',followPitch:'false'});
  assert.deepEqual({...fixture.api.snapshot().flightSettings},{speed:2,boost:1,acceleration:5,followPitch:true});
  fixture.api.setFlightOptions(null);fixture.api.setFlightOptions();
  await fixture.load();fixture.api.setFlightOptions({speed:18});
  assert.equal(fixture.api.snapshot().flightSettings.speed,18,'options apply before and after native loading');
});

test('flight accelerates and brakes to hover while bounding delayed and repeated callbacks', async () => {
  const fixture=runtime();await fixture.load();fixture.api.setFlight(true);
  assert.equal(fixture.movement,4);assert.equal(fixture.key('keydown','Space').prevented,true);
  fixture.dispatch(2,fixture.motor);nearVector(fixture.physicsWrites.at(-1),[0,40/60,0]);
  fixture.dispatch(2,fixture.motor);nearVector(fixture.physicsWrites.at(-1),[0,40/60,0],'same timestamp cannot accumulate acceleration');
  fixture.advance(10000);fixture.dispatch(2,fixture.motor);nearVector(fixture.physicsWrites.at(-1),[0,40/60+2,0]);
  flyTicks(fixture,20);nearVector(fixture.physicsWrites.at(-1),[0,12,0]);
  fixture.key('keyup','Space');flyTicks(fixture);nearVector(fixture.physicsWrites.at(-1),[0,12-40/60,0]);
  flyTicks(fixture,20);nearVector(fixture.physicsWrites.at(-1),[0,0,0]);
  fixture.key('keydown','ControlRight');flyTicks(fixture,20);nearVector(fixture.physicsWrites.at(-1),[0,-12,0]);
  fixture.key('keydown','Space');flyTicks(fixture,20);nearVector(fixture.physicsWrites.at(-1),[0,0,0],'opposite vertical inputs brake to hover');
});

test('flight flushes held movement and native velocity immediately on lost game context', async () => {
  for(const [surface,event]of [['window','blur'],['document','visibilitychange'],['document','pointerlockchange']]){
    const fixture=runtime();await fixture.load();fixture.api.setFlight(true);fixture.key('keydown','Space');fixture.key('keydown','ShiftLeft');flyTicks(fixture,40);
    assert(fixture.physicsWrites.at(-1)[1]>0);fixture[surface+'Event'](event);
    nearVector(fixture.physicsWrites.at(-1),[0,0,0]);flyTicks(fixture,20);nearVector(fixture.physicsWrites.at(-1),[0,0,0]);
    fixture.key('keydown','KeyW');flyTicks(fixture);nearVector(fixture.physicsWrites.at(-1),[0,0,40/60],'focus recovery does not inherit boosted velocity');
  }
});

test('flight ignores non-game keys and other player motors and catches focus loss without an event', async () => {
  const fixture=runtime();await fixture.load();fixture.api.setFlight(true);
  fixture.document.hidden=true;assert.equal(fixture.key('keydown','Space').prevented,false);
  fixture.document.hidden=false;fixture.document.pointerLockElement=null;assert.equal(fixture.key('keydown','Space').prevented,false);
  fixture.document.pointerLockElement={id:'unity-canvas'};assert.equal(fixture.key('keydown','Space',{target:{closest:()=>true}}).prevented,false);
  fixture.dispatch(2,fixture.motor);nearVector(fixture.physicsWrites.at(-1),[0,0,0]);
  fixture.dispatch(2,fixture.motor+4);assert.equal(fixture.physicsWrites.length,1);
  fixture.key('keydown','KeyW');flyTicks(fixture,20);assert(fixture.physicsWrites.at(-1)[2]>0);
  fixture.document.hasFocus=()=>false;fixture.dispatch(2,fixture.motor);nearVector(fixture.physicsWrites.at(-1),[0,0,0]);
  fixture.document.hasFocus=()=>true;flyTicks(fixture,20);nearVector(fixture.physicsWrites.at(-1),[0,0,0],'lost focus clears stale held inputs');
});

test('flight uses camera yaw, normalizes all three input axes, and supports both Shift boost keys', async () => {
  const fixture=runtime();await fixture.load();fixture.setCamera([1,.5,0]);fixture.api.setFlight(true);
  fixture.key('keydown','KeyW');flyTicks(fixture,20);nearVector(fixture.physicsWrites.at(-1),[12,0,0]);
  fixture.key('keydown','KeyD');fixture.key('keydown','Space');flyTicks(fixture,40);
  const diagonal=fixture.physicsWrites.at(-1);assert(Math.abs(Math.hypot(...diagonal)-12)<1e-5);assert(diagonal[0]>0&&diagonal[1]>0&&diagonal[2]<0);
  for(const shift of ['ShiftLeft','ShiftRight']){assert.equal(fixture.key('keydown',shift).prevented,true);flyTicks(fixture,40);assert(Math.abs(Math.hypot(...fixture.physicsWrites.at(-1))-24)<1e-5);fixture.key('keyup',shift);flyTicks(fixture,40);assert(Math.abs(Math.hypot(...fixture.physicsWrites.at(-1))-12)<1e-5);}
  fixture.key('keydown','KeyS');fixture.key('keydown','ControlLeft');flyTicks(fixture,40);nearVector(fixture.physicsWrites.at(-1),[0,0,-12]);
  fixture.api.setFlightOptions({speed:20,boost:3,acceleration:120});fixture.key('keydown','ShiftLeft');flyTicks(fixture,40);nearVector(fixture.physicsWrites.at(-1),[0,0,-60]);
});

test('optional pitch flight follows camera elevation and handles vertical or malformed camera views', async () => {
  const fixture=runtime();await fixture.load();fixture.setCamera([0,.6,.8]);fixture.api.setFlight(true);fixture.key('keydown','KeyW');flyTicks(fixture,20);
  nearVector(fixture.physicsWrites.at(-1),[0,0,12]);fixture.api.setFlightOptions({followPitch:true});flyTicks(fixture,30);nearVector(fixture.physicsWrites.at(-1),[0,7.2,9.6]);
  fixture.setCamera([0,1,0]);flyTicks(fixture,40);nearVector(fixture.physicsWrites.at(-1),[0,12,0]);
  fixture.key('keydown','KeyD');flyTicks(fixture,40);assert(Math.abs(Math.hypot(...fixture.physicsWrites.at(-1))-12)<1e-5);
  fixture.setCamera([NaN,0,1]);flyTicks(fixture,40);assert(fixture.physicsWrites.at(-1).every(Number.isFinite),'invalid native camera values cannot enter motor velocity');
});

test('Disable all clears toggles, native velocity, held keys, and restores normal movement', async () => {
  const fixture=runtime();await fixture.load();fixture.api.setFlight(true);fixture.api.setSilent(true);
  fixture.key('keydown','Space');flyTicks(fixture,20);fixture.api.disableAll();
  const state=fixture.api.snapshot();assert.equal(state.flight,false);assert.equal(state.silent,false);assert.equal(fixture.window.NovaLOLVisual.state.silent,false);assert.equal(fixture.movement,2);nearVector(fixture.physicsWrites.at(-1),[0,0,0]);
  const writes=fixture.physicsWrites.length;fixture.dispatch(2,fixture.motor);assert.equal(fixture.physicsWrites.length,writes);
  fixture.api.setFlight(true);fixture.dispatch(2,fixture.motor);nearVector(fixture.physicsWrites.at(-1),[0,0,0]);
  fixture.key('keydown','KeyW');flyTicks(fixture,20);fixture.api.setFlight(false);nearVector(fixture.physicsWrites.at(-1),[0,0,0]);assert.equal(fixture.movement,2);
});

test('a mode transition retains controls until the character dies', async () => {
  const fixture = runtime(); await fixture.load(); fixture.api.setFlight(true); fixture.api.setSilent(true);
  fixture.setOffline(false); fixture.advance(101);
  const state = fixture.api.snapshot();
  assert.equal(state.offline,false);assert.equal(state.flight,true);assert.equal(state.silent,true);
  fixture.writeByte(fixture.own+1331,1);fixture.advance(101);fixture.dispatch(1);
  assert.equal(fixture.api.snapshot().flight,false);assert.equal(fixture.api.snapshot().silent,false);assert.equal(fixture.movement,2);
});

test('offline shot hooks redirect to a registered visible opponent and preserve projectile speed', async () => {
  const fixture = runtime(); await fixture.load(); fixture.dispatch(1, fixture.opponent);
  fixture.window.NovaLOLVisual.state.regions = [region(0, [20, 0, 10])];
  fixture.api.setSilent(true);
  fixture.writeVector(fixture.shotOrigin, [10, 0, 10]); fixture.writeVector(fixture.shotVelocity, [0, 0, 50]);
  fixture.dispatch(4, fixture.weapon, fixture.shotOrigin, fixture.shotVelocity);
  const velocity = fixture.vectorAt(fixture.shotVelocity), expected = directedVector([10, 0, 10], [20, 1, 10], 50);
  velocity.forEach((value, index) => assert(Math.abs(value - expected[index]) < 1e-5));
  assert(Math.abs(Math.hypot(...velocity) - 50) < 1e-5);
  assert.equal(fixture.api.snapshot().redirectedShots, 1);
  fixture.dispatch(3, fixture.weapon, fixture.shotVelocity);
  assert(Math.abs(Math.hypot(...fixture.vectorAt(fixture.shotVelocity)) - 1) < 1e-6, 'hitscan uses a unit direction');
  assert.equal(fixture.api.snapshot().redirectedShots, 2);
});

test('shot hooks preserve direction without an eligible opponent, game focus, or a living local character', async () => {
  const fixture = runtime(); await fixture.load(); fixture.dispatch(1, fixture.opponent); fixture.api.setSilent(true);
  fixture.writeVector(fixture.shotOrigin, [10, 0, 10]); fixture.writeVector(fixture.shotVelocity, [0, 0, 50]);
  for (const geometry of [[10, 0, 10], [100, 0, 10]]) {
    fixture.window.NovaLOLVisual.state.regions = [region(0, geometry)];
    fixture.dispatch(4, fixture.weapon, fixture.shotOrigin, fixture.shotVelocity);
    assert.deepEqual(fixture.vectorAt(fixture.shotVelocity), [0, 0, 50], 'own or unregistered geometry cannot authorize a shot');
  }
  fixture.window.NovaLOLVisual.state.regions = [region(0, [20, 0, 10])];
  fixture.document.hidden = true; fixture.dispatch(4, fixture.weapon, fixture.shotOrigin, fixture.shotVelocity);
  fixture.document.hidden = false; fixture.document.pointerLockElement = null; fixture.dispatch(4, fixture.weapon, fixture.shotOrigin, fixture.shotVelocity);
  fixture.document.pointerLockElement = {id: 'unity-canvas'}; fixture.writeByte(fixture.own+1331,1); fixture.advance(101); fixture.dispatch(1); fixture.dispatch(4, fixture.weapon, fixture.shotOrigin, fixture.shotVelocity);
  assert.deepEqual(fixture.vectorAt(fixture.shotVelocity), [0, 0, 50]);
  assert.equal(fixture.api.snapshot().redirectedShots, 0);
});

test('training bot callback registers inherited health and renderer identity for offline targets', async () => {
  const fixture = runtime(); await fixture.load(); fixture.dispatch(5, fixture.training);
  const actor = fixture.api.matchPlayer([30, 0, 15]);
  assert.equal(actor?.pointer, fixture.training);
  assert.equal(actor?.health, fixture.trainingHealth);
  assert.equal(actor?.source, 'training');
  assert.equal(actor?.controlled, false);
  assert.equal(actor?.dead, false);
  assert.equal(fixture.api.matchPlayer([40, 0, 15])?.pointer, fixture.training, 'logical position is retained alongside renderer identity');
  assert.equal(fixture.originalImportCalls.length, 0, 'kind 5 is consumed by the engine bridge');
  fixture.window.NovaLOLVisual.state.regions = [region(0, [30, 0, 15])];
  assert.equal(fixture.api.hasTarget(), true);
  fixture.api.setSilent(true);
  fixture.writeVector(fixture.shotOrigin, [10, 0, 10]); fixture.writeVector(fixture.shotVelocity, [0, 0, 50]);
  fixture.dispatch(4, fixture.weapon, fixture.shotOrigin, fixture.shotVelocity);
  const expected = directedVector([10, 0, 10], [30, 1, 15], 50);
  fixture.vectorAt(fixture.shotVelocity).forEach((value, axis) => assert(Math.abs(value - expected[axis]) < 1e-5));
  assert.equal(fixture.api.snapshot().redirectedShots, 1, 'registered NPC renderer identity reaches the offline shot path');
  fixture.advance(100);
  const state = fixture.api.snapshot();
  assert.equal(state.players, 1, 'NPCs do not increment the human controller count');
  assert.equal(state.targets, 1);
});

test('training bot registration rejects changed class tokens and unrelated health references', async () => {
  for (const invalidate of [
    fixture => fixture.writeWord(fixture.trainingClass + 164, 0),
    fixture => fixture.writeWord(fixture.healthBaseClass + 164, 0),
    fixture => fixture.writeWord(fixture.training + 64, fixture.opponent),
  ]) {
    const fixture = runtime(); await fixture.load(); fixture.api.setSilent(true); invalidate(fixture); fixture.dispatch(5, fixture.training);
    assert.equal(fixture.api.matchPlayer([30, 0, 15]), null);
    assert.equal(fixture.api.matchPlayer([40, 0, 15]), null);
    assert.equal(fixture.api.snapshot().silent, true, 'a rejected NPC does not stop the local controls');
  }
});

test('training bot death, expiry, and refresh keep visual identity separate from target eligibility', async () => {
  const fixture = runtime(); await fixture.load(); fixture.dispatch(5, fixture.training);
  fixture.window.NovaLOLVisual.state.regions = [region(0, [30, 0, 15])];
  assert.equal(fixture.api.hasTarget(), true);
  fixture.writeByte(fixture.trainingHealth + 153, 1); fixture.advance(41); fixture.dispatch(5, fixture.training);
  assert.equal(fixture.api.matchPlayer([30, 0, 15])?.dead, true, 'dead bodies remain identifiable for visual exclusion');
  assert.equal(fixture.api.hasTarget(), false);
  fixture.writeByte(fixture.trainingHealth + 153, 0); fixture.advance(41); fixture.dispatch(5, fixture.training);
  assert.equal(fixture.api.hasTarget(), true, 'a refreshed live bot can be selected again');
  fixture.advance(251);
  assert.equal(fixture.api.matchPlayer([30, 0, 15]), null);
  assert.equal(fixture.api.snapshot().targets, 0);
  fixture.dispatch(5, fixture.training);
  assert.equal(fixture.api.hasTarget(), true, 'fresh observation repopulates the expired registry');
  fixture.writeWord(fixture.training + 8, 0); fixture.advance(101);
  assert.equal(fixture.api.snapshot().targets, 0, 'destroyed bot components leave the registry');
  assert.equal(fixture.api.matchPlayer([30, 0, 15]), null);
});

test('training bot health death is noticed even when its update callback stops', async () => {
  const fixture = runtime(); await fixture.load(); fixture.dispatch(5, fixture.training);
  fixture.window.NovaLOLVisual.state.regions = [region(0, [30, 0, 15])];
  assert.equal(fixture.api.hasTarget(), true);
  fixture.writeByte(fixture.trainingHealth + 153, 1); fixture.advance(301);
  assert.equal(fixture.api.snapshot().targets, 0, 'status refresh reads health without another kind 5 callback');
  const corpse = fixture.api.matchPlayer([30, 0, 15]);
  assert.equal(corpse?.pointer, fixture.training);
  assert.equal(corpse?.dead, true, 'the expired live actor remains known as a dead render body');
  assert.equal(fixture.api.hasTarget(), false);
  const window = {};
  vm.runInNewContext(readFileSync(new URL('../server/buildnow-visual.js', import.meta.url), 'utf8'), {window});
  const body = {left: 440, top: 180, width: 170, height: 430, minDepth: 20};
  assert.equal(window.NovaLOLVisual.characterTargetAllowed(body, null, 1000, 800), true, 'unknown verified remote geometry would use the visual fallback');
  assert.equal(window.NovaLOLVisual.characterTargetAllowed(body, corpse, 1000, 800), false, 'retained dead identity prevents a dissolving corpse from using that fallback');
});

test('dead training body identity has a bounded retention window beyond live actor freshness', async () => {
  const fixture = runtime(); await fixture.load(); fixture.dispatch(5, fixture.training);
  fixture.writeByte(fixture.trainingHealth + 153, 1); fixture.advance(251); fixture.api.snapshot();
  assert.equal(fixture.api.matchPlayer([30, 0, 15])?.dead, true, 'dead body lookup survives the 250 ms live freshness limit');
  fixture.advance(3249); fixture.api.snapshot();
  assert.equal(fixture.api.matchPlayer([30, 0, 15])?.dead, true, 'the 3500 ms retention boundary remains available');
  fixture.advance(101); fixture.api.snapshot();
  assert.equal(fixture.api.matchPlayer([30, 0, 15]), null, 'a later status refresh clears corpses after 3500 ms');
  assert.equal(fixture.api.matchPlayer([40, 0, 15]), null, 'both logical and renderer aliases are removed');
});

test('training bot health invalidation after registration removes the previous live record', async () => {
  for (const invalidate of [
    fixture => fixture.writeWord(fixture.training + 64, fixture.opponent),
    fixture => fixture.writeWord(fixture.healthBaseClass + 164, 0),
  ]) {
    const fixture = runtime(); await fixture.load(); fixture.dispatch(5, fixture.training);
    fixture.window.NovaLOLVisual.state.regions = [region(0, [30, 0, 15])];
    assert.equal(fixture.api.hasTarget(), true);
    invalidate(fixture); fixture.advance(41); fixture.dispatch(5, fixture.training);
    assert.equal(fixture.api.matchPlayer([30, 0, 15]), null, 'a new callback cannot keep invalid health fresh');
    assert.equal(fixture.api.matchPlayer([40, 0, 15]), null);
    assert.equal(fixture.api.hasTarget(), false);
    fixture.advance(101);
    assert.equal(fixture.api.snapshot().targets, 0);
  }
});

test('player renderer aliases bind visual bodies to their logical controllers', async () => {
  const fixture = runtime(); fixture.exposeOpponentRenderer(); await fixture.load(); fixture.dispatch(1, fixture.opponent);
  assert.equal(fixture.api.matchPlayer([50, 0, 10])?.pointer, fixture.opponent);
  assert.equal(fixture.api.matchPlayer([20, 0, 10])?.pointer, fixture.opponent);
  fixture.window.NovaLOLVisual.state.regions = [region(0, [50, 0, 10])];
  assert.equal(fixture.api.hasTarget(), true);
});

test('observing another client-owned actor preserves the first local avatar and its flight controls', async () => {
  const fixture = runtime(); await fixture.load(); fixture.api.setFlight(true); fixture.api.setSilent(true);
  fixture.setOpponentOwned(true); fixture.dispatch(1, fixture.opponent);
  assert.equal(fixture.api.matchPlayer([10, 0, 10])?.controlled, true);
  const opponent = fixture.api.matchPlayer([20, 0, 10]);
  assert.equal(opponent?.mine, true);
  assert.equal(opponent?.controlled, false);
  assert.equal(fixture.api.snapshot().flight, true);
  assert.equal(fixture.api.snapshot().silent, true);
  fixture.window.NovaLOLVisual.state.regions = [region(0, [20, 0, 10])];
  assert.equal(fixture.api.hasTarget(), true);
  fixture.key('keydown', 'Space'); fixture.dispatch(2, fixture.motor);
  nearVector(fixture.physicsWrites.at(-1), [0, 40/60, 0]);
  assert.equal(fixture.physicsOwners.at(-1), fixture.own);
  fixture.dispatch(2, fixture.opponentMotor);
  assert.equal(fixture.physicsWrites.length, 1, 'the second owned motor cannot take over flight');
});

test('a new local controller can replace a destroyed or dead avatar', async () => {
  for (const retire of [fixture => fixture.writeWord(fixture.own + 8, 0), fixture => fixture.writeByte(fixture.own + 1331, 1)]) {
    const fixture = runtime(); await fixture.load(); fixture.setOpponentOwned(true); fixture.dispatch(1, fixture.opponent);
    retire(fixture); fixture.advance(61); fixture.dispatch(1, fixture.opponent);
    assert.equal(fixture.api.matchPlayer([20, 0, 10])?.controlled, true);
    fixture.api.setFlight(true);
    assert.equal(fixture.opponentMovement, 4);
    fixture.key('keydown', 'Space'); fixture.dispatch(2, fixture.opponentMotor);
    assert.equal(fixture.physicsOwners.at(-1), fixture.opponent);
    nearVector(fixture.physicsWrites.at(-1), [0, 40/60, 0]);
  }
});

test('runtime bridge forwards unrelated calls and initialization is idempotent', async () => {
  const fixture = runtime(); await fixture.load();
  const wrappedInstantiate = fixture.wasm.instantiate;
  vm.runInContext(engineRuntimeSource(), fixture.context);
  assert.equal(fixture.wasm.instantiate, wrappedInstantiate);
  assert.equal(fixture.dispatch(0, 5, 6, 7), 123);
  assert.deepEqual(fixture.originalImportCalls, [[5, 6, 7, fixture.profile.magic]]);
  new vm.Script(engineRuntimeSource());
});

test('page exit disables controls and frees the allocated fixture workspace', async () => {
  const fixture = runtime(); await fixture.load(); fixture.api.setFlight(true); fixture.api.setSilent(true);
  fixture.windowEvent('pagehide');
  assert.equal(fixture.api.snapshot().flight, false); assert.equal(fixture.api.snapshot().silent, false);
  assert.deepEqual(fixture.freed, [16000]);
});
