import test from 'node:test';
import assert from 'node:assert/strict';
import {runtime} from './buildnow-engine-fixture.mjs';

// These are synthetic native objects, not observations of a running game.
function controlsFixture(options) {
  const fixture=runtime(options), {component,writeWord:put}=fixture;
  const animation=43000,skin=43500,model=44000,camera=44500;
  const health=52000,list=58000,array=58500;
  component(animation,46000,50000,'PlayerAnimationHandler',33556733);
  component(skin,46500,50100,'PlayerSkinHandler',33556203);
  component(model,47000,50200,'Transform',33554857);
  component(camera,47000,50200,'Transform',33554857);
  component(health,48500,50500,'Health',33554586);
  put(fixture.own+1344,animation);put(animation+312,skin);put(skin+40,model);put(fixture.weapons+124,health);
  const original=[0,Math.SQRT1_2,0,Math.SQRT1_2],rotationWrites=[],rotations=[],parents=new Map();
  fixture.method(8784,(out,root)=>{assert.equal(root,model);new Float32Array(fixture.memory.buffer,out,4).set(original);});
  fixture.method(8788,(root,input)=>rotationWrites.push({root,rotation:[...new Float32Array(fixture.memory.buffer,input,4)]}));
  fixture.method(68234,(root,x,y,z)=>rotations.push({root,x,y,z}));
  fixture.method(8724,root=>parents.get(root)||0);
  const slots=[fixture.weapon,56000,56500,57000,57500];
  for(const weapon of slots){component(weapon,47500,50300,'RaycastWeapon',33556484);put(weapon+140,fixture.weapons);fixture.writeByte(weapon+157,1);}
  component(list,48000,50400,'List`1');put(list+8,array);put(list+12,slots.length);put(array+12,slots.length);
  slots.forEach((weapon,index)=>put(array+16+index*4,weapon));put(fixture.weapons+84,list);put(fixture.weapons+80,slots[0]);put(fixture.weapons+112,0);
  const switches=[],stops=[],mouse=[];
  fixture.method(31112,(weapons,index)=>{assert.equal(weapons,fixture.weapons);switches.push(index);put(weapons+112,index);put(weapons+80,new Uint32Array(fixture.memory.buffer)[(array+16+index*4)>>>2]);});
  fixture.method(31009,weapon=>stops.push(weapon));
  fixture.window.NovaLOLInput={mouse:(canvas,type,options)=>mouse.push({id:canvas.id,type,...options})};
  return {...fixture,animation,skin,model,camera,health,list,array,slots,original,rotationWrites,rotations,parents,switches,stops,mouse};
}
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-5,`${actual} differs from ${expected}`);
const tick=(fixture,elapsed=16)=>{fixture.advance(elapsed);fixture.dispatch(1);};

test('new native controls require a loaded, living, owned avatar in every mode',async()=>{
  const fixture=controlsFixture();
  for(const enable of [()=>fixture.api.setBodySpin(true),()=>fixture.api.setWeaponCycle(true)])assert.throws(enable,/still loading/);
  await fixture.load({observe:false});
  for(const enable of [()=>fixture.api.setBodySpin(true),()=>fixture.api.setWeaponCycle(true)])assert.throws(enable,/living character to spawn/);
  fixture.dispatch(1);fixture.setOffline(false);
  assert.equal(fixture.api.snapshot().controlsAllowed,true);
  fixture.setOffline(true);fixture.writeByte(fixture.own+1331,1);
  for(const enable of [()=>fixture.api.setBodySpin(true),()=>fixture.api.setWeaponCycle(true)])assert.throws(enable,/living character to spawn/);
  fixture.writeByte(fixture.own+1331,0);fixture.writeWord(fixture.weapons+128,fixture.opponent);
  for(const enable of [()=>fixture.api.setBodySpin(true),()=>fixture.api.setWeaponCycle(true)])assert.throws(enable,/controller is unavailable/);
  assert.equal(fixture.rotations.length,0);assert.equal(fixture.mouse.length,0);assert.equal(fixture.switches.length,0);
});

