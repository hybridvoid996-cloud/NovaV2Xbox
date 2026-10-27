import test from 'node:test';
import assert from 'node:assert/strict';
import {musicJSON} from '../Public/src/music-json.mjs';
import {musicPlayerPageError} from '../Public/src/music-player-page-error.mjs';

test('playback metadata retries a deployment HTML page without exposing its markup',async()=>{
 let calls=0;const data=await musicJSON(async()=>++calls===1?new Response('<h1>404: NOT_FOUND</h1>',{status:404,headers:{'content-type':'text/html'}}):Response.json({found:true}),'/api/soundcloud?op=fallback');
 assert.equal(calls,2);assert.equal(data.found,true);
});
test('permanent HTML failures stop, and restricted requests are not retried',async()=>{
 for(const status of [404,403]){let calls=0;await assert.rejects(()=>musicJSON(async()=>{calls++;return new Response('<html>private</html>',{status,headers:{'content-type':'text/html'}})},'/api/soundcloud'),e=>e.status===status&&!e.message.includes('<html>'));assert.equal(calls,status===404?2:1)}
});
test('a successful alternative cancels further primary metadata retries',async()=>{
 let calls=0;await assert.rejects(()=>musicJSON(async()=>{calls++;throw Error('Primary connection failed')},'/api/soundcloud',{shouldRetry:()=>false}));assert.equal(calls,1);
});
test('music frame errors identify Vercel pages without mistaking song titles for errors',()=>{
 assert.equal(musicPlayerPageError({title:'404: NOT_FOUND',body:{textContent:'Code: NOT_FOUND'}}),true);
 assert.equal(musicPlayerPageError({title:'Error',body:{textContent:'DEPLOYMENT_NOT_FOUND'}}),true);
 assert.equal(musicPlayerPageError({title:'404 — Artist',body:{textContent:'Play this song'}}),false);
 assert.equal(musicPlayerPageError(null),false);
});
