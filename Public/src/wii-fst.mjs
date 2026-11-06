// Wii's published file-system table already contains each file's byte size.
// Reading it once avoids a network size check for every game asset.
export function wiiFstSizes(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(bytes.byteLength<12||(view.getUint32(0)>>>24)!==1)throw Error('Invalid Wii file table');
 const count=view.getUint32(8),names=count*12;
 if(count<1||count>100000||names>bytes.byteLength)throw Error('Invalid Wii file count');
 const decoder=new TextDecoder(),stack=[{end:count,path:''}],result=[];
 for(let i=1;i<count;i++){
  while(stack.length&&i>=stack[stack.length-1].end)stack.pop();
  if(!stack.length)throw Error('Invalid Wii directory');
  const p=i*12,tag=view.getUint32(p),start=names+(tag&0xffffff);
  if(start>=bytes.byteLength)throw Error('Invalid Wii file name');
  let end=start;while(end<bytes.byteLength&&bytes[end]!==0)end++;
  if(end===bytes.byteLength)throw Error('Unterminated Wii file name');
  const name=decoder.decode(bytes.subarray(start,end));
  if(!name||name==='.'||name==='..'||/[\\/]/.test(name))throw Error('Unsafe Wii file name');
  const path=stack[stack.length-1].path+name,n=view.getUint32(p+8);
  if(tag>>>24){if(n<=i||n>stack[stack.length-1].end)throw Error('Invalid Wii directory range');stack.push({end:n,path:path+'/'});}
  else result.push(['game/files/'+path,n],['game/part/files/'+path,n]);
 }
 return result;
}
