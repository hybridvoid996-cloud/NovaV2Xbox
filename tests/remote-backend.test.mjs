import test from 'node:test';
import assert from 'node:assert/strict';
import {withSharedBackend,REMOTE_BACKEND} from '../server/shared-backend.mjs';
test('Computer forwards to the reachable AWS account backend',async()=>{let target;const res={setHeader(){},end(){}};await withSharedBackend('remote',()=>assert.fail(),{env:{},request:async url=>{target=url;return{status:401,text:async()=>'{"error":"Sign into Nova again."}'}}})({method:'POST',headers:{host:'localhost:8795'},body:{action:'list'}},res);assert.equal(target,REMOTE_BACKEND+'/api/remote');assert.equal(res.statusCode,401)});
test('Computer backend handles its own requests without a forwarding loop',async()=>{let called=false;await withSharedBackend('remote',()=>{called=true},{env:{},request:()=>assert.fail()})({headers:{host:new URL(REMOTE_BACKEND).host}},{});assert.equal(called,true)});
