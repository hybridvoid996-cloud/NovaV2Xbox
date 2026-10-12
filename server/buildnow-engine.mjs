// ABI and method bodies are tied to the immutable Unity build used by 581-f.
const PROFILE={sha256:'a35368963cd340fe951f966b6eecef5b6ee55cb7e223701b5b841edc0f20ecc7',byteLength:57704302,importCount:597,callbackImport:521,functions:148836,magic:0x4e564100,hooks:[{fn:42513,size:339,hash:2515652699,id:4,args:[0,1,2]},{fn:87028,size:279,hash:3123008107,id:1,args:[0,1,null]},{fn:89418,size:1922,hash:595940035,id:3,args:[0,1,2]},{fn:90736,size:807,hash:1675280055,id:2,args:[0,1,null],at:301,before:[17,1,0],after:[32,0]},{fn:87639,size:129,hash:3954065509,id:5,args:[0,1,null]}]};

export function patchWasm(input,profile=PROFILE){
 const bytes=new Uint8Array(input);if(bytes.length!==profile.byteLength||bytes[0]!==0||bytes[1]!==97||bytes[2]!==115||bytes[3]!==109||bytes[4]!==1)throw Error('Unsupported game build.');
 const leb=n=>{const out=[];do{let b=n&127;n>>>=7;out.push(b|(n?128:0));}while(n);return out;};
 const signed=n=>{const out=[];for(;;){let b=n&127;n>>=7;const end=(n===0&&!(b&64))||(n===-1&&(b&64));out.push(b|(end?0:128));if(end)return out;}};
 let at=8;const read=()=>{let n=0,s=0;for(;;){if(at>=bytes.length||s>28)throw Error('Invalid game section.');const b=bytes[at++];n|=(b&127)<<s;if(!(b&128))return n>>>0;s+=7;}};
 const desired=new Map(profile.hooks.map(h=>[h.fn,h])),parts=[bytes.subarray(0,8)];let matched=0;
 while(at<bytes.length){const start=at,id=bytes[at++],size=read(),end=at+size;if(end>bytes.length)throw Error('Invalid game boundary.');if(id!==10){parts.push(bytes.subarray(start,end));at=end;continue;}
  const count=read();if(count!==profile.functions)throw Error('Game methods changed.');const bodies=[new Uint8Array(leb(count))];let payload=bodies[0].length;
  for(let i=0;i<count;i++){const length=read(),begin=at,finish=at+length,h=desired.get(i+profile.importCount);if(finish>end)throw Error('Invalid method boundary.');let additions=[];
   if(h){let hash=2166136261;for(let j=begin;j<finish;j++)hash=Math.imul(hash^bytes[j],16777619)>>>0;if(length!==h.size||hash!==h.hash)throw Error('Game controller changed.');const locals=read();for(let j=0;j<locals;j++){read();at++;}if(at>=finish)throw Error('Invalid game locals.');let split=at;if(h.at!==undefined){split=begin+h.at;if(!Number.isInteger(h.at)||split<at||split>=finish||h.before?.some((byte,index)=>bytes[split-h.before.length+index]!==byte)||h.after?.some((byte,index)=>bytes[split+index]!==byte))throw Error('Game movement boundary changed.');}const prefix=[];for(const arg of h.args)prefix.push(...(arg===null?[65,0]:[32,...leb(arg)]));prefix.push(65,...signed(profile.magic+h.id),16,...leb(profile.callbackImport));additions=[bytes.subarray(begin,split),new Uint8Array(prefix),bytes.subarray(split,finish)];matched++;}
   else additions=[bytes.subarray(begin,finish)];const nextSize=additions.reduce((n,p)=>n+p.length,0),header=new Uint8Array(leb(nextSize));bodies.push(header);payload+=header.length;for(const part of additions){bodies.push(part);payload+=part.length;}at=finish;
  }
  if(at!==end)throw Error('Game code boundary changed.');parts.push(new Uint8Array([id,...leb(payload)]));for(const part of bodies)parts.push(part);
 }
 if(matched!==profile.hooks.length)throw Error('Game controller missing.');const output=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const part of parts){output.set(part,offset);offset+=part.length;}return output;
}

export function directedVector(origin,target,speed=1){
 if(origin?.length!==3||target?.length!==3||!Array.from(origin).every(Number.isFinite)||!Array.from(target).every(Number.isFinite)||!Number.isFinite(speed)||speed<=0)return null;
 const delta=Array.from(target,(n,i)=>n-origin[i]),length=Math.hypot(...delta);return Number.isFinite(length)&&length>.001?delta.map(n=>n/length*speed):null;
}

export function bindPlayer(origin,players,now,tolerance=3,{includeDead=false}={}){
 if(origin?.length!==3||!Array.from(origin).every(Number.isFinite)||!Number.isFinite(now))return null;let selected=null,best=tolerance;
 for(const player of players){if(!includeDead&&player.dead||!Number.isFinite(player.seen)||now-player.seen<0||now-player.seen>250||player.position?.length!==3||!Array.from(player.position).every(Number.isFinite))continue;for(const point of [player.position,...(player.renderPositions||[])]){if(point?.length!==3||!Array.from(point).every(Number.isFinite))continue;const distance=Math.hypot(...point.map((n,i)=>n-origin[i]));if(distance<best){best=distance;selected=player;}}}
 return selected;
}

