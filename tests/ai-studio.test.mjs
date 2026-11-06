import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCodeResponse} from '../server/ai-code-response.mjs';
import {projectFiles} from '../server/ai-workspace.mjs';
import {previewDocument} from '../Public/src/ai-preview.mjs';
test('code response accepts JSON and fenced JSON but rejects truncated edits',()=>{const code={html:'<h1>Hello</h1>',css:'',js:'',explanation:'Done'};assert.deepEqual(parseCodeResponse(JSON.stringify(code)),code);assert.deepEqual(parseCodeResponse('```json\n'+JSON.stringify(code)+'\n```'),code);assert.throws(()=>parseCodeResponse('{"html":"unfinished'));assert.throws(()=>parseCodeResponse('{"html":"x"}'))});
test('project file paths are bounded and cannot escape project',()=>{assert.equal(projectFiles({html:'',css:'',js:'','src/main.py':'print(1)'})['src/main.py'],'print(1)');assert.throws(()=>projectFiles({html:'',css:'',js:'','../private.txt':'x'}));assert.throws(()=>projectFiles({html:'',css:'',js:'',...Object.fromEntries(Array.from({length:41},(_,i)=>['file'+i+'.txt','x']))}))});
test('preview resolves local files and captures runtime errors within isolated frame',()=>{const doc=previewDocument({html:'<link href="theme.css"><script src="app.js"></script>',css:'',js:'','theme.css':'body{color:red}','app.js':'console.log("ready")'});assert.match(doc,/body\{color:red\}/);assert.match(doc,/console.log\("ready"\)/);assert.match(doc,/unhandledrejection/);assert.match(doc,/connect-src 'none'/)});

test('nested explanation is metadata, never a project file',()=>{const r=parseCodeResponse(JSON.stringify({changes:{js:'console.log(1)',explanation:'Fixed'}}));assert.equal(r.explanation,'Fixed');assert.deepEqual(Object.keys(r.changes),['js'])});
