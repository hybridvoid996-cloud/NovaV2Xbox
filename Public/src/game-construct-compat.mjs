// Repair identified export defects before the proxy rewrites their JavaScript.
export async function repairConstructBase(url, response, {gameId} = {}) {
 const rocketRawScript = String(gameId) === '353' && url.hostname === 'raw.githubusercontent.com' && url.pathname.startsWith('/fork-so-the-site-i-take-wont-be-deleted/bulbasaurchat.github.io/main/games/blumgi-rocket-main/blumgi-rocket-main/') && url.pathname.endsWith('.js');
 const construct = url.pathname.endsWith('/scripts/main.js') && /(?:blumgi-rocket|catgunner|draw-the-hill)/.test(url.pathname);
 const choppy = /\/choppy(?:%20| )orc\/coffee\.js$/.test(url.pathname);
 const monster = url.pathname.endsWith('/monster-tracks/webapp/index.js');
 const runner = (String(gameId) === '573' && url.pathname.endsWith('/man-runner-2048/Build/fc45fdbdcee54ae8144d7a2834b15283.framework.js')) || (String(gameId) === '562' && url.pathname.includes('/boom-slingers-reboom/Build/') && url.pathname.endsWith('.framework.js'));
 const fear = String(gameId) === '794' && url.pathname.endsWith('/js/plugins/physical_attack_animation.js');
 const mountain = (String(gameId) === '774' && url.pathname.endsWith('/files/scripts/main.js')) || (String(gameId) === '209' && url.pathname.endsWith('/draw-the-hill/scripts/main.js'));
 const celesteBundle = String(gameId) === '623' && url.hostname === 'cdn.jsdelivr.net' && /^\/gh\/web-ports\/celeste@4f043a5ce121b74dc54ce56d74f213a2eeea6b4e\/bundle\.js$/.test(url.pathname);
 const celesteNative = String(gameId) === '623' && url.hostname === 'cdn.jsdelivr.net' && /^\/gh\/web-ports\/celeste@[^/]+\/_framework\/dotnet\.native\.[^/]+\.js$/.test(url.pathname);
 const celeste = String(gameId) === '623' && url.hostname === 'cdn.jsdelivr.net' && /^\/gh\/web-ports\/celeste@[^/]+\/_framework\/dotnet\.runtime\.[^/]+\.js$/.test(url.pathname);
 const holiday = String(gameId) === '214' && url.hostname === 'cdn.jsdelivr.net' && url.pathname === '/gh/ubg42/CutTheRopeGames@main/holiday/scripts/libraries.js';
 if (response.status !== 200 || !(rocketRawScript || construct || choppy || monster || runner || mountain || fear || holiday || celeste || celesteNative || celesteBundle)) return response;
 const source = typeof response.body === 'string' ? response.body : await new Response(response.body).text();
 let body;
 if (celesteBundle) {
  body=source.replace("const res = await fetch(url);\n      if (!res.ok) throw new Error(\"Failed to fetch: \" + url);\n\n      const buf = await res.arrayBuffer();","const buf = await (async()=>{const expected=i===29?7950231:20866662;let failure;for(let attempt=0;attempt<3;attempt++){try{const source=attempt===1?'https://raw.githubusercontent.com/web-ports/celeste/4f043a5ce121b74dc54ce56d74f213a2eeea6b4e/'+url:url;const response=await fetch(source,attempt?{cache:'reload'}:{});if(!response.ok)throw Error('Game part returned HTTP '+response.status);const bytes=await response.arrayBuffer();if(bytes.byteLength!==expected)throw Error('Game part '+(i+1)+' is incomplete ('+bytes.byteLength+' / '+expected+' bytes)');return bytes}catch(error){failure=error}}throw failure})();");
  // Blob joins the archive parts in order without a second 613 MB JS allocation.
  body=body.replace(/\/\/ Merge\r?\n\s*let totalLen = buffers\.reduce\([\s\S]*?window\.assetblob = URL\.createObjectURL\(new Blob\(\[merged\]\)\);/,"window.assetblob = URL.createObjectURL(new Blob(buffers, {type:'application/octet-stream'}));\n    buffers.length = 0;");
 } else if (celesteNative) {
  body=source.replace(/assert\(([^,\n]+)\);/g,(match,condition)=>'assert('+condition+','+JSON.stringify('Celeste native check: '+condition)+');').replace('function abort(what) {', 'function abort(what) {console.error("Celeste engine abort:",String(what));');
 } else if (celeste) {
  // Keep a valid statement body when the proxy removes debugger statements.
  body = source.replaceAll('globalThis.dotnetDebugger)debugger}', 'globalThis.dotnetDebugger){debugger;}}');
 } else if (holiday) {
  // The page already loads jQuery. Keep its plugins without initializing a
  // second obsolete copy inside the combined legacy library closure.
  const start = source.indexOf('/*! jQuery v2.0.3');
  const end = source.indexOf('}(window),function(e){', start);
  body = start >= 0 && end > start ? source.slice(0, start) + 'window.jQuery,' + source.slice(end + '}(window),'.length) : source;
 } else if (fear) {
  body = source.replace("PluginManager.parameters('CC_physicalattacks')", "PluginManager.parameters('physical_attack_animation')")
   .replace('eval(String(parameters))', "String(parameters.PhysicalAttacks ?? 'true') === 'true'")
   .replace("String(parameters).split(' ')", "String(parameters.SkillTypes || '').trim().split(/\\s+/).filter(Boolean).map(Number).filter(Number.isFinite)")
   .replace('types_weap = parseInt(types_weap);', 'types_weap[i] = Number(types_weap[i]);');
 } else if (mountain) {
  // This Construct version supports the same runtime on the main thread. Its blob module worker cannot use the proxy's classic bootstrap.
  body = source.replace('new self.RuntimeInterface({useWorker:!0,', 'new self.RuntimeInterface({useWorker:!1,baseUrl:document.baseURI,');
 } else if (runner) {
  // Older SDKs lack this optional ad UI listener; preserve registration whenever it exists.
  body = source.replaceAll('window.CrazyGames.SDK.ad.addAdblockPopupListener(', 'window.CrazyGames.SDK.ad.addAdblockPopupListener?.(');
 } else if (monster) {
  body = source.replaceAll('https://cdn.jsdelivr.net/gh/genizy/google-class/monster-tracks/', 'https://raw.githubusercontent.com/genizy/google-class/main/monster-tracks/');
 } else if (choppy) {
  // Preserve the export's fake clock even when the native timing property is read-only.
  body = source.replace('window.performance.now = function() {\n      return _gthis.fakeTime;\n    };', "Object.defineProperty(window.performance,'now',{configurable:true,value:function(){return _gthis.fakeTime;}});");
 } else {
  body = source.replace(/new (?:self\.|window\.)?RuntimeInterface\(\{/g, match => match + 'baseUrl:document.baseURI,');
 }
 const headers = response.headers.filter(([name]) => !['content-length', 'content-encoding', ...(rocketRawScript ? ['content-type'] : [])].includes(name.toLowerCase()));
 if (rocketRawScript) headers.push(['Content-Type', 'application/javascript; charset=utf-8']);
 return {...response, body, headers};
}
