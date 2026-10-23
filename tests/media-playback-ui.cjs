const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/willi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();let proxyCalls=0;
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.hostname!=='media.test')return route.fulfill({body:'<html>Player fixture</html>',contentType:'text/html'});
   if(u.pathname==='/novatube.html')return route.fulfill({contentType:'text/html',body:fs.readFileSync('Public/novatube.html','utf8').replace(/<script(?! type="module" src="\/src\/novatube-native)[\s\S]*?<\/script>/g,'')});
   if(u.pathname==='/api/novatube')return route.fulfill({json:{videos:[],video:{id:'aqz-KE-bpKQ',title:'Test movie'}}});
   if(u.pathname.startsWith('/src/')){const file='Public'+u.pathname;return route.fulfill({body:fs.readFileSync(file),contentType:u.pathname.endsWith('.css')?'text/css':'text/javascript'})}
   return route.fulfill({body:''});
  });
  await page.goto('https://media.test/novatube.html?v=aqz-KE-bpKQ');
  await page.locator('#tube-player iframe').waitFor();
  assert.match(await page.locator('#tube-player iframe').getAttribute('src'),/^https:\/\/www.youtube-nocookie.com\/embed\/aqz-KE-bpKQ/);
  await page.exposeFunction('recordProxy',()=>proxyCalls++);
  await page.evaluate(()=>{window.NovaConnection={create:async()=>{await window.recordProxy();return {createFrame(){const element=document.createElement('iframe');return {element,go(){element.src='/~/sj/p/fixture'}}}}}}});
  await page.getByRole('button',{name:'Use proxy playback',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#tube-player iframe')?.getAttribute('src')==='/~/sj/p/fixture');
  assert.equal(proxyCalls,1);
  await page.getByRole('button',{name:'Use regular playback',exact:true}).click();
  assert.match(await page.locator('#tube-player iframe').getAttribute('src'),/^https:\/\/www.youtube-nocookie.com\/embed\//);
  assert.equal(await page.locator('#tube-player iframe').count(),1);
  await page.addStyleTag({content:fs.readFileSync('Public/src/nova-music-app.css','utf8')});
  await page.evaluate(()=>{const b=document.createElement('button');b.className='nmc-play-toggle is-buffering';b.id='buffer-test';document.body.append(b)});
  assert.equal(await page.locator('#buffer-test').evaluate(n=>getComputedStyle(n,'::after').animationName),'nmc-buffer-spin');
  console.log('PASS: regular YouTube default, explicit proxy switch, switching back leaves one player, music buffering animation.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