test('character spin rotates only the skin, bounds elapsed yaw, and restores its original quaternion',async()=>{
  const fixture=controlsFixture();await fixture.load();fixture.writeWord(fixture.own+192,fixture.camera);
  fixture.api.setBodySpin(true);fixture.dispatch(1);
  assert.equal(fixture.rotations.length,1);assert.equal(fixture.rotations[0].root,fixture.model);near(fixture.rotations[0].y,6);assert.equal(fixture.rotations[0].x,0);assert.equal(fixture.rotations[0].z,0);
  fixture.dispatch(1);assert.equal(fixture.rotations.length,1,'repeated callbacks cannot accumulate rotation without elapsed time');
  tick(fixture,10000);near(fixture.rotations.at(-1).y,18,'a long stall rotates at most 50 ms');
  assert(fixture.rotations.every(rotation=>rotation.root!==fixture.camera),'the camera remains independent');
  fixture.api.setBodySpin(false);assert.equal(fixture.rotationWrites.length,1);assert.equal(fixture.rotationWrites[0].root,fixture.model);
  fixture.rotationWrites[0].rotation.forEach((value,index)=>near(value,fixture.original[index]));
  const rotations=fixture.rotations.length;tick(fixture);assert.equal(fixture.rotations.length,rotations);
});

test('spin speed clamps live changes without accepting nonfinite values',async()=>{
  const fixture=controlsFixture();await fixture.load();assert.equal(fixture.api.snapshot().spinSpeed,360);
  assert.equal(fixture.api.setSpinSpeed(99999).spinSpeed,1440);fixture.api.setBodySpin(true);fixture.dispatch(1);near(fixture.rotations.at(-1).y,24);
  assert.equal(fixture.api.setSpinSpeed(-10).spinSpeed,30);tick(fixture,100);near(fixture.rotations.at(-1).y,1.5);
  for(const speed of [NaN,Infinity,'500'])assert.equal(fixture.api.setSpinSpeed(speed).spinSpeed,30);
});

test('spin rejects controller roots, camera ancestors, invalid classes, and cyclic ancestry',async()=>{
  for(const invalidate of [
    fixture=>fixture.writeWord(fixture.skin+40,9000),
    fixture=>{fixture.writeWord(fixture.own+192,fixture.model);},
    fixture=>{fixture.writeWord(fixture.own+192,fixture.camera);fixture.parents.set(fixture.camera,fixture.model);},
    fixture=>{fixture.writeWord(fixture.own+192,fixture.camera);fixture.parents.set(fixture.camera,fixture.camera);},
    fixture=>fixture.writeWord(46000+164,0),
    fixture=>fixture.writeWord(46500+164,0),
    fixture=>fixture.writeWord(47000+164,0),
    fixture=>{fixture.writeWord(fixture.own+192,45000);fixture.writeWord(45000+8,1);},
  ]){
    const fixture=controlsFixture();await fixture.load();fixture.component(9000,47000,50200,'Transform',33554857);invalidate(fixture);
    assert.throws(()=>fixture.api.setBodySpin(true),/model is unavailable/);assert.equal(fixture.api.snapshot().bodySpin,false);assert.equal(fixture.rotations.length,0);assert.equal(fixture.rotationWrites.length,0);
  }
});

test('spin rejects invalid rotation data and stops if the model changes',async()=>{
  for(const rotation of [[0,0,0,0],[0,0,NaN,1]]){
    const fixture=controlsFixture();await fixture.load();fixture.method(8784,out=>new Float32Array(fixture.memory.buffer,out,4).set(rotation));
    assert.throws(()=>fixture.api.setBodySpin(true),/rotation is unavailable/);assert.equal(fixture.api.snapshot().bodySpin,false);
  }
  const fixture=controlsFixture();await fixture.load();fixture.api.setBodySpin(true);fixture.dispatch(1);
  fixture.component(45000,47000,50200,'Transform',33554857);fixture.writeWord(fixture.skin+40,45000);tick(fixture);
  assert.equal(fixture.api.snapshot().bodySpin,false);assert.equal(fixture.rotationWrites.at(-1).root,fixture.model,'restoration uses the original model');
  assert.equal(fixture.rotations.length,1,'a replacement skin is never rotated using stale state');
});

