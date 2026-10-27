import {createAchcromaCatalog} from './movie-achcroma.mjs';
import {mergeMovieShelves} from './movie-shelf-merge.mjs';
import {resolveAnimeBackup} from './movie-anime-backup.mjs';
const bounded=(promise,ms)=>new Promise(resolve=>{const timer=setTimeout(()=>resolve(null),ms);promise.then(value=>{clearTimeout(timer);resolve(value)},()=>{clearTimeout(timer);resolve(null)})});
export function withMovieBackup(primary,{request=fetch,now=Date.now}={}){const backup=createAchcromaCatalog(request),cache=new Map();return async(req,res)=>{
 const p=new URL(req.url,'http://nova.local').searchParams,op=p.get('op')||'home',type=p.get('type')||'movie',id=p.get('id')||'',q=(p.get('q')||'').trim();
 if(!['GET','HEAD'].includes(req.method)||!['home','browse','anime','search','details','season','achcromaList'].includes(op)||op==='search'&&(!q||q.length>120)||['details','season'].includes(op)&&(!/^\d{1,9}$/.test(id)||!['movie','tv','anime'].includes(type))||op==='season'&&!/^\d{1,3}$/.test(p.get('season')||'1')||op==='browse'&&!['movie','tv'].includes(type))return primary(req,res);
 const reply=(code,data)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))};
 const key=p.toString(),old=cache.get(key);if(old&&old.until>now())return reply(200,old.data);
 if(op==='achcromaList'){try{const data=await backup(op,p);return reply(200,data)}catch(e){return reply(400,{error:e.message})}}
 const original=(async()=>{let status=200,body;await primary(req,{set statusCode(v){status=v},get statusCode(){return status},setHeader(){},end(v){body=v}});if(status!==200)throw Error('Primary catalog unavailable');const data=JSON.parse(body);return data})();
 // AniList IDs are never sent to a TMDB player or title endpoint.
 const extra=type==='anime'&&op==='details'?Promise.reject(Error('AniList identifier')):backup(op,p);
 const [base,add]=await Promise.all([bounded(original,1800),bounded(extra,1800)]);
 let data;if(p.get('source')==='achcroma'&&add)data=add;else if(op==='search'&&base&&add){const map=new Map();for(const item of [...add.results,...base.results])map.set((item.type||'movie')+':'+item.id,item);data={...base,results:[...map.values()]}}
 else if(['home','browse','anime'].includes(op)&&base&&add)data=mergeMovieShelves([base,add]);else data=base||add;
 if(!data)data=await bounded(Promise.any([original,extra]),6500);
 if(!data)return reply(502,{error:'The movie catalogs could not connect. Please retry shortly.'});
 if(op==='details'&&type==='anime'){const mapped=await bounded(resolveAnimeBackup(data,backup),2500);if(mapped)data={...data,playbackBackup:mapped}}
 cache.set(key,{data,until:now()+120000});if(cache.size>100)cache.delete(cache.keys().next().value);return reply(200,data);
 };
}
