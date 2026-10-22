// Keep unchanged message/media nodes mounted across live updates.
export function createMessageRowCache(){
 const logs=new WeakMap();
 const cached=(log,id,key,build)=>{let rows=logs.get(log);if(!rows){rows=new Map();logs.set(log,rows)}const old=rows.get(id);if(old&&old.key.length===key.length&&old.key.every((value,i)=>Object.is(value,key[i])))return old.node;const node=build();rows.set(id,{key,node});return node};
 cached.prune=(log,ids)=>{const rows=logs.get(log);if(rows)for(const id of rows.keys())if(!ids.has(id))rows.delete(id)};
 return cached;
}
export function reconcileMessageNodes(host,nodes){const desired=new Set(nodes);for(const child of [...host.childNodes])if(!desired.has(child))child.remove();let cursor=host.firstChild;for(const node of nodes){if(node===cursor)cursor=cursor.nextSibling;else host.insertBefore(node,cursor)}while(cursor){const next=cursor.nextSibling;cursor.remove();cursor=next}}
