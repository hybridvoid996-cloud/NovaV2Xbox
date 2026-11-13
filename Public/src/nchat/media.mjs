// Nova Chat media: image viewer (zoom + pan), custom video player, and upload helpers.
import {el,h,icon,toast} from './core.mjs';

export const MAX_VIDEO_BYTES=100*1024*1024;   // "decent size": up to 100 MB
export const MAX_VIDEO_SECONDS=5*60;          // and up to 5 minutes
export const MAX_IMAGE_DATA=2_700_000;        // data URL limit allowed by the chat rules

export function openImage(src,name=''){
 const d=el('dialog','nmv');let scale=1,x=0,y=0,drag=null;
 const img=el('img','nmv-img');img.src=src;img.alt=name;img.draggable=false;
 const stage=el('div','nmv-stage');stage.append(img);
 const apply=()=>{img.style.transform=`translate(${x}px,${y}px) scale(${scale})`;zoomLabel.textContent=Math.round(scale*100)+'%'};
 const zoom=f=>{scale=Math.min(6,Math.max(1,scale*f));if(scale===1){x=y=0}apply()};
 const bar=el('div','nmv-bar'),zoomLabel=el('span','nmv-zoom','100%');
 const btn=(ic,label,fn)=>{const b=h('button',{type:'button',class:'nc-icon-btn','aria-label':label,title:label},icon(ic));b.onclick=fn;return b};
 const dl=h('a',{class:'nc-icon-btn',href:src,download:name||'image',title:'Download','aria-label':'Download'},icon('download'));
 bar.append(el('span','nmv-name',name||'Image'),btn('zoomin','Zoom in',()=>zoom(1.4)),zoomLabel,btn('search','Reset zoom',()=>{scale=1;x=y=0;apply()}),dl,btn('x','Close',()=>d.close()));
 stage.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.15:1/1.15)},{passive:false});
 stage.addEventListener('dblclick',()=>zoom(scale>1?0.01:2.2));
 stage.addEventListener('pointerdown',e=>{if(scale<=1)return;drag={sx:e.clientX-x,sy:e.clientY-y};stage.setPointerCapture(e.pointerId)});
 stage.addEventListener('pointermove',e=>{if(!drag)return;x=e.clientX-drag.sx;y=e.clientY-drag.sy;apply()});
 stage.addEventListener('pointerup',()=>drag=null);
 stage.addEventListener('click',e=>{if(e.target===stage)d.close()});
 d.append(stage,bar);document.body.append(d);d.addEventListener('close',()=>d.remove());d.showModal();
}

const clock=s=>{s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
export function videoPlayer(src,name=''){
 const box=el('div','nvp');const v=el('video');v.src=src;v.preload='metadata';v.playsInline=true;
 const big=h('button',{type:'button',class:'nvp-big','aria-label':'Play'},icon('play'));
 const bar=el('div','nvp-bar'),play=h('button',{type:'button',class:'nc-icon-btn sm','aria-label':'Play'},icon('play'));
 const seek=h('input',{type:'range',min:'0',max:'1000',value:'0',class:'nvp-seek','aria-label':'Seek'}),time=el('span','nvp-time','0:00');
 const vol=h('button',{type:'button',class:'nc-icon-btn sm','aria-label':'Mute'},icon('volume')),volume=h('input',{type:'range',min:'0',max:'1',step:'0.05',value:'1',class:'nvp-vol','aria-label':'Volume'});
 const speed=h('button',{type:'button',class:'nvp-speed',title:'Playback speed'},'1×');
 const pip=h('button',{type:'button',class:'nc-icon-btn sm','aria-label':'Picture in picture',title:'Picture in picture'},icon('image'));
 const full=h('button',{type:'button',class:'nc-icon-btn sm','aria-label':'Fullscreen'},icon('full'));
 bar.append(play,seek,time,vol,volume,speed,pip,full);box.append(v,big,bar,el('span','nvp-name',name||'Video'));
 const toggle=()=>v.paused?v.play().catch(()=>{}):v.pause();
 big.onclick=play.onclick=toggle;v.onclick=toggle;
 v.onplay=()=>{box.classList.add('playing');play.replaceChildren(icon('pause'))};v.onpause=()=>{box.classList.remove('playing');play.replaceChildren(icon('play'))};
 v.ontimeupdate=()=>{if(v.duration){seek.value=String(v.currentTime/v.duration*1000);seek.style.setProperty('--p',v.currentTime/v.duration*100+'%')}time.textContent=clock(v.currentTime)+' / '+clock(v.duration)};
 v.onloadedmetadata=v.ontimeupdate;
 seek.oninput=()=>{if(v.duration)v.currentTime=seek.value/1000*v.duration};
 volume.oninput=()=>{v.volume=Number(volume.value);v.muted=v.volume===0;vol.replaceChildren(icon(v.muted?'mute':'volume'))};
 vol.onclick=()=>{v.muted=!v.muted;vol.replaceChildren(icon(v.muted?'mute':'volume'))};
 const rates=[1,1.25,1.5,2,0.5,0.75];speed.onclick=()=>{const i=(rates.indexOf(v.playbackRate)+1)%rates.length;v.playbackRate=rates[i];speed.textContent=rates[i]+'×'};
 pip.onclick=()=>{if(document.pictureInPictureElement)document.exitPictureInPicture().catch(()=>{});else v.requestPictureInPicture?.().catch(()=>toast('Picture in picture is not available here.'))};
 full.onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else box.requestFullscreen?.().catch(()=>{})};
 box.tabIndex=0;box.onkeydown=e=>{if(e.key===' '||e.key==='k'){e.preventDefault();toggle()}else if(e.key==='ArrowRight')v.currentTime+=5;else if(e.key==='ArrowLeft')v.currentTime-=5;else if(e.key==='f')full.onclick()};
 return box;
}

/** Shrinks big photos so they upload fast and fit the chat's size limit. GIFs keep their animation. */
export async function prepareImage(file){
 if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type))throw Error('Use a PNG, JPG, WebP or GIF image.');
 const read=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)});
 if(file.type==='image/gif'){if(file.size>2_000_000)throw Error('GIFs can be up to 2 MB.');return {url:await read(file),type:'image',name:file.name.slice(0,100)}}
 const bitmap=await createImageBitmap(file);let w=bitmap.width,hgt=bitmap.height;const max=1920;if(Math.max(w,hgt)>max){const s=max/Math.max(w,hgt);w=Math.round(w*s);hgt=Math.round(hgt*s)}
 const c=document.createElement('canvas');c.width=w;c.height=hgt;c.getContext('2d').drawImage(bitmap,0,0,w,hgt);
 let q=0.88,url=c.toDataURL('image/webp',q);while(url.length>MAX_IMAGE_DATA&&q>0.4){q-=0.12;url=c.toDataURL('image/webp',q)}
 if(url.length>MAX_IMAGE_DATA)throw Error('That image is too large even after compressing. Try a smaller one.');
 return {url,type:'image',name:file.name.replace(/\.[^.]+$/,'.webp').slice(0,100)};
}
export function videoDuration(file){return new Promise(res=>{const v=document.createElement('video');v.preload='metadata';v.onloadedmetadata=()=>{res(v.duration);URL.revokeObjectURL(v.src)};v.onerror=()=>res(0);v.src=URL.createObjectURL(file)})}
