// Load locally packaged HTML games without a single oversized repository file.
export async function loadPackedGamePage(manifestURL){
 const status=document.getElementById('status'),progress=document.getElementById('progress'),retry=document.getElementById('retry');
 retry.onclick=()=>location.reload();
 try{
  if(typeof DecompressionStream==='undefined')throw Error('Please open this game in an up-to-date browser.');
  const response=await fetch(manifestURL);if(!response.ok)throw Error('The game file list could not load.');
  const manifest=await response.json();if(manifest.encoding!=='gzip'||!Number.isSafeInteger(manifest.bytes)||manifest.bytes<=0||!Array.isArray(manifest.parts)||!manifest.parts.length)throw Error('The game file list is invalid.');
  const total=manifest.parts.reduce((sum,p)=>sum+p.bytes,0);progress.max=total;let received=0;const chunks=[];
  for(const part of manifest.parts){
   if(!/^[A-Za-z0-9_.-]+$/.test(part.file)||!Number.isSafeInteger(part.bytes)||part.bytes<=0)throw Error('The game file list is invalid.');
   const url=new URL(part.file,manifestURL);if(url.origin!==location.origin)throw Error('The game files must be hosted by Nova.');
   const r=await fetch(url);if(!r.ok)throw Error('A game file could not download. Please retry.');
   const reader=r.body.getReader();let size=0;while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);size+=value.length;received+=value.length;progress.value=received;status.textContent='Loading game files… '+Math.min(100,Math.round(received/total*100))+'%'}
   if(size!==part.bytes)throw Error('A game download was incomplete. Please retry.');
  }
  status.textContent='Preparing Mindustry…';
  const unpacked=await new Response(new Blob(chunks).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  if(unpacked.byteLength!==manifest.bytes)throw Error('The game download could not be verified.');
  const html=new TextDecoder().decode(unpacked);
  document.open();document.write(html);document.close();
 }catch(error){status.textContent=error.message||'The game could not load. Please retry.';progress.hidden=true;retry.hidden=false}
}
