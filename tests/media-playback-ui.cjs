const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/willi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();let proxyCalls=0;
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.hostname!=='media.test')return route.fulfill({body:'<html>Player fixture</html>',contentType:'text/html'});
   if(u.pathname==='/novatube.html')return route.fulfill({contentType:'text/html',headers:{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'credentialless'},body:fs.readFileSync('Public/novatube.html','utf8').replace(/<script(?! type="module" src="\/src\/novatube-native)[\s\S]*?<\/script>/g,'')});
   if(u.pathname==='/api/novatube')return route.fulfill({json:{videos:[],video:{id:'aqz-KE-bpKQ',title:'Test movie'}}});
   if(u.pathname.startsWith('/src/')){const file='Public'+u.pathname;return route.fulfill({body:fs.readFileSync(file),contentType:u.pathname.endsWith('.css')?'text/css':'text/javascript'})}
   return route.fulfill({body:''});
  });
  await page.clock.install();
  await page.goto('https://media.test/novatube.html?v=aqz-KE-bpKQ');
  await page.locator('#tube-player iframe').waitFor();
  assert.equal(await page.evaluate(()=>crossOriginIsolated),true);
  assert.equal(await page.locator('#tube-player iframe').getAttribute('credentialless'),'');
  await page.frameLocator('#tube-player iframe').locator('body').filter({hasText:'Player fixture'}).waitFor();
  assert.match(await page.locator('#tube-player iframe').getAttribute('src'),/^https:\/\/www.youtube-nocookie.com\/embed\/aqz-KE-bpKQ/);
  await page.exposeFunction('recordProxy',()=>proxyCalls++);
  await page.evaluate(()=>{window.NovaConnection={create:async()=>{await window.recordProxy();return {createFrame(){const element=document.createElement('iframe');return {element,go(){element.src='/~/sj/p/fixture'}}}}}}});
  await page.getByRole('button',{name:'Proxy Player',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#tube-player iframe')?.getAttribute('src')==='/~/sj/p/fixture');
  assert.equal(proxyCalls,1);
  await page.getByRole('button',{name:'Regular Player',exact:true}).click();
  assert.match(await page.locator('#tube-player iframe').getAttribute('src'),/^https:\/\/www.youtube-nocookie.com\/embed\//);
  assert.equal(await page.locator('#tube-player iframe').count(),1);
  await page.clock.fastForward(6001);
  assert.match(await page.locator('#tube-player iframe').getAttribute('src'),/^https:\/\/www\.youtube\.com\/embed\//);
  assert.equal(proxyCalls,1);
  await page.clock.fastForward(6001);
  await page.waitForFunction(()=>document.querySelector('#tube-player iframe')?.getAttribute('src')==='/~/sj/p/fixture');
  assert.equal(proxyCalls,2);
  await page.getByRole('button',{name:'Regular Player',exact:true}).click();
  await page.evaluate(()=>dispatchEvent(new MessageEvent('message',{source:document.querySelector('#tube-player iframe').contentWindow,origin:'https://www.youtube-nocookie.com',data:JSON.stringify({event:'onReady'})})));
  await page.clock.fastForward(25000);
  assert.match(await page.locator('#tube-player iframe').getAttribute('src'),/^https:\/\/www.youtube-nocookie\.com\/embed\//);
  assert.equal(proxyCalls,2);
  await page.evaluate(()=>dispatchEvent(new MessageEvent('message',{source:document.querySelector('#tube-player iframe').contentWindow,origin:'https://www.youtube-nocookie.com',data:JSON.stringify({event:'onError',info:153})})));
  await page.waitForFunction(()=>document.querySelector('#tube-player iframe')?.getAttribute('src')==='/~/sj/p/fixture');
  assert.equal(proxyCalls,3);
  await page.getByRole('button',{name:'Regular Player',exact:true}).click();
  await page.evaluate(()=>dispatchEvent(new MessageEvent('message',{source:document.querySelector('#tube-player iframe').contentWindow,origin:'https://www.youtube-nocookie.com',data:JSON.stringify({event:'onStateChange',info:3})})));
  await page.clock.fastForward(20001);
  await page.waitForFunction(()=>document.querySelector('#tube-player iframe')?.getAttribute('src')==='/~/sj/p/fixture');
  assert.equal(proxyCalls,4);
  await page.addStyleTag({content:fs.readFileSync('Public/src/nova-music-app.css','utf8')});
  await page.evaluate(()=>{const b=document.createElement('button');b.className='nmc-play-toggle is-buffering';b.id='buffer-test';document.body.append(b)});
  assert.equal(await page.locator('#buffer-test').evaluate(n=>getComputedStyle(n,'::after').animationName),'nmc-buffer-spin');
  console.log('PASS: no-cookie YouTube domain, explicit proxy switch, blocked-player fallback, healthy-player stability, music buffering animation.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
