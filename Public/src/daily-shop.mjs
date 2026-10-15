import {shopPrices,halloweenEnd} from './shop-config.mjs';
export const DAY=86400000;
export function cosmeticPrice(item,kind=item.kind){const multiplier={common:2,uncommon:3,epic:6,legendary:10,mythic:20,singularity:40}[item.rarity]||2;return shopPrices[kind][1]*multiplier}
function hash(value){let n=2166136261;for(const c of value){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0}
export function dailyShop(items,now=Date.now()){
 const day=Math.floor(now/DAY),endsAt=(day+1)*DAY,groups=[];
 for(const kind of ['decoration','effect','banner','halloween']){
  if(kind==='halloween'&&now>=halloweenEnd)continue;
  const pool=items.filter(a=>kind==='halloween'?a.collection==='halloween':a.kind===kind&&a.collection!=='halloween');
  let seed=hash('nova-daily-v1:'+day+':'+kind)||1;const shuffled=[...pool].sort((a,b)=>a.id.localeCompare(b.id));
  for(let i=shuffled.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}
  const offers=shuffled.slice(0,6).map(item=>({id:item.id,price:cosmeticPrice(item,kind)}));
  if(offers.length)groups.push({kind,offers});
 }
 return {version:1,day,endsAt,groups};
}
