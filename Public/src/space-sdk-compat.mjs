export function installSpaceSDKCompatibility(sdk){
 if(!sdk||typeof sdk.init!=='function'||sdk.__novaSpaceCompatibility)return;
 const init=sdk.init;sdk.init=function(...args){return Promise.resolve(init.apply(this,args)).then(value=>{const ad=this.ad;if(ad&&typeof ad.addAdblockPopupListener!=='function')ad.addAdblockPopupListener=()=>{};return value;});};sdk.__novaSpaceCompatibility=true;
}
