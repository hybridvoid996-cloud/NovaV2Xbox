import {restoreFiles} from './ai-project-files.mjs';
export function projectState(chat,{legacy=null}={}){
 if(!chat)throw Error('Open a project first.');
 if(!chat.project){chat.project={files:restoreFiles(legacy),active:'index.html',deleted:[]};chat.mode='code'}
 const project=chat.project;
 // An empty project is intentional after deleting the last file.
 project.files=project.files&&Object.keys(project.files).length?restoreFiles(project.files):{};
 project.deleted=Array.isArray(project.deleted)?project.deleted.slice(-10):[];
 if(!Object.hasOwn(project.files,project.active))project.active=Object.keys(project.files)[0]||null;
 return project;
}
export function removeProjectFile(project,name){
 if(!Object.hasOwn(project.files,name))return false;
 project.deleted.push({name,source:project.files[name]});project.deleted=project.deleted.slice(-10);delete project.files[name];
 if(project.active===name)project.active=Object.keys(project.files)[0]||null;return true;
}
export function undoProjectFile(project){
 const item=project.deleted.at(-1);if(!item||Object.hasOwn(project.files,item.name))return false;
 project.deleted.pop();project.files[item.name]=item.source;project.active=item.name;return true;
}
const escape=text=>text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
export function highlightCode(text){
 const pattern=/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:const|let|var|function|return|if|else|for|while|class|new|import|from|export|async|await|def|print|True|False|None|public|static|void|using|package|extends|try|catch|throw)\b)|(\b\d+(?:\.\d+)?\b)|(<\/?[\w-]+)/g;
 let output='',last=0;for(const match of text.matchAll(pattern)){output+=escape(text.slice(last,match.index));const kind=match[1]?'comment':match[2]?'string':match[3]?'keyword':match[4]?'number':'tag';output+='<span class="syntax-'+kind+'">'+escape(match[0])+'</span>';last=match.index+match[0].length}return output+escape(text.slice(last))+'\n';
}
