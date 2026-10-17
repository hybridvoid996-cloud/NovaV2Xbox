import test from 'node:test';import assert from 'node:assert/strict';
import {alternativeMatch,createAlternativeMusic} from '../server/music-alternative.mjs';
const input={title:'How Did I Get Here',artist:'ODESZA',duration:127.63},candidate={id:'2873523942',title:'How Did I Get Here',artist:'Odesza',duration:131};
test('alternative requires matching recording title, artist and duration',()=>{assert.equal(alternativeMatch(input,candidate),true);for(const patch of [{artist:'Cover Artist'},{title:'How Did I Get Here (Remix)'},{duration:300},{id:'../private'}])assert.equal(alternativeMatch(input,{...candidate,...patch}),false);assert.equal(alternativeMatch({title:'Sorry bout that [prod. Trgc x Sharkboy]',artist:'Yeat',duration:182},{id:123,title:'Sorry bout that',artist:'Yeat',duration:186}),true)});
test('lookup is bounded, deduplicated and returns only a fixed same-origin audio URL',async()=>{let count=0;const service=createAlternativeMusic({request:async url=>{count++;assert.equal(url.origin,'https://oda-loves-vng.renaca.com');assert.equal(url.pathname,'/~a/api/search');return Response.json({tracks:[{...candidate,artist:'Other'},candidate]})}});const [a,b]=await Promise.all([service.find(input.title,input.artist,input.duration),service.find(input.title,input.artist,input.duration)]);assert.equal(count,1);assert.deepEqual(a,b);assert.equal(a.url,'/api/soundcloud?op=alternate-audio&id=2873523942');await assert.rejects(service.find('',input.artist,127),/required/)});
test('unmatched songs do not silently substitute another recording',async()=>{const service=createAlternativeMusic({request:async()=>Response.json({tracks:[{...candidate,title:'Another song'}]})});assert.deepEqual(await service.find(input.title,input.artist,input.duration),{found:false})});
test('audio relay validates IDs before requests and forwards only valid byte ranges',async()=>{const seen=[];const service=createAlternativeMusic({request:async(url,options)=>{seen.push({url,options});return new Response(null,{status:206,headers:{'content-type':'audio/mpeg','content-range':'bytes 0-1023/9999','accept-ranges':'bytes'}})}});const headers={},res={setHeader:(k,v)=>headers[k]=v,end(){}};await assert.rejects(service.audio({method:'HEAD'},res,'https://evil.test'),/Invalid/);assert.equal(seen.length,0);await service.audio({method:'HEAD',headers:{range:'bytes=0-1023'}},res,'123');assert.equal(seen[0].url.href,'https://oda-loves-vng.renaca.com/~a/stream/123');assert.equal(seen[0].options.headers.Range,'bytes=0-1023');assert.equal(headers['content-range'],'bytes 0-1023/9999');assert.equal(res.statusCode,206)});
test('the relay rejects upstream HTML or JSON instead of presenting it as audio',async()=>{const service=createAlternativeMusic({request:async()=>Response.json({error:'unavailable'})});await assert.rejects(service.audio({method:'GET',headers:{}},{},'123'),/unavailable/)});
test('preview search stays on Voidify and rejects unsafe track IDs and cover tokens',async()=>{const seen=[];const service=createAlternativeMusic({request:async url=>{seen.push(url);return Response.json({tracks:[{id:'123',title:'Song',artist:'Artist',duration:120,art:'safe_token'},{id:'../bad',title:'Bad',artist:'Other'}]})}});const result=await service.search('Artist');assert.equal(seen[0].origin,'https://oda-loves-vng.renaca.com');assert.equal(result.tracks.length,1);assert.equal(result.tracks[0].id,'123');await assert.rejects(service.search(''),/search/);await assert.rejects(service.art({method:'GET'},{},'https://evil.test/image'),/Invalid/)});

test('main fallback finds album-only recordings, caches metadata and ignores unsafe or other-artist albums',async()=>{
 const seen=[];const service=createAlternativeMusic({request:async url=>{
  seen.push(url.pathname+url.search);
  if(url.pathname==='/~a/api/album/42')return Response.json({tracks:[candidate,{...candidate,id:'12',title:'Second song'}]});
  return Response.json({tracks:[],albums:[{id:'42',artist:'ODESZA'},{id:'../unsafe',artist:'ODESZA'},{id:'99',artist:'Other'}]});
 }});
 assert.equal((await service.find(input.title,input.artist,input.duration)).found,true);
 assert.equal((await service.find('Second song',input.artist,input.duration)).found,true);
 assert.equal(seen.filter(path=>path==='/~a/api/album/42').length,1);
 assert.equal(seen.some(path=>path.includes('/99')||path.includes('unsafe')),false);
});
test('album lookup remains bounded and rejects different recordings',async()=>{
 let albums=0;const service=createAlternativeMusic({request:async url=>{
  if(url.pathname.startsWith('/~a/api/album/')){albums++;return Response.json({tracks:[{...candidate,title:input.title+' Remix'}]})}
  return Response.json({tracks:[],albums:Array.from({length:30},(_,id)=>({id:String(id),artist:input.artist}))});
 }});
 assert.deepEqual(await service.find(input.title,input.artist,input.duration),{found:false});assert.equal(albums,12);
});

test('healthy audio connections survive beyond the setup deadline and cancel on disconnect',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let signal,close;
 const service=createAlternativeMusic({request:async(url,options)=>{signal=options.signal;return new Response(null,{headers:{'content-type':'audio/mpeg'}})}});
 await service.audio({method:'HEAD',headers:{}},{once(event,fn){close=fn},setHeader(){},end(){}},'123');
 t.mock.timers.tick(31000);assert.equal(signal.aborted,false);close();assert.equal(signal.aborted,true);t.mock.timers.reset();
});

test('matched recordings expose album identity and album pages retain ordered Void songs',async()=>{
 const service=createAlternativeMusic({request:async url=>Response.json(url.pathname.includes('/album/')?{title:'Original Album',artist:'Artist',tracks:[{id:'2',title:'First',artist:'Artist',duration:120},{id:'1',title:'Second',artist:'Artist',duration:121}]}:{tracks:[{id:'2',title:'First',artist:'Artist',duration:120,album:'Original Album',albumId:'42'}]})});
 const match=await service.find('First','Artist',120);assert.equal(match.album,'Original Album');assert.equal(match.albumId,'void:42');const page=await service.album('42');assert.deepEqual(page.tracks.map(t=>t.id),['void:2','void:1']);assert.equal(page.release.title,'Original Album');await assert.rejects(service.album('../bad'),/Invalid/);
});