export function choosePlayerTarget(regions,players,own,now,options={},binder=bindPlayer){
 let target=null,best=Infinity;const radius=options.fullView?Infinity:(Number(options.fov)||512)/2,sx=options.scaleX||1,sy=options.scaleY||1;
 for(const region of regions){const player=binder(region.worldOrigin,players,now);if(!player||player.pointer===own||player.controlled||region.worldPoint?.length!==3||!Array.from(region.worldPoint).every(Number.isFinite)||!Number.isFinite(region.x)||!Number.isFinite(region.y))continue;const distance=(region.x*sx)**2+(region.y*sy)**2;if(!Number.isFinite(distance)||distance>radius*radius||distance>=best)continue;best=distance;target={...region,player:player.pointer};}
 return target;
}

export function walkingSpeedModule(){
 const section=(id,bytes)=>[id,bytes.length,...bytes];
 return new Uint8Array([0,97,115,109,1,0,0,0,...section(1,[2,96,2,127,127,1,125,96,1,127,1,125]),...section(2,[2,1,109,4,98,97,115,101,0,0,1,109,5,115,99,97,108,101,0,1]),...section(3,[1,0]),...section(7,[1,3,114,117,110,0,2]),...section(10,[1,13,0,32,0,32,1,16,0,32,0,16,1,148,11])]);
}