test('spin pauses on focus loss and resumes with a bounded first tick',async()=>{
  const fixture=controlsFixture();await fixture.load();fixture.api.setBodySpin(true);fixture.dispatch(1);
  fixture.document.hidden=true;fixture.documentEvent('visibilitychange');tick(fixture,1000);assert.equal(fixture.rotations.length,1);
  fixture.document.hidden=false;fixture.document.hasFocus=()=>false;tick(fixture,1000);assert.equal(fixture.rotations.length,1);
  fixture.document.hasFocus=()=>true;tick(fixture,1000);near(fixture.rotations.at(-1).y,6);
});

test('death and controller replacement clean up spin and held weapon input',async()=>{
  for(const retire of ['death','replacement']){
    const fixture=controlsFixture();await fixture.load();fixture.api.setBodySpin(true);fixture.api.setWeaponCycleOptions({fire:true});fixture.api.setWeaponCycle(true);fixture.dispatch(1);
    assert.equal(fixture.mouse.at(-1).type,'mousedown');
    if(retire==='offline'){fixture.setOffline(false);tick(fixture,101);}
    else if(retire==='death'){fixture.writeByte(fixture.own+1331,1);tick(fixture,61);}
    else{fixture.setOpponentOwned(true);fixture.writeByte(fixture.own+1331,1);fixture.advance(61);fixture.dispatch(1,fixture.opponent);}
    const state=fixture.api.snapshot();assert.equal(state.bodySpin,false);assert.equal(state.weaponCycle,false);assert.equal(fixture.mouse.at(-1).type,'mouseup');assert.equal(fixture.stops.at(-1),fixture.weapon);assert.equal(fixture.rotationWrites.at(-1).root,fixture.model);
  }
});

test('weapon cycle respects live option clamps and returns independent snapshots',async()=>{
  const fixture=controlsFixture();assert.deepEqual({...fixture.api.snapshot().weaponCycleSettings},{intervalMs:300,fire:false});
  const snapshot=fixture.api.setWeaponCycleOptions({intervalMs:1,fire:true});assert.deepEqual({...snapshot.weaponCycleSettings},{intervalMs:120,fire:true});snapshot.weaponCycleSettings.intervalMs=1;snapshot.weaponCycleSettings.fire=false;
  assert.deepEqual({...fixture.api.snapshot().weaponCycleSettings},{intervalMs:120,fire:true});
  assert.equal(fixture.api.setWeaponCycleOptions({intervalMs:999999}).weaponCycleSettings.intervalMs,1500);
  for(const intervalMs of [NaN,Infinity,'100'])assert.equal(fixture.api.setWeaponCycleOptions({intervalMs,fire:'false'}).weaponCycleSettings.intervalMs,1500);
  assert.equal(fixture.api.snapshot().weaponCycleSettings.fire,true);fixture.api.setWeaponCycleOptions(null);fixture.api.setWeaponCycleOptions();
});

test('weapon cycling switches only verified owned loadout slots at the configured interval',async()=>{
  const fixture=controlsFixture();await fixture.load();fixture.writeWord(fixture.slots[1]+140,0);fixture.writeWord(fixture.slots[2]+140,22000);fixture.writeWord(fixture.slots[3],0);
  fixture.api.setWeaponCycle(true);fixture.dispatch(1);assert.deepEqual(fixture.switches,[]);
  tick(fixture,299);assert.deepEqual(fixture.switches,[]);tick(fixture,1);assert.deepEqual(fixture.switches,[4]);tick(fixture,300);assert.deepEqual(fixture.switches,[4,0]);
  assert.equal(fixture.api.snapshot().weaponCycle,true);assert.equal(fixture.mouse.length,0,'cycling alone never fires');
  fixture.dispatch(1,fixture.opponent);assert.deepEqual(fixture.switches,[4,0],'other player callbacks cannot cycle the local loadout');
});

