// Native Nova parents do not carry Scramjet metadata. Preserve their real origin.
export function patchProxyMessages(source){
 if(source.includes('novaNativeSenderOrigin'))return source;
 const before='s="about:srcdoc"===r.url.href||"about:blank"===r.url.href;e.args[0]={$scramjet$messagetype:"window",$scramjet$origin:s?r.global.parent[n.p].url.origin:r.url.origin,';
 const after='s=r&&("about:srcdoc"===r.url.href||"about:blank"===r.url.href),novaNativeSenderOrigin=r?(s?r.global.parent[n.p]?.url.origin||r.url.origin:r.url.origin):t("return location.origin")();e.args[0]={$scramjet$messagetype:"window",$scramjet$origin:novaNativeSenderOrigin,';
 if(!source.includes(before))throw Error('Proxy postMessage implementation changed; update the compatibility patch.');
 return source.replace(before,after);
}
