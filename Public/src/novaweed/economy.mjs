// Nova Weed game rules: items, strains, effects, mixing, growing and pricing.
// Pure functions + plain data so they can be unit tested and saved as JSON.

export const STRAINS={
 kush:{name:'Nova Kush',seed:'seed_kush',base:28,growHours:5,color:'#58c96b',rank:0},
 haze:{name:'Comet Haze',seed:'seed_haze',base:40,growHours:7,color:'#9ad94a',rank:1},
 star:{name:'Starlight OG',seed:'seed_star',base:58,growHours:9,color:'#5fd6c4',bud:'#bff2e6',rank:3},
 lemon:{name:'Lemon Drift',seed:'seed_lemon',base:46,growHours:6,color:'#a9d24a',bud:'#f0e45a',rank:1},
 purple:{name:'Violet Tide',seed:'seed_purple',base:70,growHours:10,color:'#5f9a6a',bud:'#b07ae0',rank:2},
 mint:{name:'Glacier Mint',seed:'seed_mint',base:92,growHours:12,color:'#6fd6b0',bud:'#e6fff6',rank:4}
};

// Effects: price multiplier + what happens on screen when used.
export const EFFECTS={
 calm:{name:'Calming',color:'#7fb8ff',value:.18},
 energy:{name:'Energizing',color:'#ffd23f',value:.22},
 glow:{name:'Glowing',color:'#b6ff5c',value:.3},
 spicy:{name:'Spicy',color:'#ff6a3d',value:.2},
 fruity:{name:'Fruity',color:'#ff7ad9',value:.16},
 focus:{name:'Focused',color:'#7af0ff',value:.24},
 fresh:{name:'Refreshing',color:'#7dffb3',value:.14},
 fizzy:{name:'Fizzy',color:'#c79bff',value:.26},
 giggly:{name:'Giggly',color:'#ffb347',value:.2},
 sleepy:{name:'Sleepy',color:'#8c8cff',value:.12}
};
export const STRAIN_EFFECT={kush:'calm',haze:'giggly',star:'focus',lemon:'energy',purple:'sleepy',mint:'fresh'};

// Mixers sold at Quick Stop. Each adds its effect; a few also transform one.
export const MIXERS={
 mix_cola:{name:'Nova Cola',price:4,effect:'fizzy',turns:{calm:'energy'}},
 mix_mint:{name:'Mint Gum',price:3,effect:'fresh',turns:{spicy:'calm'}},
 mix_chili:{name:'Chili Flakes',price:5,effect:'spicy',turns:{fresh:'energy'}},
 mix_glow:{name:'Glow Stick',price:9,effect:'glow',turns:{sleepy:'focus'}},
 mix_honey:{name:'Honey',price:6,effect:'calm',turns:{energy:'sleepy'}},
 mix_coffee:{name:'Coffee Beans',price:7,effect:'energy',turns:{sleepy:'focus',calm:'giggly'}},
 mix_berry:{name:'Blueberries',price:4,effect:'fruity',turns:{giggly:'glow'}},
 mix_salt:{name:'Sea Salt',price:2,effect:'focus',turns:{fizzy:'fresh'}}
};

// Disposable vapes: each purchase adds hits. Flavours give a short effect; the Nova Cart also gets you lifted.
export const VAPES={
 vape_mint:{name:'Frost Mint Vape',short:'Frost Mint',price:18,shop:'quick',hits:25,effect:'fresh',body:'#7fe3ff',cloud:'#eefbff',seconds:25},
 vape_berry:{name:'Berry Cloud Vape',short:'Berry Cloud',price:18,shop:'quick',hits:25,effect:'fruity',body:'#ff7ad9',cloud:'#fff0f8',seconds:25},
 vape_mango:{name:'Mango Rush Vape',short:'Mango Rush',price:20,shop:'quick',hits:25,effect:'energy',body:'#ffb347',cloud:'#fff6e6',seconds:25},
 vape_nova:{name:'Nova Cart (THC)',short:'Nova Cart',price:45,shop:'garden',rank:1,hits:30,effect:'calm',high:true,body:'#2f8f4e',cloud:'#f0fff3',seconds:35}
};

// Guns only hurt NPCs, rival crews and police. Players can't be shot.
export const GUNS={
 gun_pistol:{name:'Nova 9 Pistol',short:'Pistol',price:320,rank:1,dmg:34,rate:.3,mag:12,reload:1.2,spread:.012,auto:false,range:70,kick:1},
 gun_smg:{name:'Viper SMG',short:'SMG',price:950,rank:2,dmg:17,rate:.09,mag:30,reload:1.7,spread:.035,auto:true,range:50,kick:.55}
};

