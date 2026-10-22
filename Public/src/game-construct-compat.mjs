// Repair identified export defects before the proxy rewrites their JavaScript.
export async function repairConstructBase(url, response, {gameId} = {}) {
 const construct = url.pathname.endsWith('/scripts/main.js') && /(?:blumgi-rocket|catgunner|draw-the-hill)/.test(url.pathname);
 const choppy = /\/choppy(?:%20| )orc\/coffee\.js$/.test(url.pathname);
 const monster = url.pathname.endsWith('/monster-tracks/webapp/index.js');
 const runner = (String(gameId) === '573' && url.pathname.endsWith('/man-runner-2048/Build/fc45fdbdcee54ae8144d7a2834b15283.framework.js')) || (String(gameId) === '562' && url.pathname.includes('/boom-slingers-reboom/Build/') && url.pathname.endsWith('.framework.js'));
 const fear = String(gameId) === '794' && url.pathname.endsWith('/js/plugins/physical_attack_animation.js');
 const mountain = (String(gameId) === '774' && url.pathname.endsWith('/files/scripts/main.js')) || (String(gameId) === '209' && url.pathname.endsWith('/draw-the-hill/scripts/main.js'));
 const holiday = String(gameId) === '214' && url.hostname === 'cdn.jsdelivr.net' && url.pathname === '/gh/ubg42/CutTheRopeGames@main/holiday/scripts/libraries.js';
 if (response.status !== 200 || !(construct || choppy || monster || runner || mountain || fear || holiday)) return response;
 const source = typeof response.body === 'string' ? response.body : await new Response(response.body).text();
 let body;
 if (holiday) {
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
 return {...response, body, headers: response.headers.filter(([name]) => !['content-length', 'content-encoding'].includes(name.toLowerCase()))};
}
