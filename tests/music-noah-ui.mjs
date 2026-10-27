import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createSoundCloudHandler} from '../server/soundcloud-service.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/willi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve('Public'),dir='docs/music-noah-check';fs.mkdirSync(dir,{recursive:true});
const requests=[];
const handler=createSoundCloudHandler({request:async(url,options)=>{
 const u=new URL(url);
 // Force primary/Void outages in this isolated test, while Noah and its media
 // use their actual public network responses. No signed-in session is involved.
 if(['soundcloud.com','api-v2.soundcloud.com','vng.lol'].includes(u.hostname))throw Error('Simulated provider outage');
 return fetch(url,options);
}});
const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/src/nova-music-app.css?v=20261021-provider242"><style>html,body{margin:0;height:100%;background:#080809}</style></head><body><div id="music"></div><script type="module">
import {createNovaMusicApp} from '/src/nova-music-app.mjs?v=20261022-noah251';
import {NovaMusicService} from '/src/nova-music-service.mjs';
const song={id:'void:99999999999',title:'ODESZA - How Did I Get Here',artist:'ODESZA',duration:128,thumb:''};
const service=new NovaMusicService({requestMusic:async action=>{if(action==='library')return {library:{liked:[song],playlists:{}}};throw Error('Test library is read-only.')}});
window.testApp=await createNovaMusicApp({host:document.getElementById('music'),service,profile:()=>({name:'Playback check'})});
window.testApp.engine.audio.muted=true;
</script></body></html>`;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://local');
 if(url.pathname==='/api/soundcloud'){requests.push({op:url.searchParams.get('op'),exclude:url.searchParams.get('exclude')});handler(req,res);return;}
 if(url.pathname==='/noah-test'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;res.end();return;}
 res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser,page;const errors=[];
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 page=await browser.newPage({viewport:{width:1366,height:768}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/noah-test');
 await page.getByRole('button',{name:'Liked Songs',exact:true}).click();
 await page.locator('.nmc-track-row .nmc-track-name').filter({hasText:'ODESZA - How Did I Get Here'}).click();
 await page.waitForFunction(()=>window.testApp.engine.snapshot.provider==='noah'&&window.testApp.engine.snapshot.playing&&window.testApp.engine.snapshot.position>1,{},{timeout:45000});
 assert.ok(requests.some(r=>r.op==='fallback'&&r.exclude==='void'));
 // Seek beyond the first one-megabyte relay chunk and require decoded playback,
 // not merely a changed currentTime property.
 await page.evaluate(()=>window.testApp.command('seek',100));
 await page.waitForFunction(()=>window.testApp.engine.audio.readyState>=3&&window.testApp.engine.snapshot.playing&&window.testApp.engine.snapshot.position>100.3,{},{timeout:15000});
 await page.evaluate(()=>window.testApp.command('seek',35));
 await page.waitForFunction(()=>window.testApp.engine.snapshot.position>=35&&window.testApp.engine.snapshot.position<45,{},{timeout:15000});
 await page.getByRole('button',{name:'Pause music',exact:true}).click();
 const paused=await page.evaluate(()=>window.testApp.engine.snapshot);assert.equal(paused.playing,false);assert.equal(paused.track.id,'void:99999999999');
 await page.getByRole('button',{name:'Play music',exact:true}).click();
 await page.waitForFunction(()=>window.testApp.engine.snapshot.playing);
 await page.screenshot({path:dir+'/playback.png'});
 const input=page.getByRole('combobox',{name:'Search music',exact:true});await input.fill('ODESZA');await input.press('Enter');
 await page.locator('.nmc-results .nmc-track-card').filter({hasText:'Noah collection'}).first().click({timeout:20000});
 await page.locator('.nmc-provider-hero').filter({hasText:'NOAH SEARCH COLLECTION'}).waitFor();
 await page.waitForTimeout(400);
 await page.screenshot({path:dir+'/collection.png'});
 await page.getByRole('button',{name:'Back',exact:true}).click();
 await page.locator('.nmc-results .nmc-artist-card').first().click();
 await page.locator('.nmc-provider-hero').filter({hasText:'NOAH ARTIST'}).waitFor();
 await page.waitForTimeout(400);
 await page.screenshot({path:dir+'/artist.png'});
 assert.deepEqual(errors,[]);
 const snapshot=await page.evaluate(()=>({provider:window.testApp.engine.snapshot.provider,playing:window.testApp.engine.snapshot.playing,position:window.testApp.engine.snapshot.position,title:document.querySelector('.nmc-provider-hero h1')?.textContent,source:document.querySelector('.nmc-source')?.textContent}));
 fs.writeFileSync(dir+'/result.json',JSON.stringify({snapshot,errors,requests},null,2));console.log(JSON.stringify(snapshot));
 await page.evaluate(()=>window.testApp.dispose());
}catch(error){
 await page?.screenshot({path:dir+'/failed.png'}).catch(()=>{});
 fs.writeFileSync(dir+'/failed.json',JSON.stringify({errors,text:await page?.locator('body').innerText().catch(()=>''),message:error.message},null,2));
 throw error;
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
