import {recordShopPurchase} from './shop-purchase-feed.mjs';
import {dailyShop} from '../Public/src/daily-shop.mjs';
import {SHOP_SEASON} from './shop-season.mjs';
export function settleDailyPurchase(root,uid,b,items,now,initial){
 if(!/^[a-f0-9-]{36}$/.test(b.requestId||''))throw Error('A purchase ID is required.');
 const existing=root.purchases?.[uid]?.[b.requestId];
 if(existing){if(existing.action!=='buyDailyCosmetic'||existing.item!==b.id||existing.day!==b.day)throw Error('Purchase ID was already used.');return existing}
 if(root.shopSeason?.version!==SHOP_SEASON||root.shopSeason.status!=='ready')throw Error('The shop is preparing. Try again shortly.');
 const rotation=dailyShop(items,now);if(!Number.isInteger(b.day)||b.day!==rotation.day)throw Error('The daily shop refreshed. Refresh the shop to see the new selection.');
 const offer=rotation.groups.flatMap(g=>g.offers).find(o=>o.id===b.id),item=items.find(a=>a.id===b.id);if(!offer||!item)throw Error('This cosmetic is not in the daily shop.');
 root.inventory||={};const inventory=root.inventory[uid]||={};if(inventory[item.id]?.count>0)throw Error('You already own this cosmetic.');
 root.progress||={};const progress=root.progress[uid]||=initial();if(!Number.isSafeInteger(progress.coins)||progress.coins<offer.price)throw Error('You need '+offer.price.toLocaleString()+' Nova Coins.');
 progress.coins-=offer.price;inventory[item.id]={count:1,unlockedAt:now};root.purchases||={};root.purchases[uid]||={};const receipt={action:'buyDailyCosmetic',item:item.id,day:rotation.day,cost:offer.price,season:SHOP_SEASON,at:now};root.purchases[uid][b.requestId]=receipt;recordShopPurchase(root,uid,b.requestId,{label:item.name,items:[item.id],cost:offer.price,at:now});return receipt;
}
