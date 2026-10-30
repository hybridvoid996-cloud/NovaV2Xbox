import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function client(seed={},cloud={},options={}){
 const store=new Map(Object.entries(seed)),auth={currentUser:null},events=[],calls=[],cache=new Map(),intervals=new Map(),listeners=new Map();
 let source=readFileSync('Public/src/account-data.js','utf8').replace(/^import .*;$/gm,'').replace(/export /g,'');
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>{if(k.startsWith('nova-account-data:')||k.startsWith('nova-account-cookies:'))throw Object.assign(Error('Storage quota exceeded'),{name:'QuotaExceededError'});if(options.limit&&[...store].filter(([key])=>key!==k).reduce((n,[key,value])=>n+key.length+value.length,0)+k.length+String(v).length>options.limit)throw Object.assign(Error('Storage quota exceeded'),{name:'QuotaExceededError'});store.set(k,String(v))},removeItem:k=>store.delete(k)};
 const localStorage=new Proxy(storage,{ownKeys:()=>[...store.keys()],getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true})});
 const isUnreadableRecord=error=>error?.code==='NOVA_CACHE_UNREADABLE'||/failed to read large indexeddb value|data lost due to missing file/i.test(error?.message||'');
 const context={AbortSignal,auth,localStorage,isUnreadableRecord,readCache:async key=>structuredClone(cache.get(key)),writeCache:async(key,value)=>cache.set(key,structuredClone(value)),migrateAccountCaches:async()=>{for(const [key,value]of store)if(/^(nova-account-data:|nova-account-cookies:)/.test(key)){if(!cache.has(key))cache.set(key,JSON.parse(value));store.delete(key)}},compactSlots:async()=>{},archived:async()=>null,captureGames:async()=>{},restoreGames:async()=>{},captureWebSession:async()=>{},restoreWebSession:async()=>{},setInterval(fn,ms){intervals.set(ms,fn)},setTimeout(){},clearTimeout(){},addEventListener(type,fn){listeners.set(type,fn)},document:{hidden:false,addEventListener(){}},dispatchEvent:e=>events.push(e),Event:class{constructor(type){this.type=type}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},fetch:async(_,options)=>{const body=JSON.parse(options.body);const user=options.headers.Authorization.slice(7);calls.push({user,...body});if(body.operation==='load')return {ok:true,json:async()=>({entries:Object.entries(cloud[user]||{}).map(([key,value])=>({key,value}))})};cloud[user]??={};for(const row of body.entries){if(row.value===null)delete cloud[user][row.key];else cloud[user][row.key]=row.value;}return {ok:true,json:async()=>({ok:true})};}};
 context.window=context;context.parent=context;vm.createContext(context);vm.runInContext(source,context);
 const login=async(uid,options)=>{auth.currentUser={uid,getIdToken:async()=>uid};await context.NovaAccountData.activate(auth.currentUser,options);};
 return {context,store,cache,events,cloud,calls,login,localStorage,intervals,listeners};
}
test('new accounts start fresh and returning accounts restore their separate settings and game saves',async()=>{
 const c=client({nova_user:'one',nova_wallpaper:'one.jpg','nova-content.invalid@save':'one-save'});
 await c.login('one');await c.context.NovaAccountData.flush();
 await c.login('two',{fresh:true});assert.equal(c.store.has('nova_wallpaper'),false);assert.equal(c.store.has('nova-content.invalid@save'),false);
 c.localStorage.setItem('nova_wallpaper','two.jpg');c.localStorage.setItem('nova-content.invalid@save','two-save');await c.context.NovaAccountData.flush();
 await c.login('one');assert.equal(c.store.get('nova_wallpaper'),'one.jpg');assert.equal(c.store.get('nova-content.invalid@save'),'one-save');
 assert.equal(c.cloud.two.nova_wallpaper,'two.jpg');
});
test('another computer restores account data and excludes authentication credentials',async()=>{
 const c=client({}, {one:{nova_wallpaper:'cloud.jpg','nova-content.invalid@save':'cloud-save','firebase:authUser':'secret','site@access_token':'secret'}});
 await c.login('one');assert.equal(c.store.get('nova_wallpaper'),'cloud.jpg');assert.equal(c.store.get('nova-content.invalid@save'),'cloud-save');assert.equal(c.store.has('site@access_token'),false);
});

