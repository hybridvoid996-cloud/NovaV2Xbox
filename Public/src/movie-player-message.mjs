const actions=new Set(['novaMovieTime','novaMovieStalled','novaMovieError','novaMovieCatalogReady','novaMovieInteractive','novaMovieUserPlay','novaMovieReady','novaMovieProfile']);
// Scramjet 2 wraps postMessage payloads sent from its virtual origin to Nova.
// Keep the real frame and per-launch token checks after unwrapping the envelope.
export function moviePlayerMessage(event,source,token){
 if(!source||event.source!==source||!token)return null;
 let data=event.data;
 for(let depth=0;depth<4&&data?.$scramjet$messagetype==='window'&&Object.hasOwn(data,'$scramjet$data');depth++)data=data.$scramjet$data;
 return data&&data.token===token&&actions.has(data.novaAction)?data:null;
}
