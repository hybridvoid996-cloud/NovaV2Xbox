import {readCache,writeCache,migrateAccountCaches} from './account-cache.js';
// Save databases only: authentication, cookies and downloaded engine caches stay local.
const saveDatabase=name=>/idbfs|unity_fs|localforage|emulator|retro.*save|game.*save|savegame|gameprogress|playerprogress|construct.*save|rpg.*save/i.test(name)&&!/auth|firebase|cookie|cache/i.test(name);
const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
async function pack(value){
 if(value instanceof Blob)return {__novaType:'blob',mime:value.type,data:await pack(await value.arrayBuffer())};
 if(value instanceof ArrayBuffer){const bytes=new Uint8Array(value);let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));return {__novaType:'buffer',data:btoa(raw)};}
 if(ArrayBuffer.isView(value))return {__novaType:'typed',name:value.constructor.name,data:await pack(value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength))};
 if(value instanceof Date)return {__novaType:'date',data:value.toISOString()};
 if(Array.isArray(value))return Promise.all(value.map(pack));
 if(value&&typeof value==='object'){const result={};for(const [key,item]of Object.entries(value))result[key]=await pack(item);return result;}
 return value;
}
function unpack(value){
 if(value?.__novaType==='buffer'){const raw=atob(value.data);return Uint8Array.from(raw,c=>c.charCodeAt(0)).buffer;}
 if(value?.__novaType==='blob')return new Blob([unpack(value.data)],{type:value.mime});
 if(value?.__novaType==='typed'){const constructors={Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,Float32Array,Float64Array,Uint8ClampedArray,DataView};if(!constructors[value.name])throw Error('Unsupported game save format.');return new constructors[value.name](unpack(value.data));}
 if(value?.__novaType==='date')return new Date(value.data);
 if(Array.isArray(value))return value.map(unpack);
 if(value&&typeof value==='object'){const result={};for(const [key,item]of Object.entries(value))result[key]=unpack(item);return result;}
 return value;
}
const list=async()=>{if(typeof indexedDB.databases!=='function')throw Error('This browser cannot discover IndexedDB game saves. Existing game backups were preserved; use a browser with database discovery for these saves.');return (await indexedDB.databases()).filter(db=>saveDatabase(db.name))};
export async function captureGames(){
 const result=[];
 for(const entry of await list()){
  const db=await request(indexedDB.open(entry.name));
  try{const stores=[];for(const name of db.objectStoreNames){
   const tx=db.transaction(name,'readonly'),store=tx.objectStore(name);
   const [keys,values]=await Promise.all([request(store.getAllKeys()),request(store.getAll())]);
   const indexes=[...store.indexNames].map(name=>{const index=store.index(name);return {name,keyPath:index.keyPath,unique:index.unique,multiEntry:index.multiEntry}});
   stores.push({name,keyPath:store.keyPath,autoIncrement:store.autoIncrement,indexes,rows:await Promise.all(keys.map(async(key,i)=>[await pack(key),await pack(values[i])]))});
  }result.push({name:db.name,version:db.version,stores});}finally{db.close();}
 }
 dispatchEvent(new CustomEvent('nova-game-backup-coverage',{detail:{databases:result.map(db=>({name:db.name,stores:db.stores.length,records:db.stores.reduce((n,s)=>n+s.rows.length,0)})),state:typeof indexedDB.databases==='function'?'detected':'limited',message:typeof indexedDB.databases==='function'?'Recognized game-save databases scanned. Other storage and server-side progress are not included.':'This browser cannot list game-save databases. Browser-storage progress can still back up.'}}));
 const text=JSON.stringify(result);
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(v=>v.toString(16).padStart(2,'0')).join('');
 async function archiveLocally(){
  const db=await openArchive();try{await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(text,hash);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
  // The complete snapshot has committed before old or partial chunks are removed.
  for(const key of Object.keys(localStorage))if(key.startsWith('nova_game_save_part_'))localStorage.removeItem(key);
  localStorage.setItem('nova_game_save_manifest',JSON.stringify({parts:0,version:hash,localOnly:true}));
 }
 if(text.length>950000){await archiveLocally();return;}
 const count=Math.ceil(text.length/100000),prefix='nova_game_save_part_'+hash+'_';
 try{
  for(let i=0;i<count;i++)localStorage.setItem(prefix+i,text.slice(i*100000,(i+1)*100000));
  localStorage.setItem('nova_game_save_manifest',JSON.stringify({parts:count,version:hash}));
 }catch(error){
  if(error.name!=='QuotaExceededError'&&error.code!==22&&error.code!==1014)throw error;
  await archiveLocally();return;
 }
 for(const key of Object.keys(localStorage))if(key.startsWith('nova_game_save_part_')&&!key.startsWith(prefix))localStorage.removeItem(key);
}
function openArchive(){const req=indexedDB.open('__nova_account_game_archive',1);req.onupgradeneeded=()=>req.result.createObjectStore('snapshots');return request(req);}
async function remove(name){const req=indexedDB.deleteDatabase(name);return new Promise((resolve,reject)=>{req.onsuccess=resolve;req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Close other Nova tabs before switching accounts to protect your game saves.'));});}
export async function restoreGames(){
 let manifest;try{manifest=JSON.parse(localStorage.getItem('nova_game_save_manifest')||'null')}catch{}
 let saved=[];if(manifest){let text='';if(manifest.localOnly){const db=await openArchive();try{text=await request(db.transaction('snapshots').objectStore('snapshots').get(manifest.version));if(typeof text!=='string')throw Error('Your local game backup could not be found.');}finally{db.close();}}for(let i=0;i<manifest.parts;i++){const part=localStorage.getItem('nova_game_save_part_'+(manifest.version?manifest.version+'_':'')+i);if(part===null)throw Error('Your game backup is incomplete.');text+=part;}if(manifest.version){const actual=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(v=>v.toString(16).padStart(2,'0')).join('');if(actual!==manifest.version)throw Error('Your game backup is incomplete. Please retry syncing on the original device.');}saved=JSON.parse(text);}
 for(const db of await list())await remove(db.name);
 for(const entry of saved){if(!saveDatabase(entry.name))continue;const req=indexedDB.open(entry.name,entry.version);
  req.onupgradeneeded=()=>{for(const schema of entry.stores){const store=req.result.createObjectStore(schema.name,{keyPath:schema.keyPath,autoIncrement:schema.autoIncrement});for(const index of schema.indexes)store.createIndex(index.name,index.keyPath,{unique:index.unique,multiEntry:index.multiEntry});}};
  const db=await request(req);try{if(!entry.stores.length)continue;const tx=db.transaction(entry.stores.map(s=>s.name),'readwrite');const completed=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Game save restoration failed.'));});for(const schema of entry.stores){const store=tx.objectStore(schema.name);for(const [key,value]of schema.rows){if(schema.keyPath===null)store.put(unpack(value),unpack(key));else store.put(unpack(value));}}await completed;}finally{db.close();}
 }
}

// Embedded website cookies are isolated locally and never uploaded to cloud backups.
export async function captureWebSession(uid){
 const databases=typeof indexedDB.databases==='function'?await indexedDB.databases():[];
 const entry=databases.find(db=>db.name==='__scramjet_controller');if(!entry)return;
 const db=await request(indexedDB.open(entry.name));
 try{const stores=[];for(const name of db.objectStoreNames){const store=db.transaction(name,'readonly').objectStore(name);const [keys,values]=await Promise.all([request(store.getAllKeys()),request(store.getAll())]);stores.push({name,keyPath:store.keyPath,autoIncrement:store.autoIncrement,keys,values});}await writeCache('nova-account-cookies:'+uid,{version:db.version,stores});}finally{db.close();}
}
export async function restoreWebSession(uid){
 await migrateAccountCaches();
 const saved=await readCache('nova-account-cookies:'+uid);
 const databases=typeof indexedDB.databases==='function'?await indexedDB.databases():[];
 if(databases.some(db=>db.name==='__scramjet_controller'))await remove('__scramjet_controller');
 if(!saved)return;const req=indexedDB.open('__scramjet_controller',saved.version);req.onupgradeneeded=()=>{for(const store of saved.stores)req.result.createObjectStore(store.name,{keyPath:store.keyPath,autoIncrement:store.autoIncrement});};const db=await request(req);
 try{const tx=db.transaction(saved.stores.map(s=>s.name),'readwrite');const done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});for(const schema of saved.stores){const store=tx.objectStore(schema.name);for(let i=0;i<schema.values.length;i++){if(schema.keyPath===null)store.put(schema.values[i],schema.keys[i]);else store.put(schema.values[i]);}}await done;}finally{db.close();}
}