export function installEngine(profile,patch,direction,bind,targetSelector,speedModule=null){
 if(window.NovaBuildNowEngine)return;
 const localTesting=['localhost','127.0.0.1','[::1]'].includes(window.location?.hostname||'');
 const state={ready:false,offline:false,localTesting,controlsAllowed:false,hasPlayer:false,playerGeneration:0,walkSpeed:false,walkMultiplier:1,walkSpeedReady:false,silentTargetMode:'visible',flight:false,flightSettings:{speed:12,boost:2,acceleration:40,followPitch:false},silent:false,bodySpin:false,spinSpeed:360,weaponCycle:false,weaponCycleSettings:{intervalMs:300,fire:false},players:0,targets:0,shotEvents:0,redirectedShots:0,message:'Waiting for game controls.'};
 let exports=null,instrumented=false,own=0,scratch=0,vertical=0,lastNotice='',lastOffline=0,offlineStamp=0,flightTick=null,flightVelocity=[0,0,0],flightHeading=[0,0,1];let spinRoot=0,spinOriginal=null,spinTick=null,cycleNext=null,cycleFireHeld=false;let speedOriginal=null,speedInstalling=false;const actors=new Map(),keys=new Set();const maxHookId=Math.max(4,...profile.hooks.map(h=>h.id));
 const memory=()=>exports?.ek?.buffer,valid=(p,n=4)=>Number.isInteger(p)&&p>=1024&&p%4===0&&p+n<=(memory()?.byteLength||0),word=p=>valid(p)?new Uint32Array(memory())[p>>>2]:0;
 const text=p=>{if(!p||p>=memory().byteLength)return '';const b=new Uint8Array(memory());let value='';for(let i=0;i<100&&p+i<b.length&&b[p+i];i++){if(b[p+i]<32||b[p+i]>126)return '';value+=String.fromCharCode(b[p+i]);}return value;};
 const component=p=>valid(p,12)&&word(p+8)!==0;
 function instanceOf(p,name,token){if(!component(p))return false;for(let c=word(p),i=0;c&&i<12;i++,c=word(c+44)){if(!valid(c,168))return false;if(text(word(c+8))===name&&(!token||word(c+164)===token))return true;}return false;}
 function managed(p,name,token){if(!valid(p,8))return false;for(let c=word(p),i=0;c&&i<12;i++,c=word(c+44)){if(!valid(c,168))return false;if(text(word(c+8))===name&&(!token||word(c+164)===token))return true;}return false;}
 const call=(pointer,...args)=>exports.Ck.get(pointer)(...args);
 function managedString(p){if(!managed(p,'String'))return null;const count=word(p+8);if(count>96||!valid(p,12+count*2))return null;return String.fromCharCode(...new Uint16Array(memory(),p+12,count)).replace(/[\u0000-\u001f\u007f]/g,'').trim()||null;}
 function actorStats(actor,now=performance.now()){
  if(!actor)return null;if(actor.stats&&now-(actor.statsAt||0)<100)return {...actor.stats};
  let name=actor.source==='training'?'Training bot':null,health=null,shield=null;
  const h=actor.source==='training'?actor.health:word(actor.pointer+1336),number=n=>Number.isFinite(n)&&n>=0&&n<=1000000?n:null;
  if(instanceOf(h,'Health',33554586)){try{health=number(call(20406,h,0));shield=number(call(20407,h,0));}catch{health=shield=null;}}
  if(actor.source!=='training'){try{const w=word(actor.pointer+1348),pv=word(w+120);if(instanceOf(pv,'PhotonView')){const owner=call(41766,pv,0);if(managed(owner,'Player',33554493))name=managedString(call(41323,owner,0));}}catch{}}
  actor.stats={name,health,shield};actor.statsAt=now;return {...actor.stats};
 }
 const isOffline=()=>instrumented&&exports&&call(41570,0)===1;
 const controlsPermitted=()=>Boolean(instrumented&&exports);
 const idleMessage=()=>state.controlsAllowed?(state.hasPlayer?(state.offline?'Offline controls ready.':'Match controls ready.'):'Waiting for your character.'):'Waiting for the game controls.';
 const allocate=()=>{if(!scratch){scratch=window.gameInstance?.Module?._malloc(64)||exports.tk(64);if(!valid(scratch,64))throw Error('Game workspace unavailable.');}return scratch;};
 const vector=p=>valid(p,12)?Array.from(new Float32Array(memory(),p,3)):null;
 const position=p=>{if(!component(p))return null;const out=allocate()+16,transform=call(3579,p,0);if(!component(transform))return null;call(3580,out,transform,0);const result=vector(out);return result?.every(Number.isFinite)?result:null;};
 const announce=()=>{const current=[state.ready,state.offline,state.controlsAllowed,state.hasPlayer,own,state.playerGeneration,state.walkSpeed,state.walkMultiplier,state.walkSpeedReady,state.silentTargetMode,state.flight,state.flightSettings.speed,state.flightSettings.boost,state.flightSettings.acceleration,state.flightSettings.followPitch,state.silent,state.bodySpin,state.spinSpeed,state.weaponCycle,state.weaponCycleSettings.intervalMs,state.weaponCycleSettings.fire,state.players,state.targets,state.message].join('|');if(current!==lastNotice){lastNotice=current;window.dispatchEvent(new CustomEvent('nova-buildnow-engine'));}};
 const copyState=()=>({...state,playerId:state.hasPlayer?own:0,ownPosition:actors.get(own)?.position?.slice()||null,flightSettings:{...state.flightSettings},weaponCycleSettings:{...state.weaponCycleSettings},availableGuns:own&&component(own)?gunSlots(word(own+1348)).length:0,silentReadiness:silentReadiness(),silentTargetReady:Boolean(state.silent&&currentTarget()),ownStats:actorStats(actors.get(own)),playerStats:[...actors.values()].filter(a=>!a.dead&&a.pointer!==own).map(a=>({...actorStats(a),source:a.source,dead:a.dead,controlled:false}))});
 const flightFocused=()=>!document.hidden&&document.hasFocus()&&document.pointerLockElement?.id==='unity-canvas';
 function writeFlightVelocity(velocity){const out=allocate();new Float32Array(memory(),out,3).set(velocity);call(26349,own,out,0);}
 const clearKeys=()=>{keys.clear();vertical=0;flightTick=null;flightVelocity=[0,0,0];flightHeading=[0,0,1];if(state.flight&&own&&component(own)&&exports){try{const w=word(own+1348),pv=word(w+120);if(instanceOf(w,'WeaponsSystem',33556494)&&word(w+128)===own&&instanceOf(pv,'PhotonView')&&call(41757,pv,0)===1)writeFlightVelocity(flightVelocity);}catch{}}};
 function normalMovement(){if(!own||!component(own)||!exports)return;const w=word(own+1348),pv=word(w+120);if(instanceOf(w,'WeaponsSystem',33556494)&&word(w+128)===own&&instanceOf(pv,'PhotonView')&&call(41757,pv,0)===1)call(26353,own,2,0,0);}
 function disableAll(){const hadFlight=state.flight;clearKeys();stopCycle();stopSpin();state.flight=false;state.walkSpeed=false;state.silent=false;if(window.NovaLOLVisual)window.NovaLOLVisual.state.silent=false;if(hadFlight)normalMovement();state.message=idleMessage();announce();}
 function capability({offlineOnly=false}={}){if(!instrumented||!exports)throw Error('Game controls are still loading.');if(offlineOnly?!isOffline():!controlsPermitted())throw Error('Enter offline Aim Training first.');if(!own||!instanceOf(own,'BaseCharacterController',33556690)||new Uint8Array(memory())[own+1331])throw Error('Wait for your living character to spawn.');const w=word(own+1348),pv=word(w+120);if(!instanceOf(w,'WeaponsSystem',33556494)||word(w+128)!==own||!instanceOf(pv,'PhotonView')||call(41757,pv,0)!==1)throw Error('Your player controller is unavailable.');return true;}
 function updateStatus(now){if(now-offlineStamp<100)return;offlineStamp=now;lastOffline=Boolean(isOffline());state.ready=instrumented&&Boolean(exports);state.offline=lastOffline;state.controlsAllowed=controlsPermitted();const ownActor=actors.get(own);state.hasPlayer=Boolean(ownActor?.mine&&now-ownActor.seen<=1500&&component(own)&&!new Uint8Array(memory())[own+1331]&&call(41757,word(word(own+1348)+120),0)===1);for(const [p,actor]of actors){if(actor.source==='training')actor.dead=!instanceOf(actor.health,'Health',33554586)||Boolean(new Uint8Array(memory())[actor.health+153]);if(now-actor.seen>(actor.dead?3500:p===own?1500:250)||!component(p))actors.delete(p);}state.players=[...actors.values()].filter(a=>a.source!=='training').length;state.targets=[...actors.values()].filter(a=>a.source==='training'&&!a.dead).length;if(!state.controlsAllowed&&(state.flight||state.walkSpeed||state.silent||state.bodySpin||state.weaponCycle))disableAll();if(!state.hasPlayer&&(state.flight||state.walkSpeed||state.silent||state.bodySpin||state.weaponCycle))disableAll();if(!state.flight&&!state.walkSpeed&&!state.silent&&!state.bodySpin&&!state.weaponCycle)state.message=idleMessage();announce();}
 function observe(p,now){
  if(!instanceOf(p,'BaseCharacterController',33556690))return;const old=actors.get(p);if(old){old.seen=now;if(now-old.updated<60)return;}
  const weapons=word(p+1348),pv=word(weapons+120);if(!instanceOf(weapons,'WeaponsSystem',33556494)||word(weapons+128)!==p||!instanceOf(pv,'PhotonView'))return;const mine=call(41757,pv,0)===1,location=position(p);if(!location)return;
  const dead=Boolean(new Uint8Array(memory())[p+1331]),motor=word(p+180),previous=actors.get(own);const replace=mine&&!dead&&p!==own&&(!own||!component(own)||new Uint8Array(memory())[own+1331]||!previous||now-previous.seen>250||call(41757,word(word(own+1348)+120),0)!==1),renew=mine&&!dead&&p===own&&old&&(old.dead||old.motor!==motor||old.weapons!==weapons||!state.hasPlayer);if(replace||renew){state.hasPlayer=false;if(state.flight||state.walkSpeed||state.silent||state.bodySpin||state.weaponCycle)disableAll();else clearKeys();own=p;state.playerGeneration++;offlineStamp=-Infinity;}actors.set(p,{...old,pointer:p,mine,motor,weapons,position:location,renderPositions:rendererPositions(word(weapons+104)),seen:now,updated:now,source:'player',dead});updateStatus(now);
 }
 function rendererPositions(collection){if(!valid(collection,16))return [];const klass=word(collection),name=valid(klass,168)?text(word(klass+8)):'';let array=collection,count=word(collection+12);if(name==='List`1'){array=word(collection+8);count=word(collection+12);}else if(!name.endsWith('[]'))return [];if(!valid(array,16)||count>64)return [];const result=[];for(let i=0;i<count;i++){const renderer=word(array+16+i*4);if(!instanceOf(renderer,'Renderer'))continue;const point=position(renderer);if(point)result.push(point);}return result;}
 function observeTraining(p,now){if(!instanceOf(p,'TrainingBotAI',33556747))return;const old=actors.get(p);if(old){old.seen=now;if(now-old.updated<40)return;}const health=word(p+64);if(!instanceOf(health,'Health',33554586)){actors.delete(p);return;}const location=position(p),renderer=word(p+28),renderLocation=instanceOf(renderer,'Renderer')?position(renderer):null;if(!location)return;actors.set(p,{...old,pointer:p,mine:false,controlled:false,health,position:location,renderPositions:renderLocation?[renderLocation]:[],seen:now,updated:now,source:'training',dead:Boolean(new Uint8Array(memory())[health+153])});updateStatus(now);}
 function visualRoot(){
  const animation=word(own+1344);if(!instanceOf(animation,'PlayerAnimationHandler',33556733))return 0;
  const skin=word(animation+312),root=word(skin+40);if(!instanceOf(skin,'PlayerSkinHandler',33556203)||!instanceOf(root,'Transform',33554857))return 0;
  const avatar=call(3579,own,0),camera=word(own+192);if(root===avatar||root===camera)return 0;
  if(component(camera)){if(!instanceOf(camera,'Transform',33554857))return 0;let p=camera;for(let i=0;p&&i<24;i++){if(p===root)return 0;p=call(8724,p,0);if(i===23&&p)return 0;}}
  return root;
 }
 function stopSpin(){state.bodySpin=false;spinTick=null;const root=spinRoot,rotation=spinOriginal;spinRoot=0;spinOriginal=null;if(root&&rotation&&exports&&instanceOf(root,'Transform',33554857)){const out=allocate()+48;new Float32Array(memory(),out,4).set(rotation);call(8788,root,out,0);}}
 function ownedWeapon(p,w=word(own+1348)){return instanceOf(p,'RaycastWeapon',33556484)&&word(p+140)===w&&new Uint8Array(memory())[p+157]===1;}
 function gunSlots(w){const list=word(w+84);if(!managed(list,'List\x601'))return [];const array=word(list+8),count=word(list+12);if(!valid(array,16)||count>32||count>word(array+12)||!valid(array,16+count*4))return [];const result=[];for(let i=0;i<count;i++){const weapon=word(array+16+i*4);if(i!==7&&i!==8&&instanceOf(weapon,'RaycastWeapon',33556484)&&word(weapon+140)===w&&weapon!==word(w+64)&&weapon!==word(w+76)&&!instanceOf(weapon,'MiniShield',33556464)&&!instanceOf(weapon,'Pickaxe',33556477)&&!instanceOf(weapon,'BuildHands',33556475))result.push({index:i,weapon});}return result;}
 function releaseCycleFire(){if(cycleFireHeld){cycleFireHeld=false;const canvas=document.getElementById('unity-canvas');if(canvas)window.NovaLOLInput?.mouse(canvas,'mouseup',{button:0,buttons:0});const current=word(word(own+1348)+80);if(exports&&ownedWeapon(current))call(31009,current,0);}if(window.NovaLOLVisual)window.NovaLOLVisual.state.weaponCycleFire=false;}
 function stopCycle(){state.weaponCycle=false;cycleNext=null;releaseCycleFire();}
 function controlsTick(p,now){
  if(p!==own||!state.bodySpin&&!state.weaponCycle)return;capability();
  if(state.bodySpin){if(document.hidden||!document.hasFocus())spinTick=null;else{if(visualRoot()!==spinRoot){stopSpin();state.message='Character model changed · spin stopped.';}else{const dt=spinTick===null?1/60:Math.max(0,Math.min(.05,(now-spinTick)/1000));spinTick=now;if(dt)call(68234,spinRoot,0,state.spinSpeed*dt,0,0);}}}
  if(!state.weaponCycle)return;const w=word(own+1348),health=word(w+124),animation=word(own+1344),bytes=new Uint8Array(memory());
  if(!flightFocused()||bytes[w+132]||bytes[w+140]||bytes[w+141]||instanceOf(health,'Health',33554586)&&bytes[health+153]||instanceOf(animation,'PlayerAnimationHandler',33556733)&&bytes[animation+92]){cycleNext=null;releaseCycleFire();return;}
  const slots=gunSlots(w);if(!slots.length){stopCycle();state.message='Weapon cycling stopped · no guns in your loadout.';announce();return;}
  const current=word(w+80),selected=slots.findIndex(slot=>slot.weapon===current),settings=state.weaponCycleSettings;
  if(selected<0){releaseCycleFire();call(31112,w,slots[0].index,0);cycleNext=now+settings.intervalMs;return;}
  if(!ownedWeapon(current,w)){cycleNext=null;releaseCycleFire();return;}
  if(cycleNext!==null&&now>=cycleNext&&slots.length>1){releaseCycleFire();const next=slots[(selected+1)%slots.length];call(31112,w,next.index,0);cycleNext=now+settings.intervalMs;return;}
  if(cycleNext===null)cycleNext=now+settings.intervalMs;
  if(settings.fire&&!cycleFireHeld){const canvas=document.getElementById('unity-canvas');if(canvas&&window.NovaLOLInput?.mouse){window.NovaLOLVisual?.releaseAutoFire?.();if(window.NovaLOLVisual)window.NovaLOLVisual.state.weaponCycleFire=true;window.NovaLOLInput.mouse(canvas,'mousedown',{button:0,buttons:1});cycleFireHeld=true;}}
  else if(!settings.fire)releaseCycleFire();
 }
 async function installSpeedHook(){
  if(speedInstalling||state.walkSpeedReady||!speedModule||!exports?.Ck?.set)return;
  const owner=exports;speedInstalling=true;
  try{const original=owner.Ck.get(32332);const result=await WebAssembly.instantiate(new Uint8Array(speedModule),{m:{base:original,scale:player=>{
   if(!state.walkSpeed||state.flight||player!==own||word(player+264)!==1||!flightFocused())return 1;
   try{capability();return state.walkMultiplier;}catch{return 1;}
  }}});if(exports!==owner)return;const wrapped=result.instance?.exports.run||result.exports?.run;if(typeof wrapped!=='function')throw Error('Walking speed wrapper unavailable.');owner.Ck.set(32332,wrapped);speedOriginal=original;state.walkSpeedReady=true;announce();}
  catch{state.walkSpeedReady=false;}finally{speedInstalling=false;}
 }
 function nativeHead(actor){
  if(actor.source!=='player'||actor.pointer===own||actor.dead||!instanceOf(actor.pointer,'BaseCharacterController',33556690))return null;
  const animation=word(actor.pointer+1344);
  if(instanceOf(animation,'PlayerAnimationHandler',33556733)){const skin=word(animation+312),setter=word(skin+28),head=word(setter+24),root=word(skin+40);if(instanceOf(skin,'PlayerSkinHandler',33556203)&&word(skin+20)===animation&&instanceOf(setter,'RigBonesRuntimeSetter',33556389)&&instanceOf(head,'Transform',33554857)&&instanceOf(root,'Transform',33554857)){try{let parent=head;for(let i=0;parent&&i<24;i++){if(parent===root)return position(head);parent=call(8724,parent,0);}}catch{}}}
  const animator=instanceOf(animation,'PlayerAnimationHandler',33556733)?word(animation+16):word(actor.pointer+184);
  if(!instanceOf(animator,'Animator',33554451))return null;
  try{if(call(64969,animator,0)!==1)return null;const head=call(65039,animator,10,0);return instanceOf(head,'Transform',33554857)?position(head):null;}catch{return null;}
 }
 function currentTarget(){const visual=window.NovaLOLVisual?.state,canvas=document.getElementById('unity-canvas');if(!visual||!canvas||visual.requireTrigger&&!visual.triggerDown)return null;const rect=canvas.getBoundingClientRect(),now=performance.now(),visible=targetSelector(visual.regions||[],[...actors.values()],own,now,{fullView:visual.fullViewAim,fov:visual.fov,scaleX:rect.width/canvas.width,scaleY:rect.height/canvas.height},bind);if(visible||state.silentTargetMode!=='all')return visible;
  const origin=actors.get(own)?.position;if(!origin)return null;let selected=null,best=Infinity;
  for(const actor of actors.values()){if(actor.pointer===own||actor.dead||now-actor.seen<0||now-actor.seen>250)continue;const point=nativeHead(actor);if(!point?.every(Number.isFinite))continue;const distance=Math.hypot(...point.map((n,i)=>n-origin[i]));if(distance>.01&&distance<best){best=distance;selected={player:actor.pointer,worldPoint:point,worldOrigin:actor.position,source:'native-head'};}}
  return selected;}
 function silentReadiness(){
  if(!state.silent)return {code:'off',message:'Silent aim off.'};
  if(!state.ready||!state.hasPlayer)return {code:'loading',message:'Silent aim · waiting for your training character.'};
  if(!state.controlsAllowed)return {code:'offline',message:'Silent aim · waiting for game controls.'};
  if(!flightFocused())return {code:'capture',message:'Silent aim enabled · click the game to capture your cursor.'};
  const visual=window.NovaLOLVisual?.state,now=performance.now();
  if(visual?.requireTrigger&&!visual.triggerDown)return {code:'trigger',message:'Silent aim enabled · hold your trigger key.'};
  const weapons=word(own+1348),slots=gunSlots(weapons),current=word(weapons+80);
  if(!slots.length)return {code:'guns',message:'Silent aim · press Equip gun loadout to add training guns.'};
  if(!slots.some(slot=>slot.weapon===current))return {code:'weapon',message:'Silent aim · select a gun from your loadout.'};
  if(!ownedWeapon(current,weapons)||new Uint8Array(memory())[weapons+132])return {code:'weapon-loading',message:'Silent aim · waiting for your selected gun to be ready.'};
  const live=[...actors.values()].some(actor=>actor.pointer!==own&&!actor.dead&&now-actor.seen>=0&&now-actor.seen<=250);
  if(!live)return {code:'targets',message:state.offline?'Silent aim · no live targets. Shoot the Start Training panel to spawn bots.':'Silent aim · waiting for another live player.'};
  if(state.silentTargetMode==='all'&&currentTarget())return {code:'ready',message:'Silent aim · registered player ready. Redirected shots: '+state.redirectedShots+'.'};
  const regions=visual?.regions||[];
  if(!regions.length)return {code:'visible',message:state.silentTargetMode==='all'?'Silent aim · waiting for a registered player head.':'Silent aim · bring a live target into view.'};
  if(!regions.some(region=>region.worldPoint?.length===3&&Array.from(region.worldPoint).every(Number.isFinite)))return {code:'pose',message:'Silent aim · waiting for the target position to update.'};
  if(!currentTarget())return {code:'eligible',message:'Silent aim · no live target inside your aim range.'};
  return {code:'ready',message:'Silent aim · live target ready. Redirected shots: '+state.redirectedShots+'.'};
 }
 function fly(motor,now){
  if(!state.flight||!own||word(own+180)!==motor)return;if(!controlsPermitted()||!component(own)||new Uint8Array(memory())[own+1331]){disableAll();return;}capability();const actor=actors.get(own);if(actor)actor.seen=now;
  if(word(own+264)!==4)call(26353,own,4,0,0);if(!flightFocused()){clearKeys();return;}
  const settings=state.flightSettings,out=allocate(),camera=word(own+192);let forward=flightHeading;
  if(component(camera)){call(6009,out+32,camera,0);const view=vector(out+32);if(view?.every(Number.isFinite)){const horizontal=Math.hypot(view[0],view[2]),length=Math.hypot(...view);if(horizontal>.001)flightHeading=[view[0]/horizontal,0,view[2]/horizontal];forward=settings.followPitch&&length>.001?view.map(value=>value/length):flightHeading;}}
  const f=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),s=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),input=[forward[0]*f+flightHeading[2]*s,forward[1]*f+vertical,forward[2]*f-flightHeading[0]*s],scale=settings.speed*(keys.has('ShiftLeft')||keys.has('ShiftRight')?settings.boost:1)/Math.max(1,Math.hypot(...input)),desired=input.map(value=>value*scale);
  const elapsed=flightTick===null?1/60:Math.max(0,Math.min(.05,(now-flightTick)/1000));flightTick=now;const delta=desired.map((value,index)=>value-flightVelocity[index]),distance=Math.hypot(...delta),step=settings.acceleration*elapsed;if(distance<=step)flightVelocity=desired;else if(distance>.0001)flightVelocity=flightVelocity.map((value,index)=>value+delta[index]*step/distance);
  writeFlightVelocity(flightVelocity);
 }
 function redirect(kind,weapon,a,b){
  if(!state.silent||!flightFocused()||!controlsPermitted()||!component(weapon)||!valid(a,12)||kind===4&&!valid(b,12))return;
  const weapons=word(weapon+140);if(weapons!==word(own+1348)||word(weapons+128)!==own||new Uint8Array(memory())[weapon+157]!==1)return;
  state.shotEvents++;const target=currentTarget();if(!target){state.message='Silent aim · no eligible live player target.';announce();return;}
  const origin=kind===4?vector(a):position(word(weapons+72)),speed=kind===4?Math.hypot(...(vector(b)||[])):1,aim=direction(origin,target.worldPoint,speed);if(!aim||!valid(kind===4?b:a,12))return;
  new Float32Array(memory(),kind===4?b:a,3).set(aim);state.redirectedShots++;state.message='Silent aim · directing shots to a registered player.';announce();
 }
 function dispatch(a,b,c,kind){try{const now=performance.now();if(kind===1){observe(a,now);controlsTick(a,now);}else if(kind===2)fly(a,now);else if(kind===3||kind===4)redirect(kind,a,b,c);else if(kind===5)observeTraining(a,now);}catch(error){const flying=state.flight;clearKeys();try{stopCycle();stopSpin();}catch{}state.flight=false;state.walkSpeed=false;state.silent=false;if(window.NovaLOLVisual)window.NovaLOLVisual.state.silent=false;state.message='Controls stopped: '+error.message;if(flying)try{normalMovement();}catch{}announce();}}
 const prepareImports=imports=>{if(!imports?.a?.Ki)return;const original=imports.a.Ki;if(original.novaEngineBridge)return;function bridge(a,b,c,kind){if(kind>profile.magic&&kind<=profile.magic+maxHookId){dispatch(a,b,c,kind-profile.magic);return;}return original(a,b,c,kind);}bridge.novaEngineBridge=true;imports.a.Ki=bridge;};
 for(const name of ['instantiate','instantiateStreaming']){const original=WebAssembly[name];if(typeof original!=='function')continue;WebAssembly[name]=function(source,imports,...rest){prepareImports(imports);return original.call(this,source,imports,...rest).then(async result=>{const candidate=result.instance?.exports||result.exports;if(candidate?.Ck instanceof WebAssembly.Table&&candidate?.ek instanceof WebAssembly.Memory){exports=candidate;await installSpeedHook();}return result;});};}
 const api={
  async prepareWasm(blob){try{const bytes=await blob.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');if(hash!==profile.sha256)throw Error('Unsupported game build.');const output=patch(bytes,profile);if(!WebAssembly.validate(output))throw Error('Game controls failed validation.');instrumented=true;return new Blob([output],{type:'application/wasm'});}catch(error){state.message='Native controls unavailable: '+error.message;announce();return blob;}},
  snapshot(){if(exports)updateStatus(performance.now());return copyState();},
  setFlight(enabled){if(enabled){capability();allocate();clearKeys();call(26353,own,4,0,0);state.flight=true;state.message='Flying · WASD moves, Space / Ctrl rises or descends, Shift boosts.';}else{const previous=state.flight;clearKeys();state.flight=false;if(previous)normalMovement();state.message='Flight off · normal movement restored.';}announce();return copyState();},
  setFlightOptions(options={}){if(options&&typeof options==='object'){for(const [key,min,max]of [['speed',2,60],['boost',1,4],['acceleration',5,120]]){if(Number.isFinite(options[key]))state.flightSettings[key]=Math.max(min,Math.min(max,options[key]));}if(typeof options.followPitch==='boolean')state.flightSettings.followPitch=options.followPitch;}announce();return copyState();},
  setSilent(enabled){if(enabled)capability();state.silent=Boolean(enabled);if(window.NovaLOLVisual)window.NovaLOLVisual.state.silent=state.silent;state.message=enabled?'Silent aim · waiting for a visible player.':'Silent aim off.';announce();return copyState();},
  setSilentTargetMode(mode){state.silentTargetMode=mode==='all'?'all':'visible';announce();return copyState();},
  setWalkSpeed(enabled){if(enabled){capability();if(!state.walkSpeedReady)throw Error('Walking speed is waiting for the native movement function.');}state.walkSpeed=Boolean(enabled);state.message=enabled?'Walking speed enabled · '+state.walkMultiplier+'×.':'Walking speed off · normal speed restored.';announce();return copyState();},
  setWalkMultiplier(value){if(Number.isFinite(value))state.walkMultiplier=Math.max(1,Math.min(5,value));if(state.walkSpeed)state.message='Walking speed enabled · '+state.walkMultiplier+'×.';announce();return copyState();},
  setBodySpin(enabled){if(enabled){capability();const root=visualRoot();if(!root)throw Error('Your character model is unavailable.');if(!state.bodySpin){const out=allocate()+48;call(8784,out,root,0);const original=Array.from(new Float32Array(memory(),out,4));if(!original.every(Number.isFinite)||Math.hypot(...original)<.01)throw Error('Character rotation is unavailable.');spinRoot=root;spinOriginal=original;spinTick=null;state.bodySpin=true;}state.message='Character spin enabled · camera stays independent.';}else{stopSpin();state.message='Character spin off · model restored.';}announce();return copyState();},
  setSpinSpeed(speed){if(Number.isFinite(speed))state.spinSpeed=Math.max(30,Math.min(1440,speed));announce();return copyState();},
  equipTrainingGuns(){
   capability({offlineOnly:true});const w=word(own+1348),maximum=word(w+108);if(maximum<1||maximum>16)throw Error('Your loadout is unavailable.');
   const manager=call(20231,0);if(!instanceOf(manager,'GameManager',33554550)||word(manager+60)!==own||word(manager+64)!==w)throw Error('Wait for your training loadout to initialize.');
   const library=word(manager+24);if(!instanceOf(library,'AllItemsLibrary',33556890))throw Error('The gun catalogue is unavailable.');
   const initial=gunSlots(w).length,limit=Math.max(0,maximum-initial),out=allocate();let added=0;
   for(const id of [4,0,6,1,2,5,3,7,8,9,10]){
    if(added>=limit||gunSlots(w).length>=maximum)break;const item=call(33461,library,id,0);
    if(!instanceOf(item,'WeaponItem',33556604)||word(item+44)!==id||word(item+36)!==1)continue;
    const dataObject=word(item+56);if(!instanceOf(dataObject,'WeaponDataObject',33556497))continue;const data=word(dataObject+12);if(!managed(data,'WeaponData',33556502))continue;const prefab=word(data+8);
    if(!instanceOf(prefab,'RaycastWeapon',33556484)||instanceOf(prefab,'MiniShield',33556464)||instanceOf(prefab,'Pickaxe',33556477)||instanceOf(prefab,'BuildHands',33556475))continue;
    if(gunSlots(w).some(slot=>word(slot.weapon+16)===dataObject))continue;
    if(call(31125,w,out+32,0)!==1)break;const freeSlot=word(out+32);if(freeSlot>=maximum||freeSlot===7||freeSlot===8)break;
    const before=gunSlots(w);releaseCycleFire();new Uint8Array(memory(),out+48,8).fill(0);call(31119,w,item,out+48,0);
    const after=gunSlots(w);if(after.length<=before.length||!after.some(slot=>word(slot.weapon+16)===dataObject)){if(!added)throw Error('The game has not added the gun yet. Try again after your loadout is ready.');break;}added++;
   }
   state.message=added?'Added '+added+' training guns · cycle through your loadout.':initial>=maximum?'Your gun loadout is full.':'No additional training guns are available.';announce();return {...copyState(),addedGuns:added};
  },
  setWeaponCycle(enabled){if(enabled){capability();if(!gunSlots(word(own+1348)).length)throw Error('No guns in your loadout yet. Pick up a gun first.');state.weaponCycle=true;cycleNext=null;state.message='Weapon cycling enabled · one equipped gun at a time.';}else{stopCycle();state.message='Weapon cycling off.';}announce();return copyState();},
  setWeaponCycleOptions(options={}){if(options&&typeof options==='object'){if(Number.isFinite(options.intervalMs))state.weaponCycleSettings.intervalMs=Math.max(120,Math.min(1500,options.intervalMs));if(typeof options.fire==='boolean')state.weaponCycleSettings.fire=options.fire;}if(!state.weaponCycleSettings.fire)releaseCycleFire();cycleNext=null;announce();return copyState();},
  disableAll,
  matchPlayer(origin){const now=performance.now(),known=[...actors.values()].map(a=>a.dead?{...a,seen:now}:a);const actor=bind(origin,known,now,3,{includeDead:true});return actor?{...actor,stats:actorStats(actor,now),controlled:actor.pointer===own}:null;},
  hasTarget(){return Boolean(currentTarget());},
 };
 window.NovaBuildNowEngine=api;
 const refreshVertical=()=>{vertical=(keys.has('Space')?1:0)-(keys.has('ControlLeft')||keys.has('ControlRight')?1:0);};
 window.addEventListener('keydown',event=>{if(!state.flight||document.hidden||!document.hasFocus()||document.pointerLockElement?.id!=='unity-canvas'||event.target.closest?.('input,select,textarea,[contenteditable]'))return;if(['Space','ControlLeft','ControlRight','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight'].includes(event.code)){keys.add(event.code);refreshVertical();event.preventDefault();}},true);
 window.addEventListener('keyup',event=>{keys.delete(event.code);refreshVertical();},true);
 const pauseControls=()=>{clearKeys();releaseCycleFire();cycleNext=null;spinTick=null;};window.addEventListener('blur',pauseControls);document.addEventListener('visibilitychange',pauseControls);document.addEventListener('pointerlockchange',pauseControls);window.addEventListener('pagehide',()=>{disableAll();if(speedOriginal&&exports){try{exports.Ck.set(32332,speedOriginal);}catch{}speedOriginal=null;state.walkSpeedReady=false;}if(scratch&&exports){exports.uk(scratch);scratch=0;}},{once:true});
}

export function engineRuntimeSource(){return `(${installEngine.toString()})(${JSON.stringify(PROFILE)},${patchWasm.toString()},${directedVector.toString()},${bindPlayer.toString()},${choosePlayerTarget.toString()},${JSON.stringify(Array.from(walkingSpeedModule()))});`;}
