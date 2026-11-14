const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/willi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const {brandMovieResponse}=await import('../Public/src/movie-proxy-brand.mjs');
 const b=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const mode of ['nested','messages']){
   const page=await b.newPage({viewport:{width:1366,height:768}}),errors=[];await page.route('https://nova.test/**',r=>{const u=new URL(r.request().url()),f=path.join(process.cwd(),'Public',u.pathname);if(!fs.existsSync(f)||!fs.statSync(f).isFile())return r.fulfill({status:404,body:''});return r.fulfill({body:fs.readFileSync(f),contentType:/\.(?:js|mjs)$/.test(f)?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'image/png'})});
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log(m.text().slice(0,200))});
   await page.addInitScript(()=>{window.novaHomeProfile={name:'Playback test'};window.launches=[]});
   await page.route('**/src/connection.js?*',r=>r.fulfill({contentType:'text/javascript',body:`window.NovaConnection={async create(options){return {options}},async ensure(prepared){return {createFrame(){const element=document.createElement('iframe');element.style.cssText='width:100%;height:480px;border:0';${mode==='messages'?"Object.defineProperty(element,'contentDocument',{get(){return null}});":''}return {element,go(url){window.launches.push(url);element.src='/~/sj/p/fixture?token='+prepared.options.movieSession}}}}}};`}));
   await page.route('**/api/movies?*',r=>{
    const u=new URL(r.request().url()),item={id:'21',type:'anime',title:'One Piece',episodes:2,year:'1999',seasons:[{number:1,episodeCount:2}],animePlayers:[{provider:'anipm',id:'21',path:'/ani/one-piece-21-gjovxa'}]};
    const op=u.searchParams.get('op');return r.fulfill({json:op==='details'?item:op==='search'?{results:[]}:{rails:{popular_anime:{results:[item]},trending_anime:{results:[item]}}}});
   });
   await page.route('**/~/sj/p/fixture?*',async r=>{
    const token=new URL(r.request().url()).searchParams.get('token');
    if(mode==='messages')return r.fulfill({headers:{'Cross-Origin-Embedder-Policy':'credentialless'},contentType:'text/html',body:`<main>Player</main><script>let time=1;setInterval(()=>parent.postMessage({$scramjet$messagetype:'window',$scramjet$origin:'https://provider.example',$scramjet$data:{novaAction:'novaMovieTime',token:${JSON.stringify(token)},currentTime:time++,duration:1200}},'*'),100);setTimeout(()=>parent.postMessage({novaAction:'novaMovieError',token:${JSON.stringify(token)}},'*'),400);</script>`});
    const raw='<html><head></head><body><video style="width:1200px;height:700px"></video><iframe src="/movie-video?token='+token+'" style="position:fixed;inset:0;width:480px;height:270px"></iframe></body></html>';
    const out=await brandMovieResponse({status:200,headers:[['content-type','text/html']],body:raw},{session:token});
    return r.fulfill({headers:{'Cross-Origin-Embedder-Policy':'credentialless'},contentType:'text/html',body:out.body});
   });
   await page.route('**/movie-video?*',async r=>{
    const token=new URL(r.request().url()).searchParams.get('token');
    const raw='<html><head></head><body><video muted autoplay style="width:480px;height:270px"></video><script>const c=document.createElement("canvas");c.width=480;c.height=270;const g=c.getContext("2d");setInterval(()=>{g.fillStyle="navy";g.fillRect(0,0,480,270);g.fillStyle="white";g.fillText(String(Date.now()),30,40)},50);document.querySelector("video").srcObject=c.captureStream(20);document.querySelector("video").play();</script></body></html>';
    const out=await brandMovieResponse({status:200,headers:[['content-type','text/html']],body:raw},{session:token});return r.fulfill({headers:{'Cross-Origin-Embedder-Policy':'credentialless'},contentType:'text/html',body:out.body});
   });
   await page.goto('https://nova.test/novamovies.html');
   await page.locator('#movie-profile-select').click();
   await page.getByRole('button',{name:'Anime',exact:true}).click();
   await page.locator('.cinema-card').first().click();
   await page.getByRole('button',{name:/Watch S1 E1/}).click();
   try{await page.waitForFunction(()=>document.querySelector('#loading').hidden&&window.launches.length===1,null,{timeout:15000})}catch(e){console.log({mode,errors,state:await page.evaluate(()=>({launches,status:document.querySelector('#status').textContent,loading:document.querySelector('#loading').hidden,frames:[...document.querySelectorAll('iframe')].map(f=>({src:f.src,html:f.contentDocument?.body?.innerHTML?.slice(0,120)}))}))});await page.screenshot({path:'artifacts/movie-browser-failed.png'});throw e}
   if(mode==='messages'){await page.clock.install();await page.clock.fastForward(65000);assert.equal(await page.locator('#loading').isVisible(),false);assert.equal(await page.evaluate(()=>launches.length),1)}
   await page.screenshot({path:'artifacts/movie-loader-'+mode+'.png'});
   assert.deepEqual(errors,[]);console.log('PASS '+mode+': loader hidden, working player retained');await page.close();
  }
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
