const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/willi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const {issueAccountRecovery}=await import('../server/account-recovery.mjs'),{createHandler}=await import('../api-handlers/account-recovery.js');
 const values=new Map([['novaAccounts/owner',{name:'Owner'}],['novaAccounts/user',{name:'Player One'}],['novaChatV2/roles/owner','owner'],['novaChatV2/roles/user','member']]);
 const snapshot=value=>({val:()=>structuredClone(value??null),exists:()=>value!=null});
 const db={getRulesJSON:async()=>({rules:{'.read':false,'.write':false,novaAccountRecovery:{'.read':false,'.write':false}}}),ref:p=>({get:async()=>snapshot(values.get(p)),set:async v=>values.set(p,v),update:async patch=>{for(const [key,value]of Object.entries(patch))values.set(p+'/'+key,value)},push:async v=>values.set(p+'/'+Math.random(),v),transaction:async fn=>{const v=fn(values.get(p)??null);if(v===undefined)return {committed:false,snapshot:snapshot(values.get(p))};values.set(p,v);return {committed:true,snapshot:snapshot(v)}}})};
 const auth={getUser:async()=>({disabled:false}),createCustomToken:async uid=>'token-for-'+uid};
 const issued=await issueAccountRecovery({db,auth,uid:'user',issuer:'owner'}),handler=createHandler(async()=>({db,auth}));
 const browser=await chromium.launch({channel:'msedge',headless:true});try{
  const page=await browser.newPage(),bodies=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='recovery.test')return route.abort();
   if(u.pathname==='/api/account-recovery'){const body=route.request().postDataJSON();bodies.push(body);const res={setHeader(){},end(v){this.body=v}};await handler({method:'POST',headers:{},body},res);return route.fulfill({status:res.statusCode,contentType:'application/json',body:res.body})}
   if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:`<html><head><link rel="stylesheet" href="/src/account.css"></head><body><button id="forgot">Forgot password?</button><script type="module">import {showAccountRecovery} from '/src/account-recovery-ui.mjs';window.tokens=[];window.passwords=[];window.completed=0;document.querySelector('#forgot').onclick=()=>showAccountRecovery({onSignIn:async token=>{window.tokens.push(token);return {uid:'user'}},onPassword:async(user,password)=>window.passwords.push([user.uid,password]),onComplete:async()=>window.completed++,onEmailReset:async()=>{}});window.ready=true;</script></body></html>`});
   const p='Public'+u.pathname;if(fs.existsSync(p))return route.fulfill({body:fs.readFileSync(p),contentType:p.endsWith('.css')?'text/css':'text/javascript'});return route.fulfill({status:404,body:''});
  });
  await page.goto('https://recovery.test/');await page.waitForFunction(()=>window.ready);await page.getByRole('button',{name:'Forgot password?'}).click();
  await page.getByLabel('Username',{exact:true}).fill('Player One');await page.getByLabel('Email you remember (optional)').fill('fake@example.test');await page.getByLabel('Owner recovery code').fill(issued.code);await page.getByLabel('New password (optional)').fill('BrandNewPassword123!');await page.getByRole('button',{name:'Sign in with code'}).click();
  await page.waitForFunction(()=>window.completed===1);assert.equal(await page.locator('dialog').count(),0);assert.deepEqual(await page.evaluate(()=>window.tokens),['token-for-user']);assert.deepEqual(await page.evaluate(()=>window.passwords),[['user','BrandNewPassword123!']]);assert.deepEqual(Object.keys(bodies[0]).sort(),['code','username']);
  await page.getByRole('button',{name:'Forgot password?'}).click();await page.getByLabel('Username',{exact:true}).fill('Player One');await page.getByLabel('Owner recovery code').fill(issued.code);await page.getByRole('button',{name:'Sign in with code'}).click();await page.getByText('The recovery details are invalid or expired.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.completed),1);assert.deepEqual(errors,[]);
  console.log('PASS: owner-issued code signs into the bound account without email access; optional password stays in the Firebase callback; replay is rejected.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
