// Home: when Nova opens, show any gifts other players sent (who sent it, their note, then the unboxing).
import {control} from './control-client.js';
import {giftIntro} from './shop-unbox.mjs?v=20261112-gifts1';
let running=false;
async function showGifts(){
 if(running)return;running=true;
 try{
  try{if(window.novaAccountReady&&!(await window.novaAccountReady))return}catch{return}
  // Let Home finish its entrance before the popup appears.
  await new Promise(r=>setTimeout(r,2200));
  const {gifts=[]}=await control('giftInbox');
  for(const gift of gifts){
   await giftIntro(gift,{pool:gift.pool||[],
    open:async g=>{const data=await control('openGift',{id:g.id});return {items:data.gift?.items?.length?data.gift.items:g.items}},
    onEquip:async item=>{await control('equipCosmetic',{id:item.id});dispatchEvent(new Event('nova-profile-changed'))}});
  }
 }catch(error){console.warn('Nova gifts could not load:',error)}
 finally{running=false}
}
showGifts();
