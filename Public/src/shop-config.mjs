export const shopOdds=[['common',800000],['uncommon',180000],['epic',19000],['legendary',990],['mythic',9],['singularity',1]];
export const shopPrices={decoration:{1:5000,3:13500,7:30000,10:42500},effect:{1:7500,3:20000,7:45000,10:63750},banner:{1:10000,3:27000,7:60000,10:85000},halloween:{1:12500,3:33750,7:75000,10:106250}};
// Shared by the daily shop and server checkout. Coins are Nova's virtual currency.
export const cosmeticRarityPrices={common:15000,uncommon:30000,epic:75000,legendary:200000,mythic:500000,singularity:1250000};
export const cosmeticCategoryMultipliers={decoration:1,effect:1.5,banner:2,halloween:2.5};
export const halloweenEnd=Date.parse('2026-11-01T00:00:00-04:00');
export const rarityLabel=s=>s[0].toUpperCase()+s.slice(1);
