// Nova Shop gifts: a player sends a crate opening, one of their cosmetics, or a daily-shop
// cosmetic to another player. The sender pays (or gives up the item) when the gift is sent;
// the recipient receives the cosmetics when they open the gift. Crate rewards are rolled when
// the gift is bought so a retried request can never re-roll them.
import {shopPrices,crateNames,cratePool} from '../Public/src/shop-config.mjs';
import {dailyShop} from '../Public/src/daily-shop.mjs';
import {recordShopPurchase} from './shop-purchase-feed.mjs';
import {SHOP_SEASON,HALLOWEEN_END} from './shop-season.mjs';

export const GIFT_NOTE_MAX=140;
const validId=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
const validUid=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id);
const TRADABLE=['decoration','effect','banner'];

/** Validates a gift request against the current catalog before any coins are touched. */
export function giftPlan(b,items,now,roll){
 if(!validId(b.requestId))throw Error('A gift ID is required.');
 if(!validUid(b.to))throw Error('Choose a Nova player.');
 const note=String(b.note||'').replace(/\s+/g,' ').trim().slice(0,GIFT_NOTE_MAX);
 if(b.type==='crate'){
  if(!shopPrices[b.kind]||![1,3,7,10].includes(b.count))throw Error('Choose a valid crate bundle.');
  if(b.kind==='halloween'&&now>=HALLOWEEN_END)throw Error('The Halloween collection has ended.');
  if(!cratePool(items,b.kind).length)throw Error('This crate is unavailable.');
  return {type:'crate',kind:b.kind,count:b.count,cost:shopPrices[b.kind][b.count],items:roll(b.kind,b.count).map(a=>a.id),note,label:b.count+'× '+crateNames[b.kind]};
 }
 if(b.type==='item'){
  const item=items.find(a=>a.id===b.id&&TRADABLE.includes(a.kind));if(!item)throw Error('Choose one of your cosmetics.');
  return {type:'item',cost:0,items:[item.id],note,label:item.name};
 }
 if(b.type==='daily'){
  const rotation=dailyShop(items,now);if(!Number.isInteger(b.day)||b.day!==rotation.day)throw Error('The daily shop refreshed. Refresh the shop to see the new selection.');
  const offer=rotation.groups.flatMap(g=>g.offers).find(o=>o.id===b.id),item=items.find(a=>a.id===b.id);if(!offer||!item)throw Error('This cosmetic is not in the daily shop.');
  return {type:'daily',cost:offer.price,items:[item.id],day:rotation.day,note,label:item.name};
 }
 throw Error('Choose what to gift.');
}

/** Pure settlement inside the novaControl transaction. Checks everything before changing anything. */
export function settleGift(root,uid,b,plan,{now,initial,fromName}){
 const receipt=root.purchases?.[uid]?.[b.requestId];
 if(receipt){if(receipt.action!=='gift'||receipt.recipient!==b.to||receipt.type!==plan.type)throw Error('Gift ID was already used.');return root.shopGifts?.[b.to]?.[b.requestId]||receipt}
 if(root.shopSeason?.version!==SHOP_SEASON||root.shopSeason.status!=='ready')throw Error('The shop is preparing. Retry shortly.');
 if(b.to===uid)throw Error('Choose another Nova player.');
 if(root.siteBans?.[uid]||root.siteBans?.[b.to])throw Error('This player is unavailable.');
 const pending=Object.values(root.shopGifts?.[b.to]||{}).filter(g=>!g.opened).length;if(pending>=50)throw Error('That player has too many unopened gifts.');
 const coins=root.progress?.[uid]?.coins??initial().coins;
 if(plan.cost&&!(Number.isSafeInteger(coins)&&coins>=plan.cost))throw Error('You need '+plan.cost.toLocaleString()+' Nova Coins.');
 const owned=root.inventory?.[uid]?.[plan.items[0]];
 if(plan.type==='item'&&!(owned?.count>0))throw Error('You no longer own this cosmetic.');
 if(plan.type==='daily'){
  if(root.inventory?.[b.to]?.[plan.items[0]]?.count>0)throw Error('That player already owns this cosmetic.');
  if(Object.values(root.shopGifts?.[b.to]||{}).some(g=>!g.opened&&g.items?.includes(plan.items[0])))throw Error('That cosmetic is already waiting in their gifts.');
 }
 // All checks passed: apply.
 root.progress||={};const progress=root.progress[uid]||=initial();
 if(plan.cost)progress.coins-=plan.cost;
 if(plan.type==='item'){const inventory=root.inventory[uid];if(inventory[plan.items[0]].count<=1)delete inventory[plan.items[0]];else inventory[plan.items[0]].count--}
 const gift={id:b.requestId,from:uid,fromName:String(fromName||'A Nova player').slice(0,100),to:b.to,type:plan.type,items:plan.items,label:plan.label,at:now,opened:false,season:SHOP_SEASON};
 if(plan.type==='crate'){gift.kind=plan.kind;gift.count=plan.count}
 if(plan.note)gift.note=plan.note;
 root.shopGifts||={};root.shopGifts[b.to]||={};root.shopGifts[b.to][b.requestId]=gift;
 root.purchases||={};root.purchases[uid]||={};
 root.purchases[uid][b.requestId]={action:'gift',type:plan.type,recipient:b.to,cost:plan.cost,rewards:plan.items,season:SHOP_SEASON,at:now};
 if(plan.cost)recordShopPurchase(root,uid,b.requestId,{label:'Gift · '+plan.label,items:plan.type==='crate'?[]:plan.items,cost:plan.cost,at:now});
 return gift;
}

