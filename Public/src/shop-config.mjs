export const shopOdds=[['common',800000],['uncommon',180000],['epic',19000],['legendary',990],['mythic',9],['singularity',1]];
// Coin games have no daily cap, so cosmetics and crates are priced for a bigger coin economy.
export const shopPrices={
 decoration:{1:10000,3:27000,7:60000,10:85000},effect:{1:15000,3:40000,7:90000,10:127500},banner:{1:20000,3:54000,7:120000,10:170000},
 halloween:{1:25000,3:67500,7:150000,10:212500},
 decoration2:{1:15000,3:40500,7:90000,10:127500},effect2:{1:22500,3:60000,7:135000,10:191250},banner2:{1:30000,3:81000,7:180000,10:255000}
};
// V2 crates hold the collection cosmetics (named sets); classic crates keep the original Nova pool.
export const crateKinds={decoration:'decoration',effect:'effect',banner:'banner',halloween:null,decoration2:'decoration',effect2:'effect',banner2:'banner'};
export const crateNames={decoration:'Avatar crate',effect:'Profile effect crate',banner:'Chat banner crate',halloween:'Halloween crate',decoration2:'Avatar crate V2',effect2:'Profile background crate V2',banner2:'Banner crate V2'};
export const isV2Item=a=>!!a.collection&&a.collection!=='halloween'&&a.collection!=='animated-wave';
export function cratePool(items,kind){
 if(kind==='halloween')return items.filter(a=>a.collection==='halloween');
 const base=crateKinds[kind];if(!base)return [];
 const v2=kind.endsWith('2');return items.filter(a=>a.kind===base&&a.collection!=='halloween'&&isV2Item(a)===v2);
}
// Shared by the daily shop and server checkout. Coins are Nova's virtual currency.
export const cosmeticRarityPrices={common:30000,uncommon:60000,epic:150000,legendary:400000,mythic:1000000,singularity:2500000};
export const cosmeticCategoryMultipliers={decoration:1,effect:1.5,banner:2,halloween:2.5};
export const halloweenEnd=Date.parse('2026-11-01T00:00:00-04:00');
export const rarityLabel=s=>s[0].toUpperCase()+s.slice(1);