export const ITEMS={
 seed_kush:{name:'Nova Kush Seed',price:25,shop:'garden',icon:'🌱'},
 seed_haze:{name:'Comet Haze Seed',price:40,shop:'garden',icon:'🌱',rank:1},
 seed_star:{name:'Starlight OG Seed',price:65,shop:'garden',icon:'🌱',rank:3},
 seed_lemon:{name:'Lemon Drift Seed',price:48,shop:'garden',icon:'🌱',rank:1},
 seed_purple:{name:'Violet Tide Seed',price:80,shop:'garden',icon:'🌱',rank:2},
 seed_mint:{name:'Glacier Mint Seed',price:120,shop:'garden',icon:'🌱',rank:4},
 soil:{name:'Bag of Soil',price:12,shop:'garden',icon:'🟫'},
 fertilizer:{name:'Fertilizer',price:18,shop:'garden',icon:'🧪'},
 pot:{name:'Grow Pot',price:70,shop:'garden',icon:'🪴'},
 baggies:{name:'Baggies (×10)',price:8,shop:'garden',icon:'👜',gives:{baggie:10}},
 baggie:{name:'Baggie',icon:'👜'},
 drink_energy:{name:'Volt Energy',price:6,shop:'quick',shops:['gas'],icon:'⚡',drink:'energy'},
 drink_cola:{name:'Nova Cola Can',price:3,shop:'quick',shops:['gas'],icon:'🥤',drink:'fizzy'},
 drink_water:{name:'Water',price:1,shop:'quick',shops:['gas'],icon:'💧',drink:'fresh'},
 snack_chips:{name:'Sea Salt Chips',price:3,shop:'gas',icon:'🥔',drink:'focus'},
 snack_bar:{name:'Protein Bar',price:4,shop:'gas',icon:'🍫',heal:20},
 ...Object.fromEntries(Object.entries(GUNS).map(([id,g])=>[id,{name:g.name,price:g.price,shop:'arms',rank:g.rank,icon:'🔫',gun:true}])),
 ammo:{name:'Ammo Box (×24)',price:24,shop:'arms',icon:'🧰',gives:{ammo:24}},
 med_kit:{name:'Med Kit',price:30,shop:'arms',icon:'🩹'},
 ...Object.fromEntries(Object.entries(VAPES).map(([id,v])=>[id,{name:v.name,price:v.price,shop:v.shop,shops:v.shop==='quick'?['gas']:undefined,rank:v.rank,icon:'💨',vape:true,gives:{[id]:v.hits}}])),
 ...Object.fromEntries(Object.entries(MIXERS).map(([id,m])=>[id,{name:m.name,price:m.price,shop:'quick',icon:'🧂',mixer:true}]))
};

// Skateboards from The Board Room
export const BOARDS={
 cheap:{name:'Driftwood Deck',price:75,speed:7.2,jump:1,glide:.35,color:'#c9a86b',desc:'Scuffed but it rolls.'},
 street:{name:'Street Deck',price:250,speed:8.2,jump:1.08,glide:.45,color:'#3fae68',desc:'A solid all-rounder.'},
 light:{name:'Featherlight',price:500,speed:9,jump:1.28,glide:.45,color:'#e8443a',desc:'Pops higher than anything.'},
 cruiser:{name:'Long Cruiser',price:500,speed:9.4,jump:1,glide:.8,color:'#e9d9b0',desc:'Glides forever on one push.'},
 gold:{name:'Gold Deck',price:1500,speed:10.6,jump:1.2,glide:.65,color:'#ffd23f',desc:'Fast, flashy, and very gold.'}
};
// Custom product names the player picks (filled from the save)
let NAMES={};export function setProductNames(n){NAMES=n||{}}

export const SHIRTS=[
 {id:'tee_white',name:'Plain Tee',price:0,color:'#e9e9ee'},
 {id:'tee_black',name:'Midnight Tee',price:30,color:'#1c1c22'},
 {id:'hoodie_green',name:'Leaf Hoodie',price:80,color:'#2f8f4e',hood:true},
 {id:'tee_red',name:'Red Rocket Tee',price:35,color:'#d23c4b'},
 {id:'hoodie_purple',name:'Nebula Hoodie',price:95,color:'#6b3fd1',hood:true},
 {id:'jersey_blue',name:'Nova City Jersey',price:120,color:'#2b6be0',stripe:'#ffffff'},
 {id:'flannel',name:'Flannel Shirt',price:60,color:'#b8452f',stripe:'#2a1210'},
 {id:'gold_tee',name:'Gold Drip Tee',price:400,color:'#e8b730',stripe:'#fff2b0'}
];
export const HATS=[{id:'none',name:'No Hat',price:0},{id:'cap',name:'Snapback',price:40,color:'#111'},{id:'beanie',name:'Beanie',price:35,color:'#3a7d4f'},{id:'bucket',name:'Bucket Hat',price:55,color:'#d8c9a3'}];