test('weapon cycle rejects empty and corrupt lists without inventing guns',async()=>{
  for(const corrupt of [
    fixture=>fixture.writeWord(fixture.weapons+84,fixture.weapon),
    fixture=>fixture.writeWord(fixture.list+12,33),
    fixture=>fixture.writeWord(fixture.array+12,1),
    fixture=>fixture.slots.forEach(weapon=>fixture.writeWord(weapon+140,0)),
  ]){
    const fixture=controlsFixture();await fixture.load();corrupt(fixture);assert.throws(()=>fixture.api.setWeaponCycle(true),/guns in your loadout/);assert.equal(fixture.api.snapshot().weaponCycle,false);assert.deepEqual(fixture.switches,[]);
  }
  const fixture=controlsFixture();await fixture.load();fixture.writeWord(fixture.weapons+80,0);fixture.api.setWeaponCycle(true);fixture.dispatch(1);assert.deepEqual(fixture.switches,[0]);
  fixture.slots.forEach(weapon=>fixture.writeWord(weapon+140,0));tick(fixture);assert.equal(fixture.api.snapshot().weaponCycle,false);assert.match(fixture.api.snapshot().message,/no guns/);
});

test('an owned inactive gun can equip before Start initializes its local fire flag',async()=>{
  const fixture=controlsFixture();await fixture.load();fixture.slots.forEach(weapon=>fixture.writeByte(weapon+157,0));fixture.writeWord(fixture.weapons+80,0);
  fixture.api.setWeaponCycleOptions({fire:true});fixture.api.setWeaponCycle(true);fixture.dispatch(1);assert.deepEqual(fixture.switches,[0],'owned list and initialized weapons owner authorize equipping the cold gun');assert.equal(fixture.mouse.length,0);
  tick(fixture,10000);tick(fixture,10000);assert.deepEqual(fixture.switches,[0],'the pending gun remains equipped while its Start method has not run');assert.equal(fixture.mouse.length,0);assert.equal(fixture.window.NovaLOLVisual.state.weaponCycleFire,false);
  assert.equal(new Uint32Array(fixture.memory.buffer)[(fixture.weapon+140)>>>2],fixture.weapons,'switching does not manufacture ownership');fixture.writeByte(fixture.weapon+157,1);tick(fixture);assert.equal(fixture.mouse.at(-1).type,'mousedown','fire waits for the verified local flag');assert.equal(fixture.api.snapshot().weaponCycle,true);
  fixture.api.setWeaponCycle(false);assert.equal(fixture.mouse.at(-1).type,'mouseup');assert.equal(fixture.stops.at(-1),fixture.weapon);
});

test('switching from a firing gun to a cold gun releases held fire until activation',async()=>{
  const fixture=controlsFixture();await fixture.load();fixture.writeWord(fixture.list+12,2);fixture.writeWord(fixture.array+12,2);fixture.writeByte(fixture.slots[1]+157,0);
  fixture.api.setWeaponCycleOptions({fire:true});fixture.api.setWeaponCycle(true);fixture.dispatch(1);assert.equal(fixture.mouse.at(-1).type,'mousedown');
  tick(fixture,300);assert.deepEqual(fixture.switches,[1]);assert.equal(fixture.mouse.at(-1).type,'mouseup','a newly equipped inactive gun cannot inherit held fire');assert.equal(fixture.window.NovaLOLVisual.state.weaponCycleFire,false);
  tick(fixture,10000);assert.equal(fixture.mouse.at(-1).type,'mouseup');assert.deepEqual(fixture.switches,[1]);fixture.writeByte(fixture.slots[1]+157,1);tick(fixture);assert.equal(fixture.mouse.at(-1).type,'mousedown');
});

