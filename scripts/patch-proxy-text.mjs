export function patchProxyText(source){
 const pattern=/([A-Za-z_$][\w$]*)\.natives\.call\("Node\.prototype\.parentElement",/g;
 const matches=[...source.matchAll(pattern)];if(matches.length<2)throw Error('Proxy parent-element getter changed; review the text compatibility patch.');
 return source.replace(pattern,'$1.descriptors.get("Node.prototype.parentElement",');
}
