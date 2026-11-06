export function cosmeticLayers(item){
 if(!item)return [];
 if(Array.isArray(item.layers)&&item.layers.length)return item.layers.filter(x=>typeof x.src==='string').map(x=>({...x}));
 return item.src?[{src:item.src,position:'fill'}]:[];
}
function styles(){if(document.getElementById('cosmetic-renderer-style'))return;const s=document.createElement('style');s.id='cosmetic-renderer-style';s.textContent=`.nova-cosmetic-surface{position:relative;isolation:isolate}.nova-cosmetic-layer{position:absolute;pointer-events:none!important;user-select:none;max-width:none!important;object-fit:fill;z-index:4}.nova-cosmetic-layer.is-back{z-index:0}.nova-cosmetic-layer.is-fill{inset:0;width:100%;height:100%;object-fit:cover;object-position:top}.nova-cosmetic-layer.is-frame{height:auto}.nova-cosmetic-surface>.nova-profile-body,.nova-cosmetic-surface>.nova-profile-banner{position:relative;z-index:1}.nova-cosmetic-surface.is-framed{overflow:visible!important}.nova-cosmetic-surface.is-framed>.nova-profile-body{border-radius:0 0 16px 16px}.nova-full-profile>.nova-profile-card.is-framed{max-height:none;align-self:start}.nova-full-profile>.nova-profile-card.is-framed>.nova-profile-body{max-height:calc(70dvh - 140px);overflow:auto;scrollbar-width:none}.nova-mini-profile>.nova-profile-card.is-framed>.nova-profile-body{max-height:calc(74dvh - 140px);overflow:auto;scrollbar-width:none}.nova-profile-card.is-framed>.nova-profile-body::-webkit-scrollbar{display:none}.nova-cosmetic-surface.is-framed>.nova-profile-banner{border-radius:16px 16px 0 0}`;document.head.append(s)}
export function mountProfileCosmetic(host,item,{animated=true,className=''}={}){
 styles();host.classList.add('nova-cosmetic-surface');const frame=item?.renderMode==='profile-frame';host.classList.toggle('is-framed',frame);
 const nodes=[];for(const layer of cosmeticLayers(item)){
 const img=document.createElement('img');img.alt='';img.draggable=false;img.decoding='async';img.className='nova-cosmetic-layer '+(frame?'is-frame':'is-fill')+(layer.back?' is-back':'')+' '+className;
 img.onerror=()=>img.remove();
 if(frame){const width=Number.isFinite(layer.width)?layer.width:1;img.style.width=width*100+'%';img.style.left=(layer.left||0)*100+'%';// Percent vertical offsets are relative to width, matching the original frame artwork.
 const offset=layer.offset??layer.top??0;
 img.style[layer.position==='bottom'?'bottom':'top']='0';img.style.transform=`translateY(${(layer.position==='bottom'?-1:1)*offset/(layer.height||1)*100}%)`;
 }else if(layer.position!=='fill'){img.style.height='auto';img.style.width=(layer.width||1)*100+'%';img.style.left=(layer.left||0)*100+'%';img.style.top='0';img.style.transform=`translateY(${(layer.top||0)/(layer.height||1)*100}%)`;}
 img.src=animated||frame?layer.src:(layer.thumbnail||item.thumbnail||layer.src);host.append(img);nodes.push(img);
 }
 const dispose=()=>nodes.forEach(n=>n.remove());return {nodes,dispose};
}


