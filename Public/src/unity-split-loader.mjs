export async function loadSplitWasm(parts,{request=fetch,progress=()=>{},delay=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const total=parts.reduce((n,p)=>n+p.size,0);if(!Number.isSafeInteger(total)||total<=0||total>96*1024*1024)throw Error('Invalid game engine size.');
 const merged=new Uint8Array(total);let offset=0;
 for(const part of parts){let bytes;
  for(let attempt=0;attempt<3;attempt++){
   try{const response=await request(part.url,{cache:'force-cache',signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error('Game file unavailable ('+response.status+').');bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length!==part.size)throw Error('Game download was incomplete.');break;}
   catch(error){if(attempt===2)throw error;await delay(1000*(attempt+1));}
  }
  merged.set(bytes,offset);offset+=bytes.length;progress(offset/total);
 }
 if(merged[0]!==0||merged[1]!==97||merged[2]!==115||merged[3]!==109||merged[4]!==1)throw Error('Downloaded game engine is invalid.');
 return merged;
}
