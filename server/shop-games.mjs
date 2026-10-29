import {randomInt} from 'node:crypto';
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
export const RED_NUMBERS=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
export const wheelColor=n=>n===0?'green':RED_NUMBERS.includes(n)?'red':'black';
export const cosmeticCrates={common:5,uncommon:5,epic:6,legendary:7,mythic:8,singularity:10};
export function wagerPlan(b,items,random=randomInt){
 if(!['roulette','flip','dice'].includes(b.game))throw Error('Choose a Nova game.');
 let multiplier=1.9,won=false,outcome,odds;
 if(b.game==='roulette'){
  if(!['color','number','both'].includes(b.pick))throw Error('Choose color or a number.');
  if(b.pick!=='number'&&!['red','black'].includes(b.color))throw Error('Choose red or black.');
  if(b.pick!=='color'&&(!Number.isInteger(b.number)||b.number<0||b.number>36))throw Error('Choose a number from 0 to 36.');
  if(b.pick==='both'&&wheelColor(b.number)!==b.color)throw Error('Choose the color of your selected number.');
  const number=random(37),color=wheelColor(number);outcome={number,color};
  won=b.pick==='color'?color===b.color:b.pick==='number'?number===b.number:number===b.number&&color===b.color;
  multiplier=b.pick==='color'?2:36;odds=b.pick==='color'?'18 / 37':'1 / 37';
 }else if(b.game==='flip'){
  if(!['heads','tails'].includes(b.choice))throw Error('Choose heads or tails.');
  outcome={side:random(2)===0?'heads':'tails'};won=outcome.side===b.choice;odds='1 / 2';
 }else{
  if(!['low','high'].includes(b.choice))throw Error('Choose low (1–3) or high (4–6).');
  outcome={number:random(6)+1};won=(outcome.number<=3?'low':'high')===b.choice;odds='1 / 2';
 }
 let item=null;
 if(b.stake==='cosmetic'){
  item=items.find(x=>x.id===b.item);if(!item)throw Error('Choose an owned cosmetic.');
 }else if(b.stake!=='coins'||!Number.isSafeInteger(b.coins)||b.coins<100||b.coins>5000000)throw Error('Wager 100–5,000,000 Nova Coins.');
 return {game:b.game,stake:b.stake,coins:item?0:b.coins,item:item?.id||null,won,outcome,odds,multiplier,
  payout:item?0:won?Math.floor(b.coins*multiplier):0,
  crates:item&&won?{kind:item.kind,count:cosmeticCrates[item.rarity]||5}:null};
}
export function settleWager(root,uid,b,plan,now){
 const day=dayFormat.format(new Date(now));
 root.wagerLimits||={};const limits=root.wagerLimits[uid]?.day===day?root.wagerLimits[uid]:{day,coins:0,cosmetics:0};
 if(plan.stake==='coins'&&limits.coins>=50||plan.stake==='cosmetic'&&limits.cosmetics>=3)throw Error('Daily limit reached: 50 coin games or 3 cosmetic games.');
 if(now-(limits.last||0)<400)throw Error('Wait for the current spin to finish.');
 const progress=root.progress?.[uid];if(!progress||!Number.isSafeInteger(progress.coins)||progress.coins<0)throw Error('Your balance is unavailable.');
 if(plan.stake==='coins'){
  if(progress.coins<plan.coins)throw Error('You do not have enough Nova Coins.');
  const balance=progress.coins-plan.coins+plan.payout;if(!Number.isSafeInteger(balance)||balance>1000000000)throw Error('This wager exceeds the balance limit.');
  progress.coins=balance;limits.coins++;
 }else{
  const inventory=root.inventory?.[uid],owned=inventory?.[plan.item];
  if(!owned||!Number.isSafeInteger(owned.count)||owned.count<1)throw Error('You do not own this cosmetic.');
  // Loss consumes one copy; a win keeps the item and awards crate credits.
  if(!plan.won){if(owned.count===1)delete inventory[plan.item];else owned.count--;}
  if(plan.crates){root.crateCredits||={};root.crateCredits[uid]||={};const credits=root.crateCredits[uid];credits[plan.crates.kind]=(credits[plan.crates.kind]||0)+plan.crates.count}
  limits.cosmetics++;
 }
 limits.last=now;root.wagerLimits[uid]=limits;
 return {...plan,at:now,balance:progress.coins};
}
