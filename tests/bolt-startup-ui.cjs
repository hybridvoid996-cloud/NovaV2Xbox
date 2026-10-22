// Exercise the hosted proxy with only the proposed Bolt files substituted locally.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {chromium} = require('C:/Users/willi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
 const browser = await chromium.launch({channel: 'msedge', headless: true});
 try {
  const page = await browser.newPage({viewport: {width: 1280, height: 720}});
  const errors = [], replaced = [];
  for (const file of ['content/games/663.html', 'content/runtime/nova-ytgame.js']) {
   await page.route('https://novaoffical.vercel.app/' + file + '*', route => {
    replaced.push(file);
    return route.fulfill({contentType: file.endsWith('.html') ? 'text/html' : 'text/javascript', body: fs.readFileSync('Public/' + file)});
   });
  }
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('https://novaoffical.vercel.app/player.html?kind=game&id=663', {waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(55000);
  const dir = 'docs/game-audit/';
  await page.screenshot({path: dir + 'bolt-fixed-startup.png'});
  // Match the two visible blue screws, then rotate the tutorial object.
  await page.mouse.click(701, 378, {delay: 150});
  await page.waitForTimeout(1300);
  await page.mouse.click(571, 378, {delay: 150});
  await page.waitForTimeout(1300);
  await page.mouse.move(620, 350);
  await page.mouse.down();
  await page.mouse.move(760, 350, {steps: 24});
  await page.mouse.up();
  await page.waitForTimeout(3000);
  await page.screenshot({path: dir + 'bolt-fixed-playing.png'});
  fs.writeFileSync(dir + 'bolt-fixed-result.json', JSON.stringify({replaced, errors, published: false}, null, 2));
  assert.equal(new Set(replaced).size, 2, 'Both proposed files must be tested');
  assert.deepEqual(errors, []);
  console.log('Hosted Bolt startup and tutorial inputs completed without page exceptions; inspect screenshots for gameplay.');
 } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
