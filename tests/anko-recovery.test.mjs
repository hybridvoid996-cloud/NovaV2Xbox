import test from 'node:test';
import assert from 'node:assert/strict';
import {ankoAnswer,ANKO_MODELS} from '../server/anko-ai.mjs';
const messages=[{role:'user',content:[{type:'text',text:'Reply OK'}]}];
test('finished answers return without waiting for the upstream socket to close',async()=>{
 let cancelled=false;
 const response=new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: {"type":"text-delta","delta":"Done"}\n\ndata: {"type":"finish","finishReason":"stop"}\n\n'))},cancel(){cancelled=true}}));
 const result=await ankoAnswer(async()=>response,{model:ANKO_MODELS[0].id,messages});
 assert.equal(result.text,'Done');assert.equal(cancelled,true);
});
test('temporary failure retries the same request and discards incomplete output',async()=>{
 let calls=0,body;
 const request=async(url,options)=>{
  if(body)assert.equal(options.body,body);body=options.body;
  return new Response(++calls===1?'data: {"type":"text-delta","delta":"discard"}\n\ndata: {"type":"error","errorText":"Overloaded"}\n\n':'data: {"type":"text-delta","delta":"Recovered"}\n\ndata: {"type":"finish"}\n\n');
 };
 const result=await ankoAnswer(request,{model:ANKO_MODELS[0].id,messages,sleep:async()=>{}});
 assert.equal(calls,2);assert.equal(result.text,'Recovered');
});
test('permanent rejections and aborted requests do not retry',async()=>{
 let calls=0;
 await assert.rejects(ankoAnswer(async()=>{calls++;return new Response('',{status:403})},{model:ANKO_MODELS[0].id,messages,sleep:async()=>{}}));assert.equal(calls,1);
 const controller=new AbortController();controller.abort();
 await assert.rejects(ankoAnswer(async()=>{assert.fail('Aborted request must not start')},{model:ANKO_MODELS[0].id,messages,signal:controller.signal}));
});
