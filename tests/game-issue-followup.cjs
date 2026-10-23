const fs = require('fs');
const {chromium} = require('C:/Users/willi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path = require('node:path');
const output = process.env.NOVA_REVIEW_OUTPUT || 'docs/game-audit/followup/';
(async () => {
 fs.mkdirSync(output, {recursive: true});
 const ids = (process.env.NOVA_REVIEW_IDS || '').split(',').filter(Boolean).map(Number);
 if (!ids.length || ids.some(id => !Number.isSafeInteger(id) || id < 1)) throw Error('Specify valid NOVA_REVIEW_IDS.');
 const plans = JSON.parse(process.env.NOVA_REVIEW_ACTIONS || '{}');
 const browser = await chromium.launch({channel: 'msedge', headless: true});
 try {
  for (const id of ids) {
   const page = await browser.newPage({viewport: {width: 1024, height: 640}});
   const base = process.env.NOVA_REVIEW_BASE || 'http://127.0.0.1:8791';
   const replacements = JSON.parse(process.env.NOVA_REVIEW_FILES || '[]');
   for (const relative of replacements) {
    const root = path.resolve('Public');
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) throw Error('Test substitutions must be public Nova files');
    await page.route(base + '/' + relative + '*', route => {
     let body = fs.readFileSync(file);
     if (process.env.NOVA_REVIEW_YT_HOST === '1' && relative.endsWith('.html')) {
      body = body.toString().replace(/(<script\b[^>]*src=")https:\/\/nova-content\.invalid\/content\/runtime\/nova-ytgame\.js(?:\?[^" ]*)?"/,
       '$1https://nova-content.invalid/content/runtime/nova-ytgame.js?v=20261021-bolt248" data-nova-playable-host="true"');
     }
     return route.fulfill({contentType: relative.endsWith('.html') ? 'text/html' : 'text/javascript', headers: {'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'credentialless'}, body});
    });
   }
   if(process.env.NOVA_REVIEW_LOGS==='1')await page.addInitScript(()=>addEventListener('error',event=>{const e=event.error;if(e)console.log('NOVA_RUNTIME_EXCEPTION '+JSON.stringify({name:e.name,status:e.status,message:e.message,stack:e.stack}))}));
   const errors = [], failures = [], requests = [], consoleErrors = [], frames = [], pending = new Set(), logs = [];
   const actions = plans[id] || [];
   let autoStarted;
   let testError;
   page.on('pageerror', e => errors.push({message: e.message, stack: e.stack?.slice(0, 1200)}));
   page.on('request', r => pending.add(r));
   page.on('requestfinished', r => pending.delete(r));
   page.on('requestfailed', r => pending.delete(r));
   page.on('requestfailed', r => requests.push({url: r.url(), error: r.failure()?.errorText}));
   page.on('response', r => {if (r.status() >= 400) failures.push({status: r.status(), url: r.url()});});
   page.on('console', m => {if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 1000));if(process.env.NOVA_REVIEW_LOGS==='1'&&!m.text().includes('unrewriteUrl')&&logs.length<500)logs.push({type:m.type(),text:m.text().slice(0,1000)})});
   try {
    await page.goto(base + '/player.html?kind=game&id=' + id, {waitUntil: 'domcontentloaded', timeout: 60000});
    if(process.env.NOVA_REVIEW_GESTURE==='1'){await page.waitForTimeout(2000);await page.mouse.click(512,320)}
    if(process.env.NOVA_REVIEW_AUTO_START==='1')await page.waitForTimeout(2000);
    if(process.env.NOVA_REVIEW_AUTO_START==='1'){
     for(const frame of page.frames().slice(1)){
      const text=await frame.locator('body').innerText({timeout:3000}).catch(()=>'');
      if(/accept.*terms|terms and conditions|I agree/i.test(text))continue;
      const buttons=frame.getByRole('button',{name:/^(Play|Start|Start game|New game)$/i});
      for(let n=0;n<await buttons.count();n++)if(await buttons.nth(n).isVisible()&&await buttons.nth(n).isEnabled()){
       autoStarted=await buttons.nth(n).innerText();await buttons.nth(n).click({timeout:5000});break;
      }
      if(autoStarted)break;
     }
    }
    await page.waitForTimeout(Number(process.env.NOVA_REVIEW_WAIT_MS) || 30000);
    await page.screenshot({path:output+id+'-startup.png',timeout:10000}).catch(()=>{});
    for (const action of actions) { await page.bringToFront();
     if (action.selector) await page.frameLocator('iframe').locator(action.selector).click({timeout:30000});
     if (action.button) await page.frameLocator('iframe').getByRole('button', {name: action.button, exact: true}).click({timeout: 15000});
     if (action.click) await page.mouse.click(...action.click, {delay: 150});
     if (action.move) await page.mouse.move(...action.move);
     if (action.pointerDown) {await page.mouse.move(...action.pointerDown);await page.mouse.down();}
     if (action.pointerUp) await page.mouse.up();
     if (action.drag) {
      await page.mouse.move(...action.drag[0]); await page.mouse.down();
      await page.mouse.move(...action.drag[1], {steps: 20}); await page.mouse.up();
     }
     if (action.key) await page.keyboard.press(action.key, {delay: 150});
     if (action.down) await page.keyboard.down(action.down);
     if (action.up) await page.keyboard.up(action.up);
     if (action.wait) await page.waitForTimeout(action.wait);
     if (action.shot && /^[a-z0-9-]+$/i.test(action.shot)) await page.screenshot({path: output + id + '-' + action.shot + '.png'});
    }
   } catch (error) {
    // Keep the failure visible and continue the list; a timed-out game is never a pass.
    testError = String(error.message).slice(0, 1200);
   } finally {
    for (const frame of page.frames()) {
     try {frames.push(await Promise.race([frame.evaluate(() => ({url: location.href, text: document.body?.innerText?.slice(0, 800), canvas: document.querySelectorAll('canvas').length, ready: document.readyState})),new Promise((_,reject)=>setTimeout(()=>reject(Error('Game frame stopped responding')),5000))]));} catch(error) {testError ||= String(error.message).slice(0,1200);}
    }
    const result = {id, actions, autoStarted, testError, frames, errors, failures, requests, consoleErrors, pendingRequests:[...pending].map(r=>r.url()), ...(logs.length?{logs}:{})};
    fs.writeFileSync(output + id + '.json', JSON.stringify(result, null, 2));
    try {await page.screenshot({path: output + id + '.png', timeout: 10000});} catch {}
    console.log(id, JSON.stringify({testError, errors: errors.map(e => e.message), failed: failures.length}));
    await page.close();
   }
  }
 } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
