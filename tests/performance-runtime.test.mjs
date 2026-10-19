import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('background lifecycle pauses decoration and deduplicates visibility events',()=>{
 const panel={hidden:true,dataset:{}},events=[],classes=new Map(),handlers={};let plays=0,pauses=0,observer;
 const video={hidden:false,style:{},paused:true,pause(){pauses++;this.paused=true},play(){plays++;this.paused=false;return Promise.resolve()},addEventListener(type,fn){handlers[type]=fn}};
 const document={hidden:false,getElementById:id=>id==='panel'?panel:video,body:{classList:{toggle:(key,value)=>classes.set(key,value)}},addEventListener(type,fn){handlers[type]=fn}};
 const context={navigator:{hardwareConcurrency:8,deviceMemory:8},innerWidth:1920,document,localStorage:{getItem:()=>null},MutationObserver:class{constructor(fn){observer=fn}observe(){}},addEventListener(type,fn){handlers[type]=fn},dispatchEvent:e=>events.push(e),CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail}}};context.window=context;
 vm.runInNewContext(readFileSync('Public/src/performance-runtime.js','utf8'),context);
 assert.equal(plays,1);panel.hidden=false;observer();assert.equal(pauses,1);assert.equal(classes.get('nova-content-active'),true);
 const count=events.length;observer();assert.equal(events.length,count,'No repeated lifecycle work when state is unchanged');
 panel.hidden=true;observer();assert.equal(plays,2);assert.equal(events.at(-1).detail.visible,true);
 document.hidden=true;handlers.visibilitychange();assert.equal(events.at(-1).detail.visible,false);
 document.hidden=false;handlers.visibilitychange();assert.equal(plays,3);
});

test('laptops and low-power hardware keep standard effects unless explicitly reduced',async()=>{const {useLightEffects}=await import('../Public/src/os-performance.mjs');assert.equal(useLightEffects(null,1366,8,8),false);assert.equal(useLightEffects(null,1920,4,8),false);assert.equal(useLightEffects(null,1920,8,4),false);assert.equal(useLightEffects(null,1920,8,8),false);assert.equal(useLightEffects('false',1366,4,4),false);assert.equal(useLightEffects('true',1920,16,16),true)});
test('maximized app windows pause wallpaper and closing them resumes without touching app media',()=>{let maximized=false,plays=0,pauses=0;const handlers={},video={hidden:false,style:{},paused:true,play(){plays++;this.paused=false;return Promise.resolve()},pause(){pauses++;this.paused=true},addEventListener(){}};const document={hidden:false,getElementById:id=>id==='panel'?{hidden:true}:video,querySelector:()=>maximized?{}:null,body:{classList:{toggle(){}}},addEventListener(type,fn){handlers[type]=fn}};const context={navigator:{hardwareConcurrency:8,deviceMemory:8},innerWidth:1920,document,localStorage:{getItem:()=>null},MutationObserver:class{observe(){}},addEventListener(type,fn){handlers[type]=fn},dispatchEvent(){},CustomEvent:class{}};context.window=context;vm.runInNewContext(readFileSync('Public/src/performance-runtime.js','utf8'),context);assert.equal(plays,1);maximized=true;handlers['nova-os-windows']();assert.equal(pauses,1);maximized=false;handlers['nova-os-windows']();assert.equal(plays,2)});

test('laptops keep full quality video visible and only explicit preferences pause it',()=>{
 const classes=new Map(),handlers={};let plays=0,pauses=0,saved=null;
 const video={poster:'/still.jpg',style:{},paused:true,hidden:false,pause(){pauses++;this.paused=true},play(){plays++;this.paused=false;return Promise.resolve()},addEventListener(type,fn){handlers[type]=fn}};
 const document={hidden:false,getElementById:id=>id==='panel'?{hidden:true}:video,querySelector:()=>null,body:{classList:{toggle:(k,v)=>classes.set(k,v)}},addEventListener(){}};
 const context={navigator:{hardwareConcurrency:4,deviceMemory:4},innerWidth:1366,document,localStorage:{getItem:k=>k==='nova_performance_mode'?saved:null},MutationObserver:class{observe(){}},addEventListener:(k,v)=>handlers[k]=v,dispatchEvent(){},CustomEvent:class{}};context.window=context;
 vm.runInNewContext(readFileSync('Public/src/performance-runtime.js','utf8'),context);
 assert.equal(classes.get('nova-light-effects'),false);assert.equal(plays,1);assert.equal(video.style.visibility,'');
 saved='true';handlers.storage();assert.equal(video.paused,true);assert.equal(video.style.visibility,'');assert.ok(pauses>0);
 saved='false';handlers.storage();assert.equal(classes.get('nova-light-effects'),false);assert.equal(video.style.visibility,'');assert.equal(plays,2);
 saved=null;video.poster='';handlers.storage();assert.equal(video.style.visibility,'','Uploaded videos without a poster stay visible');
});