test('inactive guns without an initialized weapons owner cannot be equipped or assigned ownership',async()=>{
  const fixture=controlsFixture();await fixture.load();for(const weapon of fixture.slots){fixture.writeWord(weapon+140,0);fixture.writeByte(weapon+157,0);}fixture.writeWord(fixture.weapons+80,0);
  assert.throws(()=>fixture.api.setWeaponCycle(true),/guns in your loadout/);assert.equal(fixture.api.snapshot().weaponCycle,false);assert.deepEqual(fixture.switches,[]);assert.equal(fixture.mouse.length,0);
  const words=new Uint32Array(fixture.memory.buffer);assert(fixture.slots.every(weapon=>words[(weapon+140)>>>2]===0),'the controls never invent an owner for an uninitialized weapon');
});

test('mixed loadouts exclude shields, tools, explicit tool pointers, and reserved switch slots',async()=>{
  const fixture=controlsFixture();await fixture.load();
  const tools=[{pointer:60000,klass:60200,name:51000,type:'MiniShield',token:33556464},{pointer:61000,klass:61200,name:51100,type:'BuildHands',token:33556475},{pointer:62000,klass:62200,name:51200,type:'Pickaxe',token:33556477}];
  for(const tool of tools){fixture.component(tool.pointer,tool.klass,tool.name,tool.type,tool.token);fixture.writeWord(tool.klass+44,47500);fixture.writeWord(tool.pointer+140,fixture.weapons);fixture.writeByte(tool.pointer+157,1);}
  fixture.component(63000,47500,50300,'RaycastWeapon',33556484);fixture.writeWord(63000+140,fixture.weapons);fixture.writeByte(63000+157,1);
  const entries=[fixture.weapon,...tools.map(tool=>tool.pointer),fixture.slots[1],fixture.slots[2],fixture.slots[4],fixture.slots[3],63000];
  fixture.writeWord(fixture.weapons+64,fixture.slots[1]);fixture.writeWord(fixture.weapons+76,fixture.slots[2]);fixture.writeWord(fixture.list+12,entries.length);fixture.writeWord(fixture.array+12,entries.length);entries.forEach((weapon,index)=>fixture.writeWord(fixture.array+16+index*4,weapon));
  fixture.api.setWeaponCycleOptions({fire:true});fixture.api.setWeaponCycle(true);fixture.dispatch(1);tick(fixture,300);tick(fixture,300);assert.deepEqual(fixture.switches,[6,0],'consumables and reserved slots never enter the cycle');
  fixture.api.setWeaponCycle(false);assert.equal(fixture.stops.at(-1),fixture.weapon);assert(fixture.stops.every(weapon=>!tools.some(tool=>tool.pointer===weapon)),'native StopFire stays on the equipped gun');
  fixture.writeWord(fixture.array+16,tools[0].pointer);fixture.writeWord(fixture.array+16+6*4,tools[1].pointer);assert.throws(()=>fixture.api.setWeaponCycle(true),/guns in your loadout/,'tools cannot authorize a cycle even though they inherit RaycastWeapon');
});

test('weapon cycling and firing pause behind equip, building, editing, death, and emote gates',async()=>{
  for(const gate of [fixture=>fixture.weapons+132,fixture=>fixture.weapons+140,fixture=>fixture.weapons+141,fixture=>fixture.health+153,fixture=>fixture.animation+92]){
    const fixture=controlsFixture();await fixture.load();fixture.api.setWeaponCycleOptions({fire:true});fixture.api.setWeaponCycle(true);fixture.dispatch(1);assert.equal(fixture.mouse.at(-1).type,'mousedown');
    const pointer=gate(fixture);fixture.writeByte(pointer,1);tick(fixture,1000);assert.equal(fixture.mouse.at(-1).type,'mouseup');assert.deepEqual(fixture.switches,[]);assert.equal(fixture.api.snapshot().weaponCycle,true,'temporary gate preserves the toggle');
    const events=fixture.mouse.length;tick(fixture,1000);assert.equal(fixture.mouse.length,events,'gated input stays released');fixture.writeByte(pointer,0);tick(fixture);assert.equal(fixture.mouse.at(-1).type,'mousedown');assert.deepEqual(fixture.switches,[],'gate recovery restarts the interval instead of switching immediately');
  }
});

