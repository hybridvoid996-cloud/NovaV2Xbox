import {hackProducts} from '../Public/src/hack-products.mjs';
export function settleHackPurchase(root,uid,id,now,initial){const product=hackProducts.find(p=>p.id===id);if(!product)throw Error('Choose a valid hack pack.');root||={};root.hackPurchases||={};root.hackPurchases[uid]||={};if(root.hackPurchases[uid][id])return root;root.progress||={};const p=root.progress[uid]||initial();if(!Number.isSafeInteger(p.coins)||p.coins<product.price)throw Error('You need 150,000 Nova Coins.');root.progress[uid]=p;p.coins-=product.price;root.hackPurchases[uid][id]={product:id,role:product.role,paid:product.price,at:now};return root}
export async function hackShopAction({db,uid,action,b,now,initial}){
 if(action==='hackAccess'){const owned=(await db.ref('novaControl/hackPurchases/'+uid).get()).val()||{};return {owned}}
 const product=hackProducts.find(p=>p.id===b.product);if(!product)throw Error('Choose a valid hack pack.');let failure;const result=await db.ref('novaControl').transaction(root=>{failure=null;try{return settleHackPurchase(root,uid,product.id,now,initial)}catch(e){failure=e.message;return}});if(failure||!result.committed)throw Error(failure||'Purchase could not be saved. Try again.');const data=result.snapshot.val(),receipt=data.hackPurchases[uid][product.id];
 await db.ref().update({['novaChatV2/customRoles/'+product.role]:{name:product.name,color:'#b8c6a4',purchaseOnly:true},['novaChatV2/memberRoles/'+uid+'/'+product.role]:true});
 return {ok:true,coins:data.progress[uid].coins,receipt,owned:data.hackPurchases[uid]};
}
