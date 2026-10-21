import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import {patchProxyEval} from '../scripts/patch-proxy-eval.mjs';
test('a saved eval can be called from an eval override without recursively calling the override',()=>{
 const source=patchProxyEval(fs.readFileSync(new URL('../node_modules/@mercuryworkshop/scramjet/dist/scramjet.js',import.meta.url),'utf8'));
 assert.equal(patchProxyEval(source),source);
 const start=source.indexOf('const novaEvalFunctions='),end=source.indexOf('}},1762',start);
 const scope=vm.createContext({i:{o:code=>code},n:{pS:Object.defineProperty}});
 vm.runInContext(source.slice(start,end+1)+';globalThis.install=s;globalThis.indirect=o;',scope);
 vm.runInContext('globalThis.client={global:globalThis,config:{globals:{rewritefn:"rewrite"}},box:{instanceof:()=>false}};install(client,globalThis);globalThis.saved=code=>indirect.call(client,null,code);globalThis.eval=function(code){return saved(code)};',scope);
 assert.equal(vm.runInContext('saved("40+2")',scope),42);
 assert.equal(vm.runInContext('eval("20+3")',scope),23);
});
