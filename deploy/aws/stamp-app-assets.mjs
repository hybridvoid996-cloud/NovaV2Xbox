import {readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
export function stampAssetReferences(source,revision,html=false){
 const stamp=url=>/^(?:https?:|data:|blob:|#)/i.test(url)?url:url.replace(/[?].*$/,'')+'?v='+encodeURIComponent(revision);
 if(html)return source.replace(/(<(?:script|link)\b[^>]*?\b(?:src|href)=["'])([^"']+\.(?:m?js|css)(?:\?[^"']*)?)(["'])/gi,(_,a,url,b)=>a+stamp(url)+b);
 return source.replace(/(\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(["'])(\.{1,2}\/[^"']+\.(?:m?js|css)(?:\?[^"']*)?)\2/g,(_,prefix,quote,url)=>prefix+quote+stamp(url)+quote).replace(/(["'])(\/src\/[^"']+\.(?:m?js|css)(?:\?[^"']*)?)\1/g,(_,quote,url)=>quote+stamp(url)+quote);
}
export async function stampAppAssets(root,revision,nested=false){
 for(const entry of await readdir(root,{withFileTypes:true})){
  const file=path.join(root,entry.name);
  if(entry.isDirectory()){if(nested||entry.name==='src')await stampAppAssets(file,revision,true);continue}
  if(!/\.(?:html|m?js|css)$/.test(entry.name))continue;
  const source=await readFile(file,'utf8'),next=stampAssetReferences(source,revision,entry.name.endsWith('.html'));
  if(next!==source)await writeFile(file,next);
 }
}