test('weapon spam uses a normal press/release pair and clears fire on focus loss, options, and disable',async()=>{
  for(const pause of [fixture=>fixture.windowEvent('blur'),fixture=>fixture.documentEvent('visibilitychange'),fixture=>fixture.documentEvent('pointerlockchange')]){
    const fixture=controlsFixture();await fixture.load();fixture.api.setWeaponCycleOptions({fire:true});fixture.api.setWeaponCycle(true);fixture.dispatch(1);tick(fixture,40);
    assert.deepEqual(fixture.mouse,[{id:'unity-canvas',type:'mousedown',button:0,buttons:1}]);assert.equal(fixture.window.NovaLOLVisual.state.weaponCycleFire,true);
    pause(fixture);assert.deepEqual(fixture.mouse.at(-1),{id:'unity-canvas',type:'mouseup',button:0,buttons:0});assert.deepEqual(fixture.stops,[fixture.weapon]);assert.equal(fixture.window.NovaLOLVisual.state.weaponCycleFire,false);
    fixture.document.pointerLockElement=null;tick(fixture,1000);assert.equal(fixture.mouse.length,2);fixture.document.pointerLockElement={id:'unity-canvas'};tick(fixture);assert.equal(fixture.mouse.at(-1).type,'mousedown');
    fixture.api.setWeaponCycleOptions({fire:false});assert.equal(fixture.mouse.at(-1).type,'mouseup');const count=fixture.mouse.length;fixture.api.setWeaponCycle(false);tick(fixture,1000);assert.equal(fixture.mouse.length,count);
  }
  const fixture=controlsFixture();await fixture.load();fixture.api.setWeaponCycleOptions({fire:true});fixture.api.setWeaponCycle(true);fixture.dispatch(1);fixture.api.disableAll();assert.equal(fixture.mouse.at(-1).type,'mouseup');assert.equal(fixture.api.snapshot().weaponCycle,false);
});

function statsFixture(){
  const fixture=controlsFixture(),ownOwner=52500,ownString=53000,opponentHealth=54000,opponentOwner=54500,opponentString=55000;
  fixture.component(opponentHealth,48500,50500,'Health',33554586);
  for(const pointer of [ownOwner,opponentOwner])fixture.component(pointer,49000,50600,'Player',33554493);
  for(const pointer of [ownString,opponentString])fixture.component(pointer,49500,50700,'String');
  const names=new Map([[fixture.photon,ownOwner],[24000,opponentOwner]]),strings=new Map([[ownOwner,ownString],[opponentOwner,opponentString]]),values=new Map([[fixture.health,{health:73.5,shield:40}],[opponentHealth,{health:87,shield:18}],[fixture.trainingHealth,{health:42,shield:0}]]);
  fixture.writeWord(fixture.own+1336,fixture.health);fixture.writeWord(fixture.opponent+1336,opponentHealth);
  fixture.method(41766,pointer=>names.get(pointer)||0);fixture.method(41323,pointer=>strings.get(pointer)||0);
  fixture.method(20406,pointer=>values.get(pointer)?.health);fixture.method(20407,pointer=>values.get(pointer)?.shield);
  const setName=(pointer,value)=>{fixture.writeWord(pointer+8,value.length);new Uint16Array(fixture.memory.buffer,pointer+12,value.length).set([...value].flatMap(character=>character.length===2?[character.charCodeAt(0),character.charCodeAt(1)]:[character.charCodeAt(0)]));};
  setName(ownString,'  Nova 😸\u0000  ');setName(opponentString,'<b>Δ Player</b>');
  return {...fixture,ownOwner,ownString,opponentHealth,opponentOwner,opponentString,names,strings,values,setName};
}

