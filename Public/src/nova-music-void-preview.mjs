import {createNovaMusicApp} from './nova-music-app.mjs?v=20261027-public343';
import {NovaMusicEngine} from './nova-music-engine.mjs?v=20261027-public343';
import {NovaMusicService} from './nova-music-service.mjs?v=20261018-search156';
// This compatibility adapter uses only the fixed Voidify backend. Its temporary
// track keys never enter a Nova account or the normal music library.
const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
const tracks=new Map();let app;
const json=data=>Promise.resolve(Response.json(data));
async function request(value,options={}){
 const url=new URL(value,location.origin),op=url.searchParams.get('op');
 if(url.origin!==location.origin)throw Error('Preview requests must stay on Nova.');
 if(op==='stream'){const id=String(url.searchParams.get('id')||'').replace(/^sc:/,'');if(!/^\d{1,20}$/.test(id)||!tracks.has(id))return json({error:'Choose a preview song.'});return json({track:tracks.get(id),url:'/api/soundcloud?op=alternate-audio&id='+id,hls:false})}
 if(['search','catalog'].includes(op)){
  const response=await fetch('/api/soundcloud?op=void-search&q='+encodeURIComponent(url.searchParams.get('q')==='new music'?'ODESZA':url.searchParams.get('q')||'ODESZA'),options);const data=await response.json();if(!response.ok)throw Error(data.error||'Voidify search failed.');
  const list=(data.tracks||[]).map(t=>{const song={...t,id:'sc:'+t.id,src:'sc',playable:true,thumb:t.art?'/api/soundcloud?op=void-art&token='+encodeURIComponent(t.art):''};tracks.set(t.id,song);return song});return json({tracks:list,artists:[],releases:[]});
 }
 if(op==='suggest')return json({queries:[],artists:[],releases:[]});
 if(op==='lyrics')return json({found:false});
 if(op==='fallback')return json({found:false});
 throw Error('This preview uses Voidify music only.');
}
const service=new NovaMusicService({storage,session:storage,requestMusic:async action=>{if(action==='library')return {library:{liked:[],playlists:{}}};throw Error('Use the main Nova Music page to save playlists or join parties. This preview is for testing Voidify playback.')}});
const engine=new NovaMusicEngine({request});
app=await createNovaMusicApp({catalogName:'Voidify',host:document.getElementById('nova-music'),request,engine,service,storage,profile:()=>({name:'Voidify preview'}),onState:state=>{if(!state.track){const subtitle=document.querySelector('.nmc-player-info small');if(subtitle)subtitle.textContent='Music from Voidify'}const badge=document.querySelector('.nmc-source');if(badge)badge.textContent='Voidify preview'}});
const search=document.querySelector('.nmc-search input');search.placeholder='Search Voidify songs or artists';search.setAttribute('aria-label','Search Voidify');
addEventListener('pagehide',()=>app.dispose(),{once:true});