export const RANKS=[{name:'Street Rookie',xp:0},{name:'Home Grower',xp:250},{name:'Hustler',xp:800},{name:'Supplier',xp:2000},{name:'Nova Kingpin',xp:5000}];
export const rankOf=xp=>{let r=0;RANKS.forEach((k,i)=>{if(xp>=k.xp)r=i});return r};

// ---------- products ----------
export function productKey(strain,effects){return strain+'|'+[...effects].sort().join(',')}
export function parseKey(key){const [strain,list]=key.split('|');return {strain,effects:list?list.split(',').filter(Boolean):[]}}
const ADJ={calm:'Chill',energy:'Turbo',glow:'Neon',spicy:'Blaze',fruity:'Berry',focus:'Laser',fresh:'Frost',fizzy:'Fizz',giggly:'Goofy',sleepy:'Dream'};
export function productName(key){
 if(NAMES[key])return NAMES[key];
 const {strain,effects}=parseKey(key);const base=STRAINS[strain]?.name||'Mystery';
 const extra=effects.filter(e=>e!==STRAIN_EFFECT[strain]);
 if(!extra.length)return base;
 return extra.slice(0,2).map(e=>ADJ[e]).join(' ')+' '+base.split(' ').slice(-1)[0];
}
export function productValue(key,quality=1){
 const {strain,effects}=parseKey(key);const s=STRAINS[strain];if(!s)return 0;
 const mult=1+effects.reduce((a,e)=>a+(EFFECTS[e]?.value||0),0);
 return Math.round(s.base*mult*(0.7+0.3*Math.max(0,Math.min(1.5,quality))));
}
export function baseProduct(strain){return productKey(strain,[STRAIN_EFFECT[strain]])}

// Mixing: transform matching effects, then add the mixer effect (max 6 effects).
export function mix(key,mixerId){
 const m=MIXERS[mixerId];if(!m)throw Error('Unknown mixer');
 const {strain,effects}=parseKey(key);
 let next=effects.map(e=>m.turns[e]||e);
 next=[...new Set(next)];
 if(!next.includes(m.effect))next.push(m.effect);
 if(next.length>6)next=next.slice(next.length-6);
 return productKey(strain,next);
}

// ---------- growing ----------
// pot = {soil:bool, strain, progress 0..1, water 0..1, fert:bool, quality}
export const POT_STAGES=['Sprout','Seedling','Growing','Flowering','Ready'];
export function potStage(p){if(!p?.strain)return -1;if(p.progress>=1)return 4;return Math.min(3,Math.floor(p.progress*4))}
export function tickPot(p,minutes){
 if(!p?.strain||p.progress>=1)return p;
 const s=STRAINS[p.strain];
 let grown=0;
 for(let i=0;i<minutes;i++){if(p.water<=0)break;p.water=Math.max(0,p.water-1/240);grown++}
 const rate=(p.fert?1.35:1)/(s.growHours*60);
 p.progress=Math.min(1,p.progress+grown*rate);
 // dry plants lose a bit of quality over time
 if(grown<minutes)p.quality=Math.max(.3,(p.quality??1)-(minutes-grown)*.0008);
 return p;
}
export function harvestYield(p){return Math.max(2,Math.round((p.fert?7:5)*(p.quality??1)))}

// ---------- customers ----------
// A customer's interest in a product: favourite effects matter most, then price.
export function offerChance(customer,key,price,quality=1){
 const value=productValue(key,quality);
 const {effects}=parseKey(key);
 const likes=effects.filter(e=>customer.likes.includes(e)).length;
 let chance=.45+likes*.18+(customer.loyalty||0)*.04+(quality-1)*.2;
 const ratio=price/Math.max(1,value);
 chance-=Math.max(0,ratio-1)*1.4;   // overpriced
 chance+=Math.max(0,1-ratio)*.5;    // bargain
 if(price>customer.budget)chance-=.5;
 return Math.max(0,Math.min(.98,chance));
}

export function newSave(){
 return {
  version:1,money:150,xp:0,day:1,minute:7*60+30,rentDue:3,rent:100,
  inv:{seed_kush:2,soil:2,baggie:10,drink_water:1},
  products:{},          // productKey -> {bags, buds, quality}
  pots:[{},{}],
  shirt:'tee_white',hat:'none',owned:{tee_white:true,none:true},
  customers:{},         // id -> {met,loyalty,lastBuy}
  orders:[],
  quests:{step:0},
  messages:[],
  stats:{sold:0,earned:0,grown:0,mixed:0,busted:0},
  introSeen:false
 };
}
export const HOURS=60;
export function clockText(minute){const h=Math.floor(minute/60)%24,m=Math.floor(minute%60);return ((h+11)%12+1)+':'+String(m).padStart(2,'0')+(h<12?' AM':' PM')}
export const isNight=minute=>{const h=(minute/60)%24;return h<6||h>=20};
