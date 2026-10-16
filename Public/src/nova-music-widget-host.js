// Both documents run inside Nova's proxy. Only music controls and state cross
// the trusted shell's facade; the provider never receives Nova account data.
(()=>{
 'use strict';
 const listeners=new Set(),status=document.getElementById('status');
 const methods=new Set(['play','pause','seekTo','setVolume','getDuration','isPaused']);
 let ready=false,widget;
 const emit=(method,value)=>{for(const callback of listeners)try{callback({method,value})}catch{}};
 window.novaMusicWidgetBridge={
  connect(callback){listeners.add(callback);if(ready)queueMicrotask(()=>{if(listeners.has(callback))callback({method:'ready'})});return()=>listeners.delete(callback)},
  send(method,value){
   if(!widget||!methods.has(method))return;
   if(method==='getDuration'||method==='isPaused'){widget[method](value=>emit(method,value));return}
   if(method==='seekTo'){if(!Number.isFinite(value)||value<0||value>86400000)return}
   else if(method==='setVolume'){if(!Number.isFinite(value)||value<0||value>100)return}
   widget[method](value);
  }
 };
 try{
  const url=new URL(new URLSearchParams(location.search).get('player'));
  const track=new URL(url.searchParams.get('url'));
  if(url.username||url.password||url.hash||url.origin!=='https://w.soundcloud.com'||url.pathname!=='/player/'||track.username||track.password||track.origin!=='https://api.soundcloud.com'||!/^\/tracks\/\d{1,20}$/.test(track.pathname)||track.search||track.hash)throw Error('Invalid music player.');
  const frame=document.getElementById('soundcloud');
  frame.src=url.href;
  widget=SC.Widget(frame);
  widget.bind(SC.Widget.Events.READY,()=>{ready=true;status.hidden=true;emit('ready')});
  for(const name of ['PLAY','PAUSE','PLAY_PROGRESS','SEEK','FINISH','ERROR'])widget.bind(SC.Widget.Events[name],value=>emit(SC.Widget.Events[name],value));
 }catch(error){status.textContent=error.message;emit('error',{message:'The music player could not connect.'})}
})();

