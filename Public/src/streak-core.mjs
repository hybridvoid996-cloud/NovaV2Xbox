export const STREAK_RESTORE_COST=350000,INVITE_REWARD=300000;
export const utcDay=now=>Math.floor(now/86400000);
export function streakStatus(streak={},now=Date.now()){
 const today=utcDay(now),count=Number.isSafeInteger(streak.count)?Math.max(0,streak.count):0,gap=today-Number(streak.day),broken=count>0&&gap>1,claimed=count>0&&gap<=0;
 return {count:broken?0:count,previous:count,broken,claimed,claimable:!claimed,today,restoreAvailable:broken||streak.recoverable?.day===today,nextCount:claimed?count+1:broken?1:count+1,reward:(claimed?count+1:broken?1:count+1)*1000,restoreCost:STREAK_RESTORE_COST,history:(Array.isArray(streak.history)?streak.history:[]).slice(-14),nextReset:(today+1)*86400000};
}
export function claimStreak(progress,now){
 const p={...progress},s={...p.streak},status=streakStatus(s,now);if(status.claimed)return {progress:p,awarded:0};
 if(status.broken)s.recoverable={count:status.previous,day:status.today};
 s.count=status.nextCount;s.day=status.today;s.history=[...status.history.filter(h=>h.day!==status.today),{day:status.today,count:s.count,reward:status.reward}].slice(-14);p.coins=(Number(p.coins)||0)+status.reward;p.streak=s;
 return {progress:p,awarded:status.reward};
}
export function restoreStreak(progress,now){
 const p={...progress},s={...p.streak},status=streakStatus(s,now);if(!status.restoreAvailable)throw Error('There is no lost streak to restore.');if((Number(p.coins)||0)<STREAK_RESTORE_COST)throw Error('Restoring costs 350,000 Nova Coins.');
 if(status.broken)s.day=status.today-1;else{s.count=s.recoverable.count+1;s.history=status.history.map(h=>h.day===status.today?{...h,count:s.count}:h)}
 delete s.recoverable;s.restoredAt=now;p.streak=s;p.coins-=STREAK_RESTORE_COST;return p;
}
export function flameSVG(){return '<svg viewBox="0 0 32 40" fill="none" aria-hidden="true"><path d="M18 1c2 9-4 11-1 17 2-1 4-4 4-6 9 8 12 17 5 24-5 5-15 5-21-1C-3 27 5 16 8 13c-1 7 3 8 5 6C17 15 12 9 18 1Z" fill="currentColor"/><path d="M17 23c1 5 7 7 3 13-2 3-7 3-9 0-3-5 2-8 6-13Z" fill="#fff" fill-opacity=".55"/></svg>'}
