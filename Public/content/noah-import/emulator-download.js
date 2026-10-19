(()=>{
 const Emulator=typeof EmulatorJS==='function'?EmulatorJS:window.EmulatorJS;
 if(!Emulator){document.documentElement.dataset.novaEmulatorDownload='unavailable';return;}
 document.documentElement.dataset.novaEmulatorDownload='fetch136';
 Emulator.prototype.downloadFile=function(file,done,progress,absolute,options={}){
  const inline=this.toData(file);
  if(inline){inline.then(data=>done({headers:{},data}));return;}
  let url=(absolute?'':this.config.dataPath)+file;
  const mapped=this.config.filePaths?.[url.split('/').pop()];if(!absolute&&typeof mapped==='string')url=mapped;
  (async()=>{
   let data,headers;
   try{
    const response=await fetch(url,{method:options.method||'GET'});if(!response.ok)throw Error('Emulator file unavailable: '+response.status);
    headers={'content-length':response.headers.get('content-length')};
    if(options.method==='HEAD'){done({headers});return;}
    const type=options.responseType||options.type||'arraybuffer';
    if(type==='arraybuffer')data=await response.arrayBuffer();else{data=await response.text();try{data=JSON.parse(data)}catch{}}
    if(data==null)throw Error('Empty emulator download');
   }catch{done(-1);return;}
   if(typeof progress==='function')progress(' 100%');done({headers,data});
  })();
 };
 Emulator.prototype.downloadGameCore=async function(){
  try{
   this.textElem.innerText=this.localization('Download Game Core');
   const unpacked={"fceumm": {"js": "fceumm_libretro.js", "wasm": "fceumm_libretro.wasm"}, "gambatte": {"js": "gambatte_libretro.js", "wasm": "gambatte_libretro.wasm"}, "genesis_plus_gx": {"js": "genesis_plus_gx_libretro.js", "wasm": "genesis_plus_gx_libretro.wasm"}, "melonds": {"js": "melonds_libretro.js", "wasm": "melonds_libretro.wasm"}, "mgba": {"js": "mgba_libretro.js", "wasm": "mgba_libretro.wasm"}, "mupen64plus_next": {"js": "mupen64plus_next_libretro.js", "wasm": "mupen64plus_next_libretro.wasm"}, "pcsx_rearmed": {"js": "pcsx_rearmed_libretro.js", "wasm": "pcsx_rearmed_libretro.wasm"}, "snes9x": {"js": "snes9x_libretro.js", "wasm": "snes9x_libretro.wasm"}};
   const selected=unpacked[this.getCore()];
   if(selected&&!this.config.threads){
    const base=this.config.dataPath+'cores/unpacked/'+this.getCore()+'/';
    const wasmResponse=await fetch(base+selected.wasm);
    if(!wasmResponse.ok)throw Error('Emulator core files unavailable');
    this.initModule(new Uint8Array(await wasmResponse.arrayBuffer()));
    const script=document.createElement('script');script.src=base+selected.js;
    script.onerror=()=>{this.textElem.innerText='Emulator core script unavailable';this.textElem.style.color='red'};
    document.body.appendChild(script);return;
   }
   const name=this.getCore()+(this.config.threads?'-thread':'')+'-wasm.data';
   const response=await fetch(this.config.dataPath+'cores/'+name);
   if(!response.ok)throw Error('Emulator core unavailable: '+response.status);
   const bytes=new Uint8Array(await response.arrayBuffer());document.documentElement.dataset.novaCoreBytes=String(bytes.length);if(!bytes.length)throw Error('Empty emulator core');
   const files=await this.checkCompression(bytes,this.localization('Decompress Game Core'));
   let js,wasm,worker;for(const [name,data]of Object.entries(files)){if(name.endsWith('.wasm'))wasm=data;else if(name.endsWith('.worker.js'))worker=data;else if(name.endsWith('.js'))js=data;}
   if(!js||!wasm)throw Error('Incomplete emulator core');this.initGameCore(js,wasm,worker);
  }catch(error){this.textElem.innerText=error.message;this.textElem.style.color='red';}
 };

})();
