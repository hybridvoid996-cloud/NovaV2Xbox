// Development-only parser diagnostics in a fresh, unauthenticated browser.
const fs=require('node:fs');
const {chromium}=require('C:/Users/willi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const id=Number(process.env.NOVA_PARSE_ID||623);
 if(!Number.isSafeInteger(id)||id<1)throw Error('Invalid game ID');
 const dir='docs/game-audit/parse-'+id+'/';fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  const session=await page.context().newCDPSession(page);
  const failed=[],errors=[];
  await session.send('Debugger.enable');
  session.on('Debugger.scriptFailedToParse',async event=>{
   if(failed.length>=8)return;
   const index=failed.length;failed.push({url:event.url,line:event.startLine,scriptId:event.scriptId});
   try{const {scriptSource}=await session.send('Debugger.getScriptSource',{scriptId:event.scriptId});fs.writeFileSync(dir+'failed-'+index+'.js',scriptSource);}catch{}
  });
  page.on('pageerror',error=>errors.push({message:error.message,stack:error.stack}));
  await page.goto('https://novaoffical.vercel.app/player.html?kind=game&id='+id,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(45000);
  fs.writeFileSync(dir+'result.json',JSON.stringify({failed,errors},null,2));
  await page.screenshot({path:dir+'screen.png'});
  console.log(JSON.stringify({failed,errors:errors.map(x=>x.message)}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
