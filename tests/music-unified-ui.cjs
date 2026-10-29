const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/willi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const {createMusicProviderHandler}=await import('../server/music-providers.mjs');
 const song={title:'Rock with You',artist:'Michael Jackson',duration:219};
 const release={title:'Off the Wall',artist:song.artist,kind:'album',count:10,releaseDate:new Date(Date.now()-86400000).toISOString()};
 const catalog=src=>({tracks:[{...song,id:src+':1'}],artists:[{id:src+':3',title:song.artist,kind:'artist',verified:src==='sc',followers:100}],releases:[{...release,id:src+':2',thumb:src==='void'?'/api/soundcloud?op=void-art&token=broken':'https://i1.sndcdn.com/good.png'}]});
 const handler=createMusicProviderHandler({service:{catalog:async()=>catalog('sc'),artist:async()=>({artist:catalog('sc').artists[0],tracks:catalog('sc').tracks,releases:[]})},noah:{catalog:async()=>catalog('noah')},alternative:{catalog:async()=>catalog('void'),album:async()=>({release:{...release,id:'void:2'},tracks:[{...song,id:'void:1'},{...song,id:'void:4',title:'Second track'}]})}});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];await page.addInitScript(()=>localStorage.setItem('nova_music_recent',JSON.stringify([{id:'void:1',title:'Recent song',artist:'Michael Jackson',duration:219}])));page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='music.test')return route.abort();
   if(u.pathname==='/api/soundcloud'&&u.searchParams.get('op')==='asset')return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=','base64')});if(u.pathname==='/api/soundcloud'&&u.searchParams.get('op')==='void-art')return route.fulfill({status:404,body:''});if(u.pathname==='/api/soundcloud'){const res={setHeader(){},end(body){this.body=body}};await handler({method:'GET',url:u.pathname+u.search},res);return route.fulfill({status:res.statusCode,contentType:'application/json',body:res.body})}
   if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:`<html><head><link rel="stylesheet" href="/src/nova-music-app.css"></head><body style="margin:0;height:100vh;background:#080809"><div id="app"></div><script type="module">import {createNovaMusicApp} from '/src/nova-music-app.mjs';import {NovaMusicService} from '/src/nova-music-service.mjs';window.app=await createNovaMusicApp({host:document.querySelector('#app'),service:new NovaMusicService({requestMusic:async()=>({library:{liked:[],playlists:{}}})})});</script></body></html>`});
   const path='Public'+u.pathname;if(fs.existsSync(path)&&fs.statSync(path).isFile())return route.fulfill({body:fs.readFileSync(path),contentType:/\.(mjs|js)$/.test(path)?'text/javascript':path.endsWith('.css')?'text/css':'image/png'});return route.fulfill({status:404,body:''});
  });
  await page.goto('https://music.test/');await page.waitForFunction(()=>!!window.app);
  await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
  await page.waitForTimeout(280);assert.equal(await page.locator('.nmc-sidebar').evaluate(e=>Math.round(e.getBoundingClientRect().width)),64);
  await page.getByRole('button',{name:'Expand sidebar',exact:true}).click();
  await page.locator('.nmc-content').click({position:{x:15,y:15}});assert(await page.locator('.nmc').evaluate(e=>e.classList.contains('nmc-compact-sidebar')));
  await page.setViewportSize({width:1100,height:720});await page.getByRole('button',{name:'Show now playing',exact:true}).click();
  await page.waitForTimeout(350);const layout=await page.evaluate(()=>{const c=document.querySelector('.nmc-content').getBoundingClientRect(),r=document.querySelector('.nmc-right').getBoundingClientRect();return {overlap:c.right>r.left+1,right:r.right,width:innerWidth}});assert.equal(layout.overlap,false);assert(layout.right<=layout.width);
  await page.setViewportSize({width:1366,height:900});
  const search=page.getByRole('combobox');await search.fill('Rock with U');await search.press('Enter');await page.locator('.nmc-catalog-summary').waitFor();
  assert.equal(await page.locator('.nmc-results .nmc-track-row').count(),1);assert.equal(await page.locator('.nmc-results .nmc-source-badge').textContent(),'3 sources');assert.equal(await page.locator('.nmc-catalog-source').count(),3);
  await page.getByRole('button',{name:'Albums',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Open Off the Wall',exact:true}).count(),1);assert.equal(await page.locator('.nmc-results .nmc-release-new').textContent(),'NEW');await page.waitForFunction(()=>{const img=document.querySelector('.nmc-results .nmc-track-card img');return img?.complete&&img.naturalWidth>0&&img.src.includes('op=asset')});
  await page.getByRole('button',{name:'Open Off the Wall',exact:true}).click();await page.locator('.nmc-provider-hero h1').waitFor();assert.equal(await page.locator('.nmc-track-row').count(),2);assert.equal(await page.locator('.nmc-provider-hero .nmc-artist-label').textContent(),'Off the Wall');
  await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:'Artists',exact:true}).click();await page.getByRole('button',{name:'Open Michael Jackson',exact:true}).click();await page.locator('.nmc-provider-hero.is-artist').waitFor();assert.equal(await page.getByRole('button',{name:'Open Off the Wall',exact:true}).count(),1);assert.equal(await page.locator('.nmc-track-row').count(),1);
  await page.getByRole('button',{name:/Release notifications/}).click();await page.locator('.nmc-release-update').waitFor();assert.equal(await page.locator('.nmc-release-update').count(),1);assert.match(await page.locator('.nmc-release-update').textContent(),/Michael Jackson released an album/);assert.equal(await page.locator('.nmc-release-count').isVisible(),false);assert.equal(await page.locator('dialog[open]').count(),0);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.nmc-release-dropdown').count(),0);
  await page.getByRole('button',{name:/Release notifications/}).click();await page.locator('.nmc-provider-hero .nmc-artist-label').click();assert.equal(await page.locator('.nmc-release-dropdown').count(),0);
  await page.getByRole('button',{name:/Release notifications/}).click();await page.locator('.nmc-release-update').click();await page.locator('.nmc-provider-hero').waitFor();
  assert.deepEqual(errors,[]);await page.evaluate(()=>window.app.dispose());console.log('PASS: one merged song, three sources, one album card, complete album and artist pages, alternate cover loads, NEW badge and readable release notifications.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
