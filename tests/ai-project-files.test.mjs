import test from 'node:test';
import assert from 'node:assert/strict';
import {validFile,codeFiles,restoreFiles,languageFor} from '../Public/src/ai-project-files.mjs';
test('AI adds named files across languages and retains traditional web fences',()=>{
 const files=codeFiles('```html\n<h1>Hi</h1>\n```\n```python filename=tools/main.py\nprint(1)\n```\n```src/app.ts\nconst x:number=1;\n```');
 assert.equal(files['index.html'],'<h1>Hi</h1>');assert.equal(files['tools/main.py'],'print(1)');assert.equal(files['src/app.ts'],'const x:number=1;');assert.equal(languageFor('app.ts'),'TypeScript');
});
test('unsafe file paths and non-code prose are not imported',()=>{
 for(const name of ['../secret','/etc/file','a/../x','a//b','x<script>.js'])assert.equal(validFile(name),false);
 assert.deepEqual(codeFiles('```python filename=../bad.py\npass\n```\n```unknown\nprose\n```'),{});
});
test('existing three-file drafts migrate without losing code',()=>{
 assert.deepEqual(restoreFiles({html:'<main/>',css:'body{}',js:'run()'}),{'index.html':'<main/>','styles.css':'body{}','script.js':'run()'});
 assert.deepEqual(restoreFiles({'main.py':'print(1)','../bad':'x'}),{'main.py':'print(1)'});
});
