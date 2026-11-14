import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {ROBLOX_LAUNCHER,launchURL,robloxLauncherResponse} from '../Public/src/roblox-launcher-compat.mjs';
import {robloxLaunchMessage} from '../Public/src/roblox-launcher-compat.mjs';
import {launcherLoginHTML} from '../Public/src/roblox-launcher-compat.mjs';
test('successful provider sign-in returns to Roblox without altering password or OTP requests',()=>{
 const body="fetch('/api/user', { credentials: 'include' }); await apiCall('/api/login/verify', { identifier: cU, code: c }); function finishAuth() { window.location.replace(isEmbedded ? '/assets/applications/datapacks/profile/' : '/assets/applications/datapacks/profile/'); }";
 const fixed=launcherLoginHTML(new URL('https://321.tb2.net/assets/applications/datapacks/register/'),body);
 assert(fixed.includes(JSON.stringify(ROBLOX_LAUNCHER)));assert(fixed.includes("credentials: 'include'"));assert(fixed.includes("apiCall('/api/login/verify', { identifier: cU, code: c })"));
 assert.equal(launcherLoginHTML(new URL('https://example.com/assets/applications/datapacks/register/'),body),body);
});
test('login response cookies remain intact for Scramjet session handling',async()=>{
 const cookie='fixture_session=test-only; Path=/; Secure; HttpOnly; SameSite=Lax';
 const input={...response,headers:[...response.headers,['Set-Cookie',cookie]]};
 const output=await robloxLauncherResponse(new URL('https://321.tb2.net/assets/applications/datapacks/register/'),input,{token:'fixture'});
 assert.equal(output.headers.find(([name])=>name==='Set-Cookie')[1],cookie);
});
test('Scramjet launch messages keep exact source and session checks',()=>{const source={},data={token:'launch',novaAction:'robloxLaunch',url:'https://example.com/play'},wrapped={$scramjet$messagetype:'window',$scramjet$data:data};assert.equal(robloxLaunchMessage({source,data:wrapped},source,'launch'),data.url);assert.equal(robloxLaunchMessage({source:{},data:wrapped},source,'launch'),null);assert.equal(robloxLaunchMessage({source,data:wrapped},source,'old'),null)});
const response={status:200,statusText:'OK',body:'<html><head><title>Home</title></head><body></body></html>',headers:[['Content-Type','text/html'],['Content-Length','55'],['Content-Encoding','gzip']]};
test('launch URLs accept web pages and reject script, credential and app-scheme popups',()=>{assert.equal(launchURL('/game',ROBLOX_LAUNCHER),'https://321.tb2.net/game');for(const u of ['javascript:alert(1)','data:text/html,a','roblox://play','https://name:password@example.com/'])assert.equal(launchURL(u),null)});
test('styling is scoped to the launcher and preserves non-HTML and authentication failures',async()=>{const result=await robloxLauncherResponse(new URL(ROBLOX_LAUNCHER),response,{token:'test'});assert.match(result.body,/Nova Roblox/);assert.match(result.body,/data-nova-roblox/);assert.equal(result.headers.length,1);for(const url of ['https://example.com/','https://321.tb2.net/api/user'])assert.equal(await robloxLauncherResponse(new URL(url),response),response);const denied={...response,status:401};assert.equal(await robloxLauncherResponse(new URL(ROBLOX_LAUNCHER),denied),denied)});
test('popup bridge handles immediate URLs and delayed blank-window navigation without a real popup',async()=>{const result=await robloxLauncherResponse(new URL(ROBLOX_LAUNCHER),response,{token:'private-test'});const script=result.body.match(/<script>([\s\S]*?)<\/script>/)[1],messages=[];const window={};const doc={title:'Home · TGLSC',querySelector:()=>null,addEventListener(){}};vm.runInNewContext(script,{window,parent:{postMessage:d=>messages.push(d)},document:doc,location:{pathname:'/assets/applications/content/tglscrblx/index2.html'},addEventListener(){}});window.open('https://example.com/game');assert.equal(messages[0].url,'https://example.com/game');assert.equal(messages[0].token,'private-test');const popup=window.open('about:blank');assert.equal(messages.length,1);popup.location.href='https://example.com/play';assert.equal(messages[1].url,'https://example.com/play');popup.close();assert.equal(popup.closed,true)});
