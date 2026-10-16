// A scoped bridge to Nova's trusted, proxied player shell. It never listens to
// global postMessages or exposes Nova account state to the provider document.
export const widgetEvents={READY:'ready',PLAY:'play',PAUSE:'pause',PLAY_PROGRESS:'playProgress',SEEK:'seek',FINISH:'finish',ERROR:'error'};
const events=new Set(Object.values(widgetEvents));
const getters=new Set(['getDuration','isPaused']);
const commands=new Set(['play','pause','seekTo','setVolume',...getters]);
export class SoundCloudProxyWidget{
 constructor(frame){this.frame=frame;this.callbacks=new Map();this.getters=new Map();this.ready=false;this.closed=false;this.connect=()=>{if(this.closed)return;let shell;try{shell=frame.contentWindow.novaMusicWidgetBridge}catch{return}if(!shell||typeof shell.connect!=='function'||typeof shell.send!=='function')return;this.disconnect?.();this.shell=shell;this.disconnect=shell.connect(message=>{if(this.closed||(!events.has(message?.method)&&!getters.has(message?.method)))return;const {method,value}=message;if(method==='ready')this.ready=true;if(getters.has(method)){const callbacks=this.getters.get(method)||[];this.getters.delete(method);for(const callback of callbacks)callback(value);return}for(const callback of this.callbacks.get(method)||[])callback(value)})};frame.addEventListener('load',this.connect);this.connect();}
 send(method,value){if(!this.closed&&commands.has(method))this.shell?.send(method,value)}
 bind(name,callback){if(!events.has(name))return;const callbacks=this.callbacks.get(name)||[];callbacks.push(callback);this.callbacks.set(name,callbacks);if(name==='ready'&&this.ready)queueMicrotask(()=>{if(!this.closed)callback()})}
 get(name,callback){const callbacks=this.getters.get(name)||[];callbacks.push(callback);this.getters.set(name,callbacks);this.send(name)}
 getDuration(callback){this.get('getDuration',callback)}
 isPaused(callback){this.get('isPaused',callback)}
 play(){this.send('play')}
 pause(){this.send('pause')}
 seekTo(ms){this.send('seekTo',ms)}
 setVolume(volume){this.send('setVolume',volume)}
 destroy(){this.pause();this.closed=true;this.disconnect?.();this.frame.removeEventListener('load',this.connect);this.callbacks.clear();this.getters.clear();this.shell=null}
}
