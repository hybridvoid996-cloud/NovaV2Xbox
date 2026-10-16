import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundCloudGuestPlayer} from '../Public/src/nova-music-guest.mjs';

test('a trailing progress event cannot turn a paused guest player back on',async()=>{
 const previous={window:globalThis.window,document:globalThis.document,location:globalThis.location};
 const listeners=new Set();
 const shell={connect(fn){listeners.add(fn);fn({method:'ready'});return()=>listeners.delete(fn)},send(method){if(method==='getDuration')for(const fn of listeners)fn({method,value:120000})}};
 const element=()=>({isConnected:true,setAttribute(){},append(){},replaceWith(){},remove(){this.isConnected=false},addEventListener(){},removeEventListener(){},getAttribute(){return this.src}});
 const routed={...element(),contentWindow:{novaMusicWidgetBridge:shell}};
 const controller={createFrame(){return {element:routed,go(){routed.src='http://nova.test/~/sj/p/test/widget'}}}};
 globalThis.window={NovaConnection:{create:async()=>controller,ensure:async c=>c}};
 globalThis.document={createElement:element};globalThis.location={origin:'http://nova.test',href:'http://nova.test/music.html'};
 let player;
 try{
  player=new SoundCloudGuestPlayer({mount:{append(){}}});
  await player.load('https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F123');
  const emit=(method,value)=>{for(const fn of listeners)fn({method,value})};
  emit('play');assert.equal(player.state.playing,true);
  player.pause();emit('pause');emit('playProgress',{currentPosition:10000});
  assert.equal(player.state.position,10);assert.equal(player.state.playing,false);
  player.destroy();emit('play');assert.equal(player.state.playing,false);assert.equal(listeners.size,0);
 }finally{player?.destroy();Object.assign(globalThis,previous)}
});
