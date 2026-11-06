import {cp,mkdir,mkdtemp,readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('.');const base=path.join(root,'.aws-stage');await mkdir(base,{recursive:true});const target=await mkdtemp(path.join(base,'backend-'));
const entries=['server','api','api-handlers','lib','scripts','package.json','package-lock.json','.npmrc','Public/src','Public/profile-assets/catalog.json','Public/content/cinema-series.json'];
for(const name of await readdir('Public'))if(name.endsWith('.json'))entries.push('Public/'+name);
async function audit(file){const info=await import('node:fs/promises').then(fs=>fs.stat(file));if(info.isDirectory()){for(const name of await readdir(file))await audit(path.join(file,name));return}if(/\.(?:m?js|json|html|css|txt)$/.test(file)){const text=await readFile(file,'utf8');if(/gsk_[A-Za-z0-9]{24,}|-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(text))throw Error('Potential embedded credential: '+path.relative(root,file));}}
for(const name of entries){const source=path.join(root,name);await audit(source);await mkdir(path.dirname(path.join(target,name)),{recursive:true});await cp(source,path.join(target,name),{recursive:true});}
await cp('deploy/aws/Dockerfile',path.join(target,'Dockerfile'));
await writeFile(path.join(target,'.dockerignore'),'.env*\n.git\nnode_modules\n');
await writeFile(path.join(target,'PACKAGE-INFO.txt'),'Nova backend only. No .env files or server credentials included. Supply credentials through backend runtime configuration.\n');
console.log('Prepared '+target);

