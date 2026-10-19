(()=>{
 const install=(mapping)=>{
  const original=window.fetch.bind(window),pending=new Map();
  window.fetch=async(input,options)=>{
   const url=typeof input==='string'?input:input?.url;
   const key=Object.keys(mapping).find(name=>{try{return new URL(url,document.baseURI).pathname.endsWith('/'+name)}catch{return false}});
   if(!key||(options?.method&&options.method!=='GET')||(input?.method&&input.method!=='GET'))return original(input,options);
   if(!pending.has(key))pending.set(key,(async()=>{
    const chunks=[];
    for(const part of mapping[key]){
     let response;
     for(let attempt=0;attempt<2;attempt++){try{response=await original(part);if(!response.ok)throw Error('Missing game part: '+part+' (HTTP '+response.status+')');chunks.push(await response.arrayBuffer());break}catch(error){if(attempt)throw error}}
    }
    return new Blob(chunks,{type:'application/octet-stream'});
   })().catch(error=>{pending.delete(key);throw error}));
   const blob=await pending.get(key);return new Response(blob,{status:200,headers:{'Content-Type':'application/octet-stream','Content-Length':String(blob.size)}});
  };
 };
 window.NovaSplitAssets={install};
})();
