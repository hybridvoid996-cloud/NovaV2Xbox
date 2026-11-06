import {isNewLibraryItem} from './library-new.mjs';
const key=g=>(g.kind||'game')+':'+g.id;
function score(value,seed){let n=seed>>>0;for(const c of value){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;return n>>>0}
export function orderLibrary(items,{recent=[],dates={},seed=1,now=Date.now()}={}){const seen=new Map(recent.map((g,i)=>[key(g),i]));return items.map(g=>{const added=g.addedAt||dates[key(g)],fresh=isNewLibraryItem(added,now),rank=seen.get(key(g));return {...g,_new:fresh,_recent:rank!==undefined,_recentRank:rank??Infinity,_added:Date.parse(added)||0,_group:fresh?'new':rank!==undefined?'recent':'all',_shuffle:score(key(g),seed)}}).sort((a,b)=>{const priority={new:0,recent:1,all:2};return priority[a._group]-priority[b._group]||(a._group==='new'?b._added-a._added:a._group==='recent'?a._recentRank-b._recentRank:a._shuffle-b._shuffle)||key(a).localeCompare(key(b))})}

// New arrivals form one section even when older games are sorted by popularity.
export function comparePopular(a,b,counts={}){return Number(b._new)-Number(a._new)||(a._new&&b._new?b._added-a._added:0)||(counts[b.id]||0)-(counts[a.id]||0)}
