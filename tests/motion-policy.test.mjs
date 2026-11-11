import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../Public/src/motion-policy.js',import.meta.url),'utf8');
function setup(){
 let off=false;const events={},classes=new Map(),media={type:4,media:{mediaText:'(prefers-reduced-motion: reduce)'},cssRules:[]},sheets=[{cssRules:[media]}];
 const context={window:{dispatchEvent(){}},document:{documentElement:{classList:{toggle:(k,v)=>classes.set(k,v)}},styleSheets:sheets,addEventListener:(k,fn)=>events[k]=fn},localStorage:{getItem:()=>String(off)},addEventListener(){},CustomEvent:class{},MutationObserver:class{observe(){}},queueMicrotask:fn=>fn(),location:{origin:'https://nova.example'}};
 vm.runInNewContext(source,context);return {context,events,media,sheets,classes,setReduced:value=>{off=value;context.window.NovaMotion.sync()}};
}
test('shared preference enables motion by default and explicitly reduces it on every device',()=>{
 const s=setup();assert.equal(s.media.media.mediaText,'not all');assert.equal(s.classes.get('nova-motion-enabled'),true);
 s.setReduced(true);assert.equal(s.media.media.mediaText,'(min-width: 0px)');assert.equal(s.context.window.NovaMotion.reduced,true);
 s.setReduced(false);assert.equal(s.media.media.mediaText,'not all');
});
test('late stylesheets follow preference and inaccessible external styles are tolerated',()=>{
 const s=setup(),late={type:4,media:{mediaText:'(max-width: 800px) and (prefers-reduced-motion: reduce)'},cssRules:[]};
 s.sheets.push({cssRules:[late]},{get cssRules(){throw Error('Cross origin')}});s.events.load({target:{tagName:'LINK'}});
 assert.equal(late.media.mediaText,'not all');s.setReduced(true);assert.equal(late.media.mediaText,'(max-width: 800px) and (min-width: 0px)');
});
