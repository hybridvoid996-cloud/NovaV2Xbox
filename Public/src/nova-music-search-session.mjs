// Every render owns a request; superseded responses must never repaint the view.
export function createMusicSearchSession(){
 let controller,version=0;
 function cancel(){version++;controller?.abort();controller=null}
 return {cancel,begin(){cancel();const own=version;controller=new AbortController();return {signal:controller.signal,current:()=>own===version}}};
}
