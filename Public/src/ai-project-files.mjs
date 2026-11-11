export const validFile=name=>typeof name==='string'&&/^[\w.-]+(?:\/[\w.-]+)*$/.test(name)&&!name.split('/').some(p=>p==='.'||p==='..')&&name.length<=120;
export function languageFor(name){return ({html:'HTML',css:'CSS',js:'JavaScript',mjs:'JavaScript',ts:'TypeScript',tsx:'TSX',jsx:'JSX',py:'Python',json:'JSON',md:'Markdown',sql:'SQL',rs:'Rust',go:'Go',java:'Java',cs:'C#',cpp:'C++',c:'C',sh:'Shell',yml:'YAML',yaml:'YAML'})[name.split('.').pop()]||'Plain text'}
const defaults={html:'index.html',css:'styles.css',javascript:'script.js',js:'script.js',typescript:'main.ts',ts:'main.ts',python:'main.py',py:'main.py',json:'data.json',markdown:'README.md',md:'README.md',sql:'query.sql',rust:'main.rs',go:'main.go',java:'Main.java',cpp:'main.cpp',c:'main.c',csharp:'Program.cs',bash:'run.sh',sh:'run.sh',yaml:'config.yaml'};
export function codeFiles(text){
 const found={};for(const match of text.matchAll(/```([^\n`]*)\n([\s\S]*?)```/g)){
  const header=match[1].trim(),parts=header.split(/\s+/),explicit=header.match(/(?:filename|file|title)=["']?([^\s"']+)/i);
  const name=explicit?.[1]||(parts.find(p=>validFile(p)&&p.includes('.')))||defaults[parts[0]?.toLowerCase()];
  if(validFile(name)&&match[2].length<=120000)found[name]=match[2].replace(/\n$/,'');
 }return found;
}
export function restoreFiles(saved){
 const files={};if(saved&&typeof saved==='object')for(const [key,value]of Object.entries(saved)){
  const name={html:'index.html',css:'styles.css',js:'script.js'}[key]||key;
  if(validFile(name)&&typeof value==='string'&&value.length<=120000)files[name]=value;
 }return Object.keys(files).length?files:{'index.html':'','styles.css':'','script.js':''};
}
