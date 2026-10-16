import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
function setup(style=''){
 const frames=[];const elements=new Map();
 const element=()=>({dataset:{},classList:{add(){},remove(){},contains(name){return name===style}},isConnected:true,hidden:false,src:'',removeAttribute(){},hasAttribute(){return false},addEventListener(){},setAttribute(){},append(){},prepend(){},before(f){frames.push(f)},remove(){this.isConnected=false},querySelectorAll(){return []},replaceChildren(){},closest(){return this.detached?{}:null}});
 for(const id of ['panel-content','panel-title','tiles'])elements.set(id,element());
 const store=new Map();const context={frame:element(),panel:element(),content:element(),MutationObserver:class{observe(){}},document:{hidden:false,addEventListener(){},body:element(),createElement:element,getElementById:id=>elements.get(id),querySelectorAll:()=>[]},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},cancelAIMotion(){},dispatchEvent(){},CustomEvent:class{},addEventListener(){},fetch:()=>new Promise(()=>{}),window:{}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../Public/src/recent.js',import.meta.url),'utf8'),context);return context;
}
test('a new game unloads the detached previous game, including after resume',()=>{
 const c=setup(),api=c.window.NovaRecent,a={id:'a',name:'A'},b={id:'b',name:'B'};api.launch(a);const first=c.frame;first.detached=true;api.launch(b);assert.equal(first.isConnected,false);assert.equal(first.src,'about:blank');assert.equal(api.resume(a),false);const second=c.frame;second.hidden=true;assert.equal(api.resume(b),true);assert.equal(c.frame,second);
});
test('app players coexist with one game and survive game replacement',()=>{
 const c=setup(),api=c.window.NovaRecent;api.launch({id:'app',name:'App',kind:'app'});const app=c.frame;app.detached=true;api.launch({id:'a',name:'A'});const game=c.frame;game.detached=true;api.launch({id:'b',name:'B'});assert.equal(app.isConnected,true);assert.equal(game.isConnected,false);assert.equal(api.resume({id:'app',name:'App',kind:'app'}),true);
});
test('cloud games share the same single game slot',()=>{
 const c=setup(),api=c.window.NovaRecent;api.launch({id:'cloud',name:'Cloud',kind:'cloud'});const cloud=c.frame;cloud.detached=true;api.launch({id:'local',name:'Local'});assert.equal(cloud.isConnected,false);
});


test('starting cloud unloads local game while preserving app sessions',()=>{
 const c=setup(),api=c.window.NovaRecent;api.launch({id:'app',name:'App',kind:'app'});const app=c.frame;api.launch({id:'local',name:'Local'});const local=c.frame;api.launch({id:'cloud',name:'Cloud',kind:'cloud'});assert.equal(local.src,'about:blank');assert.equal(local.isConnected,false);assert.equal(app.isConnected,true);assert.equal(api.resume({id:'local',name:'Local'}),false);
});
test('OS detach uses a state preserving move and never appends the live player',()=>{
 const source=fs.readFileSync(new URL('../Public/src/nova-os.js',import.meta.url),'utf8');const detach=source.slice(source.indexOf('function detachPlayer()'),source.indexOf('const menuHandle'));
 assert.match(detach,/win\.body\.moveBefore\(iframe,null\)/);assert.doesNotMatch(detach,/win\.body\.append\(iframe\)/);
});