test('native player stats read actual health and shield values and retain Unicode names as plain text',async()=>{
  const fixture=statsFixture();await fixture.load();fixture.dispatch(1,fixture.opponent);fixture.dispatch(5,fixture.training);
  const snapshot=fixture.api.snapshot();assert.deepEqual({...snapshot.ownStats},{name:'Nova 😸',health:73.5,shield:40});assert.notEqual(snapshot.ownStats.health,fixture.health,'component pointers are not shown as health');
  const opponent=fixture.api.matchPlayer([20,0,10]);assert.deepEqual({...opponent.stats},{name:'<b>Δ Player</b>',health:87,shield:18});assert.equal(typeof opponent.stats.name,'string','markup stays data for the UI text renderer');
  const bot=fixture.api.matchPlayer([30,0,15]);assert.deepEqual({...bot.stats},{name:'Training bot',health:42,shield:0});assert.equal(snapshot.playerStats.length,2);
  snapshot.ownStats.health=999;snapshot.playerStats[0].name='changed';snapshot.playerStats.push({name:'invented'});const next=fixture.api.snapshot();assert.equal(next.ownStats.health,73.5);assert.equal(next.playerStats.length,2);assert(next.playerStats.every(player=>player.name!=='changed'));
});

test('native stats reject invalid Health and Player objects, nonfinite values, and invalid names',async()=>{
  for(const invalidate of [
    fixture=>fixture.writeWord(fixture.own+1336,fixture.weapon),
    fixture=>fixture.values.set(fixture.health,{health:NaN,shield:Infinity}),
    fixture=>fixture.values.set(fixture.health,{health:-1,shield:1000001}),
  ]){const fixture=statsFixture();await fixture.load();invalidate(fixture);const stats=fixture.api.snapshot().ownStats;assert.equal(stats.health,null);assert.equal(stats.shield,null);}
  for(const invalidate of [
    fixture=>fixture.writeWord(49000+164,0),
    fixture=>fixture.names.set(fixture.photon,fixture.weapon),
    fixture=>fixture.strings.set(fixture.ownOwner,fixture.weapon),
    fixture=>fixture.writeWord(fixture.ownString+8,97),
    fixture=>fixture.setName(fixture.ownString,'\u0000\n\t'),
    fixture=>fixture.strings.set(fixture.ownOwner,65528),
  ]){const fixture=statsFixture();await fixture.load();invalidate(fixture);assert.equal(fixture.api.snapshot().ownStats.name,null);}
});

test('stats refresh after their cache window and disappear with stale or dead targets',async()=>{
  const fixture=statsFixture();await fixture.load();fixture.dispatch(1,fixture.opponent);assert.equal(fixture.api.matchPlayer([20,0,10]).stats.health,87);
  fixture.values.set(fixture.opponentHealth,{health:50,shield:10});fixture.advance(99);assert.equal(fixture.api.matchPlayer([20,0,10]).stats.health,87);fixture.advance(1);assert.equal(fixture.api.matchPlayer([20,0,10]).stats.health,50);
  fixture.writeWord(fixture.opponent+1336,fixture.weapon);fixture.advance(100);assert.equal(fixture.api.matchPlayer([20,0,10]).stats.health,null,'a cached valid component cannot survive invalidation past the cache window');
  fixture.writeByte(fixture.opponent+1331,1);fixture.advance(61);fixture.dispatch(1,fixture.opponent);assert(fixture.api.snapshot().playerStats.every(player=>player.name!=='<b>Δ Player</b>'),'dead opponents are absent from the live list');
  fixture.advance(1501);const snapshot=fixture.api.snapshot();assert.equal(snapshot.ownStats,null);assert.equal(snapshot.playerStats.length,0);assert.equal(fixture.api.matchPlayer([20,0,10]).dead,true,'retained corpse identity remains excluded from the live stats list');
  fixture.advance(3501);fixture.api.snapshot();assert.equal(fixture.api.matchPlayer([20,0,10]),null,'corpse stats disappear after the bounded identity retention window');
  const live=statsFixture();await live.load();live.dispatch(1,live.opponent);live.advance(251);assert.equal(live.api.matchPlayer([20,0,10]),null,'a stale live actor cannot remain bindable');assert.equal(live.api.snapshot().playerStats.length,0);
});


