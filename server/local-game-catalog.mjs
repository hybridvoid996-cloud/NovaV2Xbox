import {access,readFile} from 'node:fs/promises';
import path from 'node:path';
export async function localGameCatalog(req,root){
 let host;try{host=new URL('http://'+req.headers.host).hostname}catch{return null}
 if(!['localhost','127.0.0.1','[::1]'].includes(host))return null;
 const directory=path.join(root,'content/local-schedule-i');
 try{await access(path.join(directory,'index.html'));await access(path.join(directory,'nova-local-build.json'))}catch{return null}
 const build=JSON.parse(await readFile(path.join(directory,'nova-local-build.json'),'utf8'));
 const games=JSON.parse(await readFile(path.join(root,'library-games.json'),'utf8'));
 if(games.some(game=>game.id==='schedule-i-demo'))return games;
 return [...games.filter(game=>game.id!=='local-schedule-i'),{id:'local-schedule-i',name:'Schedule I Demo',url:'/content/local-schedule-i/index.html',art:'Img/games/schedule-i-demo.jpg',genres:['Simulation','Open World'],addedAt:build.addedAt,localOnly:true}];
}
