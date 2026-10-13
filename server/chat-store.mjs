import {readHackOwnership} from './hack-shop.mjs';
import {ensureShopSeason,SHOP_SEASON,HALLOWEEN_END} from './shop-season.mjs';
import {wagerPlan,settleWager,cosmeticCrates} from './shop-games.mjs';
import {nitroThemes,validGradient} from '../Public/src/nitro-themes.js';
import {readFile} from 'node:fs/promises';
import {randomInt} from 'node:crypto';
export {shopOdds as odds,shopPrices as prices} from '../Public/src/shop-config.mjs';
import {shopOdds as odds,shopPrices as prices} from '../Public/src/shop-config.mjs';
export const catalog=()=>readFile(new URL('../Public/profile-assets/catalog.json',import.meta.url),'utf8').then(JSON.parse);
export function draw(items,kind,count){return Array.from({length:count},()=>{let roll=randomInt(1000000),rarity;for(const [name,weight]of odds){roll-=weight;if(roll<0){rarity=name;break}}const pool=items.filter(a=>(kind==='halloween'?a.collection==='halloween':a.kind===kind&&a.collection!=='halloween')&&a.rarity===rarity);if(!pool.length)throw Error('This case is unavailable.');return pool[randomInt(pool.length)]})}
const boostCount=(root,now)=>new Set([...Object.keys(root.boosters||{}),...Object.entries(root.nitro||{}).filter(([,n])=>n===true||n?.until>now).map(([id])=>id)]).size;
export async function storeAction({db,uid,account,action,b,now,initial}){
 if(['storeStatus','openCase','equipCosmetic','storeGamble'].includes(action))await ensureShopSeason(db,now,await catalog());
 if(action==='storeGamble')return gambleAction({db,uid,b,now,initial});
 if(action==='storeStatus'){const paths=['progress/'+uid,'inventory/'+uid,'nitro','boosters','nitroGifts/'+uid,'crateCredits/'+uid,'shopReceipts/'+uid,'hackPurchases/'+uid];const rows=await Promise.all(paths.map(path=>db.ref('novaControl/'+path).get().then(s=>s.val()||{})));const root={progress:{[uid]:rows[0]},inventory:{[uid]:rows[1]},nitro:rows[2],boosters:rows[3],nitroGifts:{[uid]:rows[4]},crateCredits:{[uid]:rows[5]}};return {hackPurchases:await readHackOwnership(db,uid),coins:root.progress?.[uid]?.coins||0,inventory:root.inventory?.[uid]||{},nitro:root.nitro?.[uid]===true||root.nitro?.[uid]?.until>now,boosts:boostCount(root,now),prices,odds,season:SHOP_SEASON,halloween:{active:now<HALLOWEEN_END,endsAt:HALLOWEEN_END},crateCredits:root.crateCredits?.[uid]||{},gambling:{dailyCoins:50,dailyCosmetics:3,cosmeticCrates},recentWagers:Object.values(rows[6]).sort((a,b)=>b.at-a.at).slice(0,5).map(({fingerprint,...receipt})=>receipt),gifts:Object.entries(root.nitroGifts?.[uid]||{}).filter(([,g])=>!g.seen).map(([id,g])=>({id,...g}))}}
 if(action==='ackNitroGift'){if(!/^[a-f0-9-]{36}$/.test(b.id||''))throw Error('Invalid gift.');await db.ref('novaControl/nitroGifts/'+uid+'/'+b.id+'/seen').set(true);return {ok:true}}
 if(action==='unequipCosmetic'){if(!['decoration','effect','chatBanner'].includes(b.kind))throw Error('Choose a cosmetic category.');await db.ref('novaChatV2/profiles/'+uid+'/'+b.kind).remove();return {ok:true}}
 if(action==='profileTheme'){const premium=(await db.ref('novaControl/nitro/'+uid).get()).val();if(!(premium===true||premium?.until>now))throw Error('Profile gradients require Nitro.');if(!['default',...Object.keys(nitroThemes),'custom'].includes(b.theme))throw Error('Choose a profile background.');if(b.theme==='custom'&&!validGradient(b.gradient))throw Error('Choose valid profile gradient colors.');await db.ref('novaChatV2/profiles/'+uid).update({profileTheme:b.theme,...(b.theme==='custom'?{profileGradient:b.gradient}:{})});return {ok:true}}
 if(action==='usernameFont'){const premium=(await db.ref('novaControl/nitro/'+uid).get()).val();if(!(premium===true||premium?.until>now))throw Error('Username fonts require Nitro.');if(!['default','serif','mono','rounded','heavy'].includes(b.font))throw Error('Choose a font.');await db.ref('novaChatV2/profiles/'+uid).update({usernameFont:b.font});return {ok:true}}
 if(action==='equipCosmetic'){
  const items=await catalog(),item=items.find(a=>a.id===b.id);if(!item)throw Error('Choose a cosmetic.');if(!(await db.ref('novaControl/inventory/'+uid+'/'+item.id).get()).exists())throw Error('Open a case to unlock this cosmetic first.');const values={[item.kind==='banner'?'chatBanner':item.kind]:item.id};if(item.kind==='banner'){const old=(await db.ref('novaChatV2/profiles/'+uid+'/banner').get()).val();if(items.some(a=>a.kind==='banner'&&a.id===old))values.banner=null}await db.ref('novaChatV2/profiles/'+uid).update(values);return {ok:true};
 }
 if(action==='nitroAnimation'){
  const premium=(await db.ref('novaControl/nitro/'+uid).get()).val();if(!(premium===true||premium?.until>now))throw Error('This animation requires Nitro.');if(!['none','orbit','shimmer'].includes(b.animation))throw Error('Choose an animation.');await db.ref('novaChatV2/profiles/'+uid).update({nitroAnimation:b.animation});return {ok:true};
 }
 if(!/^[a-f0-9-]{36}$/.test(b.requestId||''))throw Error('A purchase ID is required.');
 const recipient=action==='giftNitro'?b.uid:uid;const gifting=action==='giftNitro';if(gifting){if(typeof recipient!=='string'||!recipient||/[.#$\[\]/]/.test(recipient)||recipient===uid)throw Error('Choose another Nova user.');if(!(await db.ref('novaAccounts/'+recipient).get()).exists())throw Error('User not found.')}
 if(action==='openCase'&&(!['decoration','effect','banner','halloween'].includes(b.kind)||!Number.isInteger(b.count)||!(b.useCredits===true?[1,3,5,7,10]:[1,3,7,10]).includes(b.count)))throw Error('Choose a valid case bundle.');
 if(action==='openCase'&&b.kind==='halloween'&&now>=HALLOWEEN_END)throw Error('The Halloween collection ended on October 31, 2026.');
 const items=await catalog(),cost=['buyNitro','giftNitro'].includes(action)?5000:(prices[b.kind]?.[b.count]||(b.useCredits===true?prices[b.kind]?.[1]*b.count:0));if(!cost)throw Error('Choose a valid case bundle.');const rewards=action==='openCase'?draw(items,b.kind,Number(b.count)):[];
 let failure;
 const result=await db.ref('novaControl').transaction(root=>{
  // Returning the current value allows Firebase to resolve a cold or stale
  // cache against the server. Aborting here would reject real balances.
  failure=null;if(root===null)return null;root.purchases=root.purchases||{};root.purchases[uid]=root.purchases[uid]||{};
  if(root.purchases[uid][b.requestId])return root;
  if(['buyNitro','giftNitro'].includes(action)&&(root.boosters?.[recipient]||(root.nitro?.[recipient]===true||root.nitro?.[recipient]?.until>now))){failure=gifting?'That user already has Nitro.':'You already own Nitro.';return root}
  root.progress=root.progress||{};const p=root.progress[uid]=root.progress[uid]||initial();const credits=b.useCredits===true&&action==='openCase';if(credits){root.crateCredits||={};root.crateCredits[uid]||={};if((root.crateCredits[uid][b.kind]||0)<b.count){failure='Not enough crate credits.';return root}root.crateCredits[uid][b.kind]-=b.count}else if(p.coins<cost){failure='You need '+cost.toLocaleString()+' Nova Coins.';return root}if(!credits)p.coins-=cost;
  if(['buyNitro','giftNitro'].includes(action)){root.nitro=root.nitro||{};root.nitro[recipient]=true;root.boosters=root.boosters||{};root.boosters[recipient]={at:now,name:account.name};if(gifting){root.nitroGifts=root.nitroGifts||{};root.nitroGifts[recipient]=root.nitroGifts[recipient]||{};root.nitroGifts[recipient][b.requestId]={from:uid,name:account.name,at:now}}}
  else{root.inventory=root.inventory||{};const inventory=root.inventory[uid]=root.inventory[uid]||{};for(const item of rewards)inventory[item.id]={count:(inventory[item.id]?.count||0)+1,unlockedAt:now}}
  root.purchases[uid][b.requestId]={action,recipient,cost:credits?0:cost,rewards:rewards.map(a=>a.id),season:SHOP_SEASON,at:now};return root;
 });
 if(!result.committed)throw Error(failure||'Purchase could not complete.');const root=result.snapshot.val(),receipt=root?.purchases?.[uid]?.[b.requestId];if(!receipt)throw Error(failure||'You need '+cost.toLocaleString()+' Nova Coins.');if(action==='openCase'&&receipt.season!==SHOP_SEASON)throw Error('This receipt belongs to the previous shop. Start a new opening.');if(receipt.action!==action||receipt.recipient!==recipient)throw Error('Purchase ID was already used.');
 if(['buyNitro','giftNitro'].includes(receipt.action)){await db.ref('novaChatV2/profiles/'+recipient).update({nitroBooster:true});await db.ref('novaChatV2/server').update({boosts:boostCount(root,now)});await db.ref('novaChatV2/channels/general/messages/nitro-'+b.requestId).set({author:'nova-bot',text:account.name+(gifting?' gifted Nova Nitro and boosted the server! 🎁':' bought Nova Nitro and boosted the server! ✨'),createdAt:receipt.at})}
 if(gifting)await db.ref('novaChatV2/botMessages/'+recipient+'/nitro-'+b.requestId).set({author:'nova-bot',text:account.name+' gifted you permanent Nova Nitro! Enjoy your new backgrounds, username fonts and profile animations.',subject:'You have been gifted Nitro 🎁',kind:'nitro-gift',staffName:account.name,staffRole:'member',createdAt:receipt.at});
 return {ok:true,coins:root.progress[uid].coins,rewards:receipt.rewards.map(id=>items.find(a=>a.id===id)),nitro:receipt.action==='buyNitro',boosts:boostCount(root,now)};
}

async function gambleAction({db,uid,b,now,initial}){
 if(!/^[a-f0-9-]{36}$/.test(b.requestId||''))throw Error('A wager ID is required.');
 const items=await catalog(),plan=wagerPlan(b,items);const fingerprint=JSON.stringify([b.game,b.stake,b.coins??null,b.item??null,b.pick??null,b.color??null,b.number??null,b.choice??null]);let failure;
 const result=await db.ref('novaControl').transaction(root=>{failure=null;if(root===null)return null;if(root.shopSeason?.version!==SHOP_SEASON||root.shopSeason.status!=='ready'){failure='The shop is preparing. Retry shortly.';return root}root.shopReceipts||={};root.shopReceipts[uid]||={};if(root.shopReceipts[uid][b.requestId])return root;try{root.progress||={};root.progress[uid]||=initial();const receipt=settleWager(root,uid,b,plan,now);root.shopReceipts[uid][b.requestId]={...receipt,fingerprint};return root}catch(e){failure=e.message;return undefined}});
 const root=result.snapshot.val(),receipt=root?.shopReceipts?.[uid]?.[b.requestId];if(!result.committed||!receipt)throw Error(failure||'The wager could not complete.');if(receipt.fingerprint!==fingerprint)throw Error('Wager ID was already used.');
 if(receipt.item&&!root.inventory?.[uid]?.[receipt.item]){const profile=(await db.ref('novaChatV2/profiles/'+uid).get()).val()||{},patch={};for(const field of ['decoration','effect','chatBanner','banner'])if(profile[field]===receipt.item)patch[field]=null;if(Object.keys(patch).length)await db.ref('novaChatV2/profiles/'+uid).update(patch)}
 return {ok:true,receipt:{...receipt,fingerprint:undefined},coins:root.progress[uid].coins,crateCredits:root.crateCredits?.[uid]||{}};
}