test('localhost modes permit owned flight, character spin and normal weapon cycling without pretending to be offline',async()=>{
 for(const hostname of ['localhost','127.0.0.1','[::1]']){
  const fixture=controlsFixture({hostname,offline:false});await fixture.load();
  let state=fixture.api.snapshot();assert.equal(state.offline,false);assert.equal(state.localTesting,true);assert.equal(state.controlsAllowed,true);
  fixture.api.setFlight(true);fixture.key('keydown','KeyW');fixture.advance(16);fixture.dispatch(2,fixture.motor);
  assert(fixture.physicsWrites.at(-1)[2]>0);assert(fixture.physicsOwners.every(owner=>owner===fixture.own));
  fixture.api.setBodySpin(true);fixture.api.setWeaponCycleOptions({fire:true});fixture.api.setWeaponCycle(true);fixture.dispatch(1);
  assert.equal(fixture.rotations.at(-1).root,fixture.model);assert.equal(fixture.mouse.at(-1).type,'mousedown');
  tick(fixture,300);assert.deepEqual(fixture.switches,[1]);state=fixture.api.snapshot();assert.equal(state.flight,true);assert.equal(state.bodySpin,true);assert.equal(state.weaponCycle,true);
  fixture.api.disableAll();assert.equal(fixture.api.snapshot().flight,false);assert.equal(fixture.api.snapshot().bodySpin,false);assert.equal(fixture.api.snapshot().weaponCycle,false);assert.equal(fixture.movement,2);
 }
});

test('deployed origins allow verified owned controls in online modes',async()=>{
 for(const hostname of ['nova.example','localhost.example','127.0.0.1.example','0.0.0.0','']){
  const fixture=controlsFixture({hostname,offline:false});await fixture.load();assert.equal(fixture.api.snapshot().controlsAllowed,true);assert.equal(fixture.api.snapshot().localTesting,false);
  fixture.api.setFlight(true);fixture.api.setBodySpin(true);fixture.api.setWeaponCycle(true);
  assert.equal(fixture.api.snapshot().flight,true);assert.equal(fixture.api.snapshot().bodySpin,true);assert.equal(fixture.api.snapshot().weaponCycle,true);
  fixture.writeByte(fixture.own+1331,1);tick(fixture,101);assert.equal(fixture.api.snapshot().flight,false);
 }
});

test('local match testing permits shot redirection but cannot add the training gun catalogue',async()=>{
 const fixture=controlsFixture({hostname:'localhost',offline:false});await fixture.load();
 assert.equal(fixture.api.setSilent(true).silent,true);assert.throws(()=>fixture.api.equipTrainingGuns(),/offline Aim Training/);
 assert.equal(fixture.api.snapshot().silent,true);assert.equal(fixture.calls.some(call=>call.pointer===20231),false);
});

test('local mode controls preserve focus, death and ownership cleanup',async()=>{
 for(const retire of ['death','ownership']){
  const fixture=controlsFixture({hostname:'localhost',offline:false});await fixture.load();fixture.api.setFlight(true);fixture.api.setBodySpin(true);fixture.api.setWeaponCycleOptions({fire:true});fixture.api.setWeaponCycle(true);fixture.dispatch(1);
  fixture.document.hasFocus=()=>false;fixture.windowEvent('blur');tick(fixture);assert.equal(fixture.mouse.at(-1).type,'mouseup');assert.equal(fixture.api.snapshot().flight,true);assert.equal(fixture.api.snapshot().bodySpin,true);
  fixture.document.hasFocus=()=>true;tick(fixture);assert.equal(fixture.mouse.at(-1).type,'mousedown');
  if(retire==='death')fixture.writeByte(fixture.own+1331,1);else fixture.setOwnOwned(false);
  fixture.advance(101);fixture.dispatch(2,fixture.motor);const state=fixture.api.snapshot();assert.equal(state.flight,false);assert.equal(state.bodySpin,false);assert.equal(state.weaponCycle,false);assert.equal(fixture.mouse.at(-1).type,'mouseup');
 }
});
