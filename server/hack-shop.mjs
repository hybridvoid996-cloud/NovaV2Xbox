import {hackAvailability} from './hack-availability.mjs';
import {recordShopPurchase} from './shop-purchase-feed.mjs';
import {hackProducts} from '../Public/src/hack-products.mjs';
// Owners may give hack access with a server role they created themselves (random role ID),
// so a role also counts when its name clearly names the pack, e.g. "PvZ Hacks".
const plain=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const ROLE_NAMES={gardenless:[/gardenless/],'pvz-original':[/\bpvz\b/,/plants vs?\.? zombies/,/plants versus zombies/],blooket:[/blooket/],kahoot:[/kahoot/]};
export function hackRoleMatches(product,role){
 const name=plain(role?.name);if(!name)return false;
 if(name===plain(product.name)||name===plain(product.role)||name.replace(/ /g,'')===product.role.toLowerCase())return true;
 return /\bhack/.test(name)&&(ROLE_NAMES[product.id]||[]).some(pattern=>pattern.test(name));
}
export function ownedHackProducts(purchases={},roles={},baseRole='',definitions={}){
 const held=Object.entries(roles||{}).filter(([,on])=>on&&on!=='false').map(([id])=>id);
 const owned={};for(const product of hackProducts){
  if(purchases?.[product.id]){owned[product.id]=purchases[product.id];continue}
  const role=held.includes(product.role)||baseRole===product.role?product.role:held.find(id=>hackRoleMatches(product,definitions?.[id]));
  if(role)owned[product.id]={product:product.id,role,granted:true};
 }return owned;
}
export async function readHackOwnership(db,uid){const [purchases,roles,baseRole]=await Promise.all(['novaControl/hackPurchases/'+uid,'novaChatV2/memberRoles/'+uid,'novaChatV2/roles/'+uid].map(path=>db.ref(path).get().then(s=>s.val())));
 const ids=Object.keys(roles||{}).filter(id=>roles[id]&&!hackProducts.some(p=>p.role===id)&&/^[A-Za-z0-9_-]{1,80}$/.test(id));
 const definitions=Object.fromEntries(await Promise.all(ids.map(id=>db.ref('novaChatV2/customRoles/'+id).get().then(s=>[id,s.val()]))));
 return ownedHackProducts(purchases,roles,baseRole,definitions);}
export function settleHackPurchase(root,uid,id,now,initial){const product=hackProducts.find(p=>p.id===id);if(!product)throw Error('Choose a valid hack pack.');root||={};root.hackPurchases||={};root.hackPurchases[uid]||={};if(root.hackPurchases[uid][id])return root;root.progress||={};const p=root.progress[uid]||initial();if(!Number.isSafeInteger(p.coins)||p.coins<product.price)throw Error('You need '+product.price.toLocaleString('en-US')+' Nova Coins.');root.progress[uid]=p;p.coins-=product.price;root.hackPurchases[uid][id]={product:id,role:product.role,paid:product.price,at:now};recordShopPurchase(root,uid,'hack-'+id,{label:product.name,cost:product.price,at:now});return root}
export async function hackShopAction({db,uid,action,b,now,initial}){
 if(action==='hackAvailability')return hackAvailability(b.product);
 const owned=await readHackOwnership(db,uid);const grant=async(product,setName=false)=>{const [from,to]=product.colors||['#b8c6a4','#ffffff'];const patch={['novaChatV2/customRoles/'+product.role]:{name:product.name,color:from,from,to,purchaseOnly:true},['novaChatV2/memberRoles/'+uid+'/'+product.role]:true};if(setName&&product.colors)patch['novaChatV2/profiles/'+uid+'/nameColorRole']=product.role;await db.ref().update(patch)};
 if(action==='hackAccess')return {owned};
 const product=hackProducts.find(p=>p.id===b.product);if(!product)throw Error('Choose a valid hack pack.');
 if(owned[product.id]){await grant(product);const progress=(await db.ref('novaControl/progress/'+uid).get()).val();return {ok:true,alreadyOwned:true,coins:progress?.coins||0,receipt:owned[product.id],owned};}
 const purchaseRef=db.ref('novaControl'),saved=(await purchaseRef.get()).val();let failure;
 const result=await purchaseRef.transaction(root=>{failure=null;try{return settleHackPurchase(root||structuredClone(saved),uid,product.id,now,initial)}catch(e){failure=e.message;return}});
 if(failure||!result.committed)throw Error(failure||'Purchase could not be saved. Try again.');const data=result.snapshot.val(),receipt=data.hackPurchases[uid][product.id];
 await grant(product,true);
 return {ok:true,coins:data.progress?.[uid]?.coins||0,receipt,owned:{...owned,...data.hackPurchases[uid]}};
}
