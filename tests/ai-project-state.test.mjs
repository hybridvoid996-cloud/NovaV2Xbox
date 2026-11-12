import test from 'node:test';
import assert from 'node:assert/strict';
import {projectState,removeProjectFile,undoProjectFile,highlightCode} from '../Public/src/ai-project-state.mjs';
test('separate conversations keep isolated files through saving and reopening',()=>{
 const a={id:'A'},b={id:'B'};projectState(a).files['index.html']='Account A project';projectState(b).files['index.html']='Different project';
 const reopened=JSON.parse(JSON.stringify([a,b]));assert.equal(projectState(reopened[0]).files['index.html'],'Account A project');assert.equal(projectState(reopened[1]).files['index.html'],'Different project');
});
test('legacy draft can be assigned to one project without changing its original data',()=>{
 const legacy={html:'<h1>Old draft</h1>',js:'run()',css:''},chat={};assert.equal(projectState(chat,{legacy}).files['index.html'],legacy.html);assert.deepEqual(legacy,{html:'<h1>Old draft</h1>',js:'run()',css:''});
});
test('deleting the last file stays empty after reopen and can be undone',()=>{
 const chat={project:{files:{'app.py':'print(1)'},active:'app.py',deleted:[]}},project=projectState(chat);assert.equal(removeProjectFile(project,'app.py'),true);assert.equal(project.active,null);const loaded=projectState(JSON.parse(JSON.stringify(chat)));assert.deepEqual(loaded.files,{});assert.equal(undoProjectFile(loaded),true);assert.equal(loaded.files['app.py'],'print(1)');
});
test('syntax colors escape HTML and never execute code',()=>{
 const html=highlightCode('<script>alert("x")</script>');assert.ok(!html.includes('<script>'));assert.match(html,/&lt;/);assert.match(highlightCode('const n=42; // hi'),/syntax-keyword/);
});
