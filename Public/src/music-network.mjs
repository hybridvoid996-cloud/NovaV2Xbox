import {retryMusicRequest} from './music-recovery.mjs';
export function createMusicTransport({prefix,encode,origin,request=fetch}){
 if(!prefix||typeof encode!=='function')throw Error('Nova Music connection is not ready. Reopen Music.');
 function url(value){const target=new URL(value,origin);if(!['https:','http:'].includes(target.protocol))throw Error('Unsupported music address.');if(target.origin===new URL(origin).origin&&target.pathname.startsWith(prefix))return target.href;return new URL(prefix+encode(target.href),origin).href;}
 return {url,request:(value,options)=>retryMusicRequest(request,url(value),options)};
}
