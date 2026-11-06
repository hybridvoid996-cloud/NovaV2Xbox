// Sample only a tiny thumbnail once; never animate filters or sample every frame.
export function styleLaunchArtwork(doc,item){
 const icon=doc.getElementById('launch-icon'),loader=doc.getElementById('loader');
 if(!icon||!loader)return;
 icon.alt=item.name+' icon';
 icon.onload=()=>{try{const c=doc.createElement('canvas');c.width=c.height=12;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(icon,0,0,12,12);const pixels=ctx.getImageData(0,0,12,12).data;let r=0,g=0,b=0,total=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<128)continue;const max=Math.max(pixels[i],pixels[i+1],pixels[i+2]),min=Math.min(pixels[i],pixels[i+1],pixels[i+2]);const weight=1+(max-min)/32;r+=pixels[i]*weight;g+=pixels[i+1]*weight;b+=pixels[i+2]*weight;total+=weight}if(total)loader.style.setProperty('--launch-color',`${Math.round(r/total)},${Math.round(g/total)},${Math.round(b/total)}`)}catch{/* Cross-origin artwork keeps the neutral fallback. */}};
 icon.onerror=()=>{icon.onerror=null;icon.src='Nova12.png'};
 icon.crossOrigin='anonymous';icon.src=item.art||'Nova12.png';
}
