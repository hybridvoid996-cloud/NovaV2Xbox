import test from 'node:test';
import assert from 'node:assert/strict';
import {musicWidgetResponse} from '../Public/src/nova-music-widget-compat.mjs';
const response=body=>({body,headers:[['Content-Type','text/javascript'],['Content-Length','99'],['Content-Encoding','gzip']],status:200,statusText:'OK'});
test('proxied widget messages preserve their caller realm in both directions',async()=>{
 for(const [url,before,after] of [
  ['https://w.soundcloud.com/player/api.js','i.postMessage(o,r)','i.postMessage(o,r,[])'],
  ['https://widget.sndcdn.com/widget-9-ea080f8e5212.js','o.postMessage(r,"*")','o.postMessage(r,"*",[])']
 ]){const result=await musicWidgetResponse(new URL(url),response('prefix;'+before+';suffix'));assert.equal(result.body,'prefix;'+after+';suffix');assert.deepEqual(result.headers,[['Content-Type','text/javascript']])}
});
test('music compatibility leaves other sites, media and error responses untouched',async()=>{
 for(const url of ['https://evil.test/player/api.js','https://w.soundcloud.com/other.js','https://media.sndcdn.com/song.mp3']){const original=response('original');assert.equal(await musicWidgetResponse(new URL(url),original),original)}
 const denied={...response('denied'),status:403};assert.equal(await musicWidgetResponse(new URL('https://w.soundcloud.com/player/api.js'),denied),denied);
});
test('new provider bundles with no matching call remain valid and unchanged',async()=>{const result=await musicWidgetResponse(new URL('https://widget.sndcdn.com/widget-1-ab12.js'),response('other();'));assert.equal(result.body,'other();')});
