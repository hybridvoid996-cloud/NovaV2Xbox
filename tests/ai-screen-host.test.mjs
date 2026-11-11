import test from 'node:test';
import assert from 'node:assert/strict';
import {screenHost} from '../Public/src/ai-screen-host.mjs';
test('nested Nova and about blank frames use top-level floating API',()=>{
 const top={document:{},documentPictureInPicture:{requestWindow(){}}};top.parent=top;top.top=top;
 const middle={parent:top,top,document:{}},frame={parent:middle,top,document:{}};
 const result=screenHost(frame);assert.equal(result.window,top);assert.equal(result.document,top.document);assert.equal(result.canFloat,true);
});
test('cross-origin parent and unsupported browser retain usable local host',()=>{
 const frame={document:{},parent:{get document(){throw Error('Blocked')}}};frame.top=frame.parent;
 assert.equal(screenHost(frame).canFloat,false);assert.equal(screenHost(frame).window,frame);
 const top={document:{}};top.parent=top;top.top=top;assert.equal(screenHost(top).canFloat,false);
});