test('Monkey Mart native progress backs up, restores on another computer, and stays separate per account',async()=>{
 const save=JSON.stringify({numMarket:2,cash1:4500,have_places1:[1,2,3]});
 const c=client({nova_user:'one',monkeymart_config:save});
 await c.login('one');await c.context.NovaAccountData.flush();
 assert.equal(c.cloud.one.monkeymart_config,save);
 await c.login('two',{fresh:true});assert.equal(c.store.has('monkeymart_config'),false);
 c.localStorage.setItem('monkeymart_config',JSON.stringify({numMarket:1}));await c.context.NovaAccountData.flush();
 await c.login('one');assert.equal(c.store.get('monkeymart_config'),save);
 const laptop=client({},c.cloud);await laptop.login('one');assert.equal(laptop.store.get('monkeymart_config'),save);
});
test('offline login keeps local backup and pending changes for retry',async()=>{
 const c=client({nova_user:'one',nova_wallpaper:'local.jpg'});c.context.fetch=async()=>{throw Error('offline')};await c.login('one');assert.equal(c.store.get('nova_wallpaper'),'local.jpg');assert(c.cache.has('nova-account-data:one'));assert.equal(c.store.has('nova-account-data:one'),false);
});

test('a large or unavailable game backup does not block the current account',async()=>{const c=client({nova_user:'one',nova_wallpaper:'keep.jpg'});c.context.captureGames=async()=>{throw Error('Game saves exceed the current cloud backup limit.')};await c.login('one');assert.equal(c.store.get('nova_wallpaper'),'keep.jpg');});


test('full localStorage login migrates legacy snapshots and keeps offline account changes',async()=>{
 const values={nova_wallpaper:'x'.repeat(3500),'nova-content.invalid@save':'save-one'};
 const legacy=JSON.stringify({values,pending:values,localPin:'1234'});
 const c=client({nova_user:'one',...values,'nova-account-data:one':legacy},{},{limit:4000});
 c.context.fetch=async()=>{throw Error('offline')};await c.login('one');
 assert.equal(c.store.get('nova_wallpaper'),values.nova_wallpaper);assert.equal(c.store.get('nova_pin'),'1234');
 assert.equal(c.store.has('nova-account-data:one'),false);assert.equal(c.cache.get('nova-account-data:one').pending.nova_wallpaper,values.nova_wallpaper);
 await c.login('two',{fresh:true});assert.equal(c.store.has('nova_wallpaper'),false);
 c.localStorage.setItem('nova_wallpaper','two.jpg');await c.context.NovaAccountData.flush().catch(()=>{});
 await c.login('one');assert.equal(c.store.get('nova_wallpaper'),values.nova_wallpaper);assert.equal(c.store.get('nova-content.invalid@save'),'save-one');
});
test('pending changes in IndexedDB survive offline retries and clear after cloud save',async()=>{
 const c=client({nova_user:'one',nova_wallpaper:'one.jpg'});await c.login('one');
 c.localStorage.setItem('nova_wallpaper','changed.jpg');const fetch=c.context.fetch;c.context.fetch=async()=>{throw Error('offline')};
 await assert.rejects(c.context.NovaAccountData.flush(),/offline/);
 assert.equal(c.cache.get('nova-account-data:one').pending.nova_wallpaper,'changed.jpg');
 c.context.fetch=fetch;await c.context.NovaAccountData.flush();assert.equal(c.cloud.one.nova_wallpaper,'changed.jpg');
 assert.deepEqual(c.cache.get('nova-account-data:one').pending,{});
});

