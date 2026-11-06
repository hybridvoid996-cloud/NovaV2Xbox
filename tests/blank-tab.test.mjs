import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldOpenBlank,blankTabStyle,classroomTitle,classroomIcon} from '../Public/src/blank-tab-policy.mjs';
import {launchBlank,openSignedInBlank} from '../Public/src/blank-tab.mjs';
test('only a completed signed-in top-level home can automatically open',()=>{
 const yes={authenticated:true,complete:true,topLevel:true,hosted:false};assert.equal(shouldOpenBlank(yes),true);
 for(const patch of [{authenticated:false},{complete:false},{topLevel:false},{hosted:true},{enabled:false},{regular:true}])assert.equal(shouldOpenBlank({...yes,...patch}),false);
});
test('blocked automatic opening does not stop startup or show a choice dialog',async()=>{
 const keys=['window','top','localStorage','location','addEventListener'],before=Object.fromEntries(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));const handlers=[];
 try{const win={open:()=>null};globalThis.window=win;globalThis.top=win;globalThis.localStorage={getItem:()=>null};globalThis.location={href:'https://nova.example/home.html',origin:'https://nova.example',search:''};globalThis.addEventListener=(type,fn)=>handlers.push({type,fn});assert.equal(await openSignedInBlank(),false);assert.deepEqual(handlers.map(h=>h.type),['click','keydown']);let prevented=false;handlers[0].fn({isTrusted:false,preventDefault:()=>{prevented=true}});assert.equal(prevented,false)}finally{for(const key of keys){if(before[key])Object.defineProperty(globalThis,key,before[key]);else delete globalThis[key]}}
});
test('Classroom is default, custom tab styles survive, and unsafe icons are rejected',()=>{
 assert.deepEqual(blankTabStyle(null,null,'https://nova.example'),{title:classroomTitle,icon:classroomIcon});assert.deepEqual(blankTabStyle('My tab','/Nova12.png','https://nova.example'),{title:'My tab',icon:'https://nova.example/Nova12.png'});assert.equal(blankTabStyle('X','javascript:alert(1)','https://nova.example').icon,classroomIcon);
});
test('popup keeps Nova at its original origin with no storage or credential copying',()=>{
 const nodes=[];const make=tag=>({tag,style:{},setAttribute(k,v){this[k]=v}});const popup={closed:false,document:{title:'',documentElement:{style:{}},body:{style:{},append:n=>nodes.push(n)},head:{append:n=>nodes.push(n)},createElement:make},focus(){},close(){this.closed=true}};
 const previous=globalThis.location;globalThis.location={href:'https://nova.example/home.html',origin:'https://nova.example'};try{let opened;assert.equal(launchBlank({url:location.href,store:{getItem:()=>null},open:(...args)=>{opened=args;return popup}}),true);assert.deepEqual(opened,['about:blank','_blank']);assert.equal(popup.document.title,classroomTitle);const frame=nodes.find(n=>n.tag==='iframe');assert.equal(frame['data-nova-src'],location.href);assert.equal(frame.allowFullscreen,true);assert.equal(popup.opener,null);assert.equal(nodes.find(n=>n.tag==='script').src,'https://nova.example/src/blank-host.js?v=20261030-blank412');assert.equal(launchBlank({open:()=>null,store:{getItem:()=>null}}),false);assert.equal(launchBlank({url:'https://other.example/home.html',open:()=>assert.fail(),store:{getItem:()=>null}}),false);assert.equal(launchBlank({url:'https://nova.example/account.html',open:()=>assert.fail(),store:{getItem:()=>null}}),false)}finally{if(previous===undefined)delete globalThis.location;else globalThis.location=previous}
});
