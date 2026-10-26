import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
test('switching the Computer approval account does not sign the main Nova account out',async()=>{
 const source=(await readFile(new URL('../Public/src/remote-login.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
 const mainAuth={currentUser:{uid:'main'}},approval={authStateReady:async()=>{},onAuthStateChanged(){}};const elements=new Map();let signedOut;
 const context={mainAuth,app:{options:{}},getApps:()=>[],initializeApp:(options,name)=>({name}),getAuth:a=>{assert.equal(a.name,'nova-remote-approval');return approval},setPersistence:async(a,p)=>{assert.equal(a,approval)},inMemoryPersistence:{},updateCurrentUser:async(a,u)=>a.currentUser=u,signOut:async a=>{signedOut=a;a.currentUser=null},document:{getElementById:id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id)}},URLSearchParams,location:{search:'?code=ABCDEF0123456789AB'}};
 await vm.runInNewContext('(async()=>{'+source+'})()',context);await elements.get('switch').onclick();assert.equal(signedOut,approval);assert.equal(mainAuth.currentUser.uid,'main');
});
test('only the selected Firebase-managed saved session is restored, and explicit logout is respected',async()=>{
 const source=(await readFile(new URL('../Public/src/account-slots.js',import.meta.url),'utf8')).split('export async function restoreSavedAccount(){')[1];
 for(const [expected,signedOut,savedUid,restored]of [['one',false,'one',true],['one',true,'one',false],['missing',false,'one',false],['one',false,'other',false]]){
  const auth={currentUser:null,authStateReady:async()=>{}};const context={auth,slots:()=>[{uid:'one'},{uid:'two'}],slotAuth:async()=>({currentUser:{uid:savedUid}}),localStorage:{getItem:k=>k==='nova-login-handoff-signed-out'?(signedOut?'1':null):k==='nova_user'?expected:null},sessionStorage:{getItem:()=>null},updateCurrentUser:async(a,u)=>a.currentUser=u};
  const value=await vm.runInNewContext('(async()=>{'+source+')()',context);assert.equal(!!value,restored);
 }
});
test('logout links are consumed once; a still-authenticated visit resumes without a password',async()=>{
 const source=(await readFile(new URL('../Public/src/account.js',import.meta.url),'utf8')).split('const entryQuery=')[1].split("if(new URLSearchParams(location.search).has('add')")[0];
 const stored=new Map();let logouts=0,entries=0;const location={search:'?logout=1',pathname:'/account.html',hash:''},auth={currentUser:{uid:'one'},authStateReady:async()=>{}};
 const context={URLSearchParams,location,history:{replaceState:(a,b,url)=>location.search=new URL(url,'https://nova.test').search},localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},sessionStorage:{getItem:()=>null},flush:async()=>{},signOut:async()=>{logouts++;auth.currentUser=null},auth,restoreSavedAccount:async()=>null,record:{onboardingComplete:true},loadRecord:async()=>{},enter:async()=>entries++,showStep:async()=>{},$:()=>({})};
 const run=()=>vm.runInNewContext('(async()=>{const entryQuery='+source+'})()',context);await run();await run();assert.equal(logouts,1);stored.clear();auth.currentUser={uid:'one'};await run();assert.equal(entries,1);
});
