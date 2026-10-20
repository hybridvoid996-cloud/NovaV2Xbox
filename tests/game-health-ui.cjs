const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('C:/Users/willi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://nova.test/**',route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/search-config.js')return route.fulfill({contentType:'text/javascript',body:fs.readFileSync('Public/search-config.js')});
   if(url.pathname.startsWith('/src/'))return route.fulfill({contentType:url.pathname.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(path.join('Public',url.pathname))});
   if(url.pathname==='/library-games.json')return route.fulfill({contentType:'application/json',body:JSON.stringify([{id:882,name:'Recovery fixture',url:'/content/monkey-mart/index.html'}])});
   if(url.pathname==='/player.html')return route.fulfill({contentType:'text/html',body:fs.readFileSync('Public/player.html')});
   if(url.pathname==='/game'||url.pathname==='/content/monkey-mart/index.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><button>Play game</button><canvas></canvas><script>class TestSocket extends EventTarget{static OPEN=1;send(data){this.lastSent=data}}window.WebSocket=TestSocket;</script>'});
   return route.fulfill({contentType:'text/html',body:`<!doctype html><iframe src="/game"></iframe><script type="module">
    import {attachGameHealth} from '/src/game-health-runtime.mjs';
    window.reloads=0;window.statuses=[];
    window.startHealth=()=>{window.health?.stop();sessionStorage.clear();window.health=attachGameHealth(document.querySelector('iframe'),{key:'fixture',interval:20,reload:()=>reloads++,onStatus:(message,kind)=>statuses.push({message,kind})})};
    startHealth();window.fixtureReady=true;
   </script>`});
  });
  await page.goto('https://nova.test/');await page.waitForFunction(()=>window.fixtureReady);await page.waitForTimeout(100);
  const game=page.frameLocator('iframe');
  await game.locator('body').evaluate(()=>dispatchEvent(new ErrorEvent('error',{error:new Error('WebAssembly CompileError')})));
  await page.waitForFunction(()=>reloads===1);assert.equal(await page.evaluate(()=>statuses[0].kind),'engine');
  await page.evaluate(()=>{reloads=0;startHealth()});await page.waitForTimeout(60);
  await game.locator('body').evaluate(()=>{const loader=document.createElement('section');loader.id='loading-screen';loader.textContent='Failed to download game data';document.body.append(loader)});
  await page.waitForFunction(()=>reloads===1);assert.equal(await page.evaluate(()=>statuses.at(-1).kind),'loading');
  await game.locator('#loading-screen').evaluate(node=>node.remove());
  await page.evaluate(()=>{reloads=0;startHealth()});await page.waitForTimeout(60);
  await game.getByRole('button',{name:'Play game'}).click();
  await game.locator('body').evaluate(()=>dispatchEvent(new ErrorEvent('error',{error:new Error('WebAssembly CompileError')})));
  await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>reloads),0,'Active sessions must not reload');
  await game.locator('body').evaluate(()=>{const ws=new WebSocket('wss://game.test/socket');if(!(ws instanceof WebSocket)||WebSocket.OPEN!==1)throw Error('Socket interface changed');const bytes=new Uint8Array([1,2]);ws.send(bytes);if(ws.lastSent!==bytes)throw Error('Packet changed');ws.dispatchEvent(new Event('open'));ws.dispatchEvent(new CloseEvent('close',{code:1006}))});
  assert.equal(await page.evaluate(()=>statuses.at(-1).kind),'socket');
  const restored=await game.locator('canvas').evaluate(canvas=>{const event=new Event('webglcontextlost',{bubbles:true,cancelable:true});canvas.dispatchEvent(event);canvas.dispatchEvent(new Event('webglcontextrestored'));return event.defaultPrevented});
  assert(restored);assert.equal(await page.evaluate(()=>statuses.at(-1).kind),'restored');
  await page.evaluate(()=>health.stop());
  await page.goto('https://nova.test/player.html?id=882');await page.waitForFunction(()=>document.body.classList.contains('ready'));
  await page.waitForTimeout(600);await page.frameLocator('#stage iframe').getByRole('button',{name:'Play game'}).click();
  await page.frameLocator('#stage iframe').locator('body').evaluate(()=>dispatchEvent(new ErrorEvent('error',{error:new Error('SharedArrayBuffer is not defined')})));
  await page.locator('#nova-game-health').waitFor();assert.match(await page.locator('#nova-game-health').innerText(),/isolation support/);
  assert.deepEqual(errors,[]);
  console.log('PASS shared health handler: startup retry, active-session protection, unchanged socket packets, graphics restoration');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
