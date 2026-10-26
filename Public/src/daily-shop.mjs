import {cosmeticRarityPrices,cosmeticCategoryMultipliers,halloweenEnd} from './shop-config.mjs?v=20261016-economy95';
export const DAY=86400000;
export function cosmeticPrice(item,kind=item.kind){const base=cosmeticRarityPrices[item.rarity]||cosmeticRarityPrices.common;return Math.round(base*(cosmeticCategoryMultipliers[kind]||1))}
function hash(value){let n=2166136261;for(const c of value){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0}
export function dailyShop(items,now=Date.now()){
 const day=Math.floor(now/DAY),endsAt=(day+1)*DAY,groups=[];
 for(const kind of ['decoration','effect','banner','halloween']){
  if(kind==='halloween'&&now>=halloweenEnd)continue;
  const pool=items.filter(a=>(kind==='halloween'?a.collection==='halloween':a.kind===kind&&a.collection!=='halloween')&&['common','uncommon','epic','legendary'].includes(a.rarity));
  let seed=hash('nova-daily-v1:'+day+':'+kind)||1;const shuffled=[...pool].sort((a,b)=>a.id.localeCompare(b.id));
  for(let i=shuffled.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}
  const regular=shuffled.filter(a=>a.rarity!=='legendary');
  const picks=[];
  for(const rarity of ['common','uncommon','epic']){const item=regular.find(a=>a.rarity===rarity);if(item)picks.push(item)}
  for(const item of regular){if(picks.length>=4)break;if(!picks.some(a=>a.id===item.id))picks.push(item)}
  // One collection gets an occasional Legendary; top crate tiers stay exclusive.
  if(day%7===0&&kind===['decoration','effect','banner','halloween'][hash('nova-featured:'+day)%4]){const special=shuffled.find(a=>a.rarity==='legendary');if(special)picks.splice(Math.min(3,picks.length),1,special)}
  const offers=picks.map(item=>({id:item.id,price:cosmeticPrice(item,kind)}));
  if(offers.length)groups.push({kind,offers});
 }
 return {version:1,day,endsAt,groups};
}