const unreadableBackup=()=>Object.assign(Error('Failed to read large IndexedDB value'),{name:'UnknownError'});
test('the current profile opens with its active data when IndexedDB backups and cloud are unreadable',async()=>{
 const c=client({nova_user:'one',nova_wallpaper:'keep.jpg','site@save':'keep-save',nova_game_save_manifest:'keep-manifest',nova_pin:'4321'});
 c.context.readCache=async()=>{throw unreadableBackup()};c.context.archived=async()=>{throw unreadableBackup()};c.context.fetch=async()=>{throw Error('offline')};
 await c.login('one');assert.equal(c.store.get('nova_wallpaper'),'keep.jpg');assert.equal(c.store.get('site@save'),'keep-save');assert.equal(c.store.get('nova_game_save_manifest'),'keep-manifest');assert.equal(c.store.get('nova_pin'),'4321');assert.equal(c.cache.get('nova-account-data:one').pending['site@save'],'keep-save');
});
test('a damaged target profile recovers its own cloud data without borrowing the previous account',async()=>{
 const c=client({nova_user:'one',nova_wallpaper:'one.jpg','site@save':'one-save'}, {two:{nova_wallpaper:'two.jpg','site@save':'two-save'}});
 const read=c.context.readCache;c.context.readCache=async key=>{if(key==='nova-account-data:two')throw unreadableBackup();return read(key)};
 await c.login('two');assert.equal(c.store.get('nova_wallpaper'),'two.jpg');assert.equal(c.store.get('site@save'),'two-save');assert.equal(c.cache.get('nova-account-data:one').values['site@save'],'one-save');assert(c.events.some(e=>e.detail?.state==='limited'));
});
test('an offline switch with a damaged target backup keeps current account data and does not restore games',async()=>{
 const c=client({nova_user:'one',nova_wallpaper:'one.jpg','site@save':'one-save'});let restored=false;
 c.context.readCache=async()=>{throw unreadableBackup()};c.context.fetch=async()=>{throw Error('offline')};c.context.restoreGames=async()=>restored=true;
 await assert.rejects(c.login('two'),/cloud recovery is unavailable/);assert.equal(c.store.get('nova_wallpaper'),'one.jpg');assert.equal(c.store.get('site@save'),'one-save');assert.equal(restored,false);
});
test('failed game capture and an unreadable cache do not trap the current profile in the picker',async()=>{
 const c=client({nova_user:'one',nova_wallpaper:'keep.jpg','site@save':'keep-save'});c.context.captureGames=async()=>{throw unreadableBackup()};c.context.readCache=async()=>{throw unreadableBackup()};
 await c.login('one');assert.equal(c.store.get('site@save'),'keep-save');assert.equal(c.cache.get('nova-account-data:one').values.nova_wallpaper,'keep.jpg');assert.equal(c.cache.get('nova-account-data:one').pending['site@save'],'keep-save');assert.equal(c.store.get('nova-data-owner'),'one');assert(c.events.some(e=>e.detail?.state==='limited'));
});
test('unrelated IndexedDB failures are reported instead of silently treating an account as new',async()=>{
 const c=client({nova_user:'one',nova_wallpaper:'keep.jpg'});c.context.readCache=async()=>{throw Error('Permission denied')};
 await assert.rejects(c.login('one'),/Permission denied/);assert.equal(c.store.get('nova_wallpaper'),'keep.jpg');
});


test('lightweight account sync uploads preferences without scanning binary game saves',async()=>{
 const c=client({nova_user:'one',nova_wallpaper:'one.jpg'});await c.login('one');let captures=0;c.context.captureGames=async()=>{captures++};
 c.localStorage.setItem('nova_wallpaper','new.jpg');await c.context.NovaAccountData.flush({captureGameSaves:false});
 assert.equal(captures,0);assert.equal(c.cloud.one.nova_wallpaper,'new.jpg');
 await c.context.NovaAccountData.flush();assert.equal(captures,1,'Explicit save still captures game data');
});