/** Recipient opens a gift: its cosmetics move into their locker exactly once. */
export function settleOpenGift(root,uid,id,now){
 const gift=root.shopGifts?.[uid]?.[id];if(!gift)throw Error('Gift not found.');
 if(gift.opened)return gift;
 root.inventory||={};const inventory=root.inventory[uid]||={};
 for(const item of gift.items||[])inventory[item]={...inventory[item],count:(inventory[item]?.count||0)+1,unlockedAt:inventory[item]?.unlockedAt||now};
 gift.opened=true;gift.openedAt=now;return gift;
}

const publicGift=(gift,items)=>({id:gift.id,type:gift.type,from:gift.from,fromName:gift.fromName,label:gift.label,kind:gift.kind||null,count:gift.count||null,note:gift.note||'',at:gift.at,opened:!!gift.opened,
 items:(gift.items||[]).map(id=>items.find(a=>a.id===id)).filter(Boolean)});

async function transact(db,apply){
 let failure,result;
 const tx=await db.ref('novaControl').transaction(root=>{failure=null;if(root===null)return null;
  // A thrown check leaves root untouched; returning it lets Firebase compare a stale local copy
  // with the server and re-run, instead of rejecting a real balance or inventory.
  try{result=apply(root)}catch(e){failure=e.message}return root});
 if(!tx.committed)throw Error(failure||'The gift could not be saved. Retry.');
 if(failure)throw Error(failure);
 return {root:tx.snapshot.val(),result};
}

export async function giftAction({db,uid,account,action,b,now,initial,items,roll}){
 if(action==='giftInbox'){
  const rows=(await db.ref('novaControl/shopGifts/'+uid).get()).val()||{};
  // Crate gifts carry a small sample of the crate so Home can spin the reel without loading the whole catalog.
  const sample=kind=>{const pool=cratePool(items,kind);return Array.from({length:Math.min(40,pool.length)},(_,i)=>pool[(i*97+7)%pool.length]).map(({id,name,kind,rarity,thumbnail,src})=>({id,name,kind,rarity,thumbnail,src}))};
  const gifts=Object.values(rows).filter(g=>g&&!g.opened).sort((a,z)=>a.at-z.at).slice(0,20).map(g=>({...publicGift(g,items),pool:g.type==='crate'?sample(g.kind):[]}));
  return {gifts};
 }
 if(action==='openGift'){
  if(!validId(b.id))throw Error('Choose a gift.');
  const {root}=await transact(db,root=>settleOpenGift(root,uid,b.id,now));
  const gift=root.shopGifts?.[uid]?.[b.id];if(!gift?.opened)throw Error('Gift could not be opened. Retry.');
  return {ok:true,gift:publicGift(gift,items),inventory:root.inventory?.[uid]||{}};
 }
 // sendGift
 const plan=giftPlan(b,items,now,roll);
 const [other,blocked,reverse]=await Promise.all([db.ref('novaAccounts/'+b.to).get(),db.ref('novaChatV2/blocks/'+b.to+'/'+uid).get(),db.ref('novaChatV2/blocks/'+uid+'/'+b.to).get()]);
 if(!other.exists()||blocked.val()||reverse.val())throw Error('This player is unavailable.');
 const {root}=await transact(db,root=>settleGift(root,uid,b,plan,{now,initial,fromName:account?.name}));
 const gift=root.shopGifts?.[b.to]?.[b.requestId];if(!gift)throw Error('Gift was not saved.');
 if(gift.from!==uid)throw Error('Gift ID was already used.');
 if(plan.type==='item'&&!root.inventory?.[uid]?.[plan.items[0]]){
  // The sender gave away their last copy: take it off their profile.
  await db.ref('novaChatV2/profiles/'+uid).transaction(p=>{if(!p)return p;for(const field of ['decoration','effect','chatBanner','banner'])if(p[field]===plan.items[0])delete p[field];return p}).catch(()=>{});
 }
 await db.ref('novaChatV2/botMessages/'+b.to+'/gift-'+b.requestId).set({author:'nova-bot',kind:'shop-gift',subject:'You received a gift 🎁',text:gift.fromName+' sent you '+gift.label+'. Open Nova to unwrap it.',createdAt:gift.at}).catch(()=>{});
 return {ok:true,gift:publicGift({...gift,items:[]},items),coins:root.progress?.[uid]?.coins||0,inventory:root.inventory?.[uid]||{}};
}
