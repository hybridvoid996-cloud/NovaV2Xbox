import {stampAppAssets} from './stamp-app-assets.mjs';
import {cp,mkdir,readdir,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// Build-time values are copied ONLY into the private compute bundle, never static/.
const runtimeKeys=['FIREBASE_SERVICE_ACCOUNT_JSON','GROQ_API_KEY','GROQ_API_KEYS','GROQ_TEXT_MODEL','GROQ_VISION_MODEL','OPENROUTER_API_KEY','DEEPSEEK_API_KEY','GEMINI_API_KEY','GEMINI_MODEL','NOVA_CHAT_OWNER_CODE','NOVA_OWNER_UIDS','NOVA_LOGIN_ORIGIN','NOVA_TURN_URL','NOVA_TURN_USERNAME','NOVA_TURN_CREDENTIAL','NOVA_COMPUTER_TURN_URL','NOVA_COMPUTER_TURN_USERNAME','NOVA_COMPUTER_TURN_CREDENTIAL'];
const root=path.resolve('.amplify-hosting');
const compute=path.join(root,'compute/default');
const staticRoot=path.join(root,'static');
await mkdir(compute,{recursive:true});
await cp('Public',staticRoot,{recursive:true,filter:source=>{
 const relative=path.relative('Public',source).replaceAll('\\','/');
 return !/^content(?:\/|$)/.test(relative)&&!/(?:^|\/)(?:__[^/]*|[^/]*-preview\.html)$/.test(relative);
}});
// Amplify serves HTTP APIs; long-lived game sockets use the dedicated relay.
if(process.env.NOVA_WISP_URL){
 const relay=new URL(process.env.NOVA_WISP_URL);
 if(relay.protocol!=='wss:'||relay.username||relay.password||relay.search||relay.hash)throw Error('NOVA_WISP_URL must be a public WSS endpoint.');
 const connection=path.join(staticRoot,'src/connection.js');
 const source=await readFile(connection,'utf8');
 const marker="new URL('/api/wisp/',location.origin)";
 if(!source.includes(marker))throw Error('Game relay configuration marker missing.');
 await writeFile(connection,source.replace(marker,'new URL('+JSON.stringify(relay.href)+')'));
}
await stampAppAssets(staticRoot,process.env.AWS_COMMIT_ID||String(Date.now()));
for(const name of ['server','api','api-handlers','lib','scripts','package.json','package-lock.json','.npmrc'])await cp(name,path.join(compute,name),{recursive:true});
for(const name of ['src','profile-assets/catalog.json','content/cinema-series.json','content/movie-services.json',...(await readdir('Public')).filter(n=>n.endsWith('.json'))]){
 await mkdir(path.dirname(path.join(compute,'Public',name)),{recursive:true});
 await cp(path.join('Public',name),path.join(compute,'Public',name),{recursive:true});
}
execFileSync(process.platform==='win32'?'npm.cmd':'npm',['ci','--omit=dev','--ignore-scripts'],{cwd:compute,stdio:'inherit',shell:process.platform==='win32'});
execFileSync(process.execPath,['scripts/patch-wisp.mjs'],{cwd:compute,stdio:'inherit'});
const config=Object.fromEntries(runtimeKeys.filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
if(!config.FIREBASE_SERVICE_ACCOUNT_JSON)throw Error('Firebase runtime credential is missing; refusing an account-server deployment.');
JSON.parse(config.FIREBASE_SERVICE_ACCOUNT_JSON);
await writeFile(path.join(compute,'runtime-config.json'),JSON.stringify(config),{mode:0o600});
await writeFile(path.join(compute,'server.mjs'),`import {readFile} from 'node:fs/promises';
const config=JSON.parse(await readFile(new URL('./runtime-config.json',import.meta.url),'utf8'));
Object.assign(process.env,config,{NODE_ENV:'production'});
const {createProductionServer}=await import('./server/production.mjs');
const server=await createProductionServer();
server.listen(3000,'0.0.0.0');
`);
await writeFile(path.join(root,'deploy-manifest.json'),JSON.stringify({version:1,framework:{name:'Nova',version:'1.0.0'},routes:[{path:'/api/*',target:{kind:'Compute',src:'default'}},{path:'/game-runtime/*',target:{kind:'Compute',src:'default'}},{path:'/healthz',target:{kind:'Compute',src:'default'}},{path:'/*',target:{kind:'Static'}}],computeResources:[{name:'default',runtime:'nodejs22.x',entrypoint:'server.mjs'}]},null,2));
async function bytes(dir){let total=0;for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);total+=entry.isDirectory()?await bytes(file):(await stat(file)).size;}return total;}
const computeSize=await bytes(compute);
if(computeSize>220*1024*1024)throw Error('Compute bundle exceeds Amplify 220 MB limit.');
if(await readFile(path.join(staticRoot,'runtime-config.json')).then(()=>true,()=>false))throw Error('Private runtime configuration must not be static.');
console.log('Prepared private Nova compute bundle: '+computeSize+' bytes. Runtime values were not logged.');