test('active game, app and cloud backups are batched, then capture promptly on Home',async()=>{
 const c=client({nova_user:'one'});let now=1000000,captures=0;
 c.context.Date={now:()=>now};c.context.captureGames=async()=>{captures++};await c.login('one');const initial=captures;
 const panel={hidden:false,dataset:{view:'game'}};c.context.document.getElementById=()=>panel;
 for(const view of ['game','app','cloud']){panel.dataset.view=view;now+=60000;c.intervals.get(60000)();await new Promise(resolve=>setImmediate(resolve));}
 assert.equal(captures,initial,'No binary archive scans during the first three active minutes');
 now+=120000;c.intervals.get(60000)();await new Promise(resolve=>setImmediate(resolve));assert.equal(captures,initial+1,'Long sessions retain periodic backups');
 panel.hidden=true;c.listeners.get('nova-background-visibility')({detail:{visible:true}});await new Promise(resolve=>setImmediate(resolve));assert.equal(captures,initial+2);
});

test('cloud restore starts while local game capture is still pending',async()=>{const c=client({nova_user:'one',nova_wallpaper:'keep.jpg'});let release;const capture=new Promise(resolve=>release=resolve);c.context.captureGames=()=>capture;let finished=false;const login=c.login('one').then(()=>finished=true);await new Promise(resolve=>setImmediate(resolve));assert(c.calls.some(call=>call.operation==='load'),'Cloud read overlaps the save scan');assert.equal(finished,false,'Live saves must still finish capturing before applying cloud data');release();await login;assert.equal(c.store.get('nova_wallpaper'),'keep.jpg')});
test('reopening the same account skips cookie-session capture while switching still captures it',async()=>{const c=client({nova_user:'one'});const captured=[];c.context.captureWebSession=async uid=>captured.push(uid);await c.login('one');assert.deepEqual(captured,[]);await c.login('two',{fresh:true});assert.deepEqual(captured,['one'])});

test('Retro Bowl native career slots follow A/B/A without transferring careers',async()=>{const key='RetroBowl.123456.savedata.ini',slot='RetroBowl.123456.savedata5.ini';const c=client({nova_user:'one',[key]:'season 8',[slot]:'season 3'});await c.login('one');await c.context.NovaAccountData.flush();await c.login('two',{fresh:true});assert.equal(c.store.has(key),false);assert.equal(c.store.has(slot),false);c.localStorage.setItem(key,'season 1');await c.context.NovaAccountData.flush();await c.login('one');assert.equal(c.store.get(key),'season 8');assert.equal(c.store.get(slot),'season 3');assert.equal(c.cloud.two[key],'season 1')});
test('Retro Bowl career restores from another origin account backup',async()=>{const key='RetroBowl.123456.savedata2.ini',c=client({}, {one:{[key]:'playoff season'}});await c.login('one');assert.equal(c.store.get(key),'playoff season')});

test('shared engine save formats follow the account without a per-game patch',async()=>{const keys=['SomeGrindingGame.123.savedata.ini','AnotherGame.456.save1.dat','c2save_slot1','RPG File1'];const seed={nova_user:'one',...Object.fromEntries(keys.map(k=>[k,'level 10']))},c=client(seed);await c.login('one');await c.context.NovaAccountData.flush();await c.login('two',{fresh:true});for(const key of keys)assert.equal(c.store.has(key),false);await c.login('one');for(const key of keys)assert.equal(c.store.get(key),'level 10')});

test('an oversized Retro Bowl save never reports a successful cloud save',async()=>{const key='nova-content.invalid@RetroBowl.123.savedata.ini',c=client({nova_user:'one',[key]:'x'.repeat(190000)});await c.login('one');await c.context.NovaAccountData.flush();assert.equal(c.store.get(key).length,190000);assert.equal(c.cloud.one?.[key],undefined);assert.equal(c.events.filter(e=>e.type==='nova-sync-status').at(-1).detail.state,'limited')});
