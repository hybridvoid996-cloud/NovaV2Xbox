export function activityRange(mode='today',custom='',now=Date.now()){
 const today=new Date(now);today.setHours(0,0,0,0);const start=new Date(today);let end=now,label='Today';
 if(mode==='yesterday'){start.setDate(start.getDate()-1);end=+today;label='Yesterday';}
 else if(mode==='seven'){start.setDate(start.getDate()-6);label='Last 7 days';}
 else if(mode==='week'){start.setDate(start.getDate()-((start.getDay()+6)%7));label='This week';}
 else if(mode==='custom'){if(!/^\d{4}-\d{2}-\d{2}$/.test(custom))throw Error('Choose a date.');start.setTime(+new Date(custom+'T00:00:00'));if(!Number.isFinite(+start)||+start>now)throw Error('Choose today or an earlier date.');const next=new Date(start);next.setDate(next.getDate()+1);end=Math.min(+next,now);label=start.toLocaleDateString();}
 return {start:+start,end,label};
}
export function activityPoints(records,range){const points=Object.values(records||{}).filter(p=>Number.isFinite(p.at)&&p.at>=range.start&&p.at<range.end).sort((a,b)=>a.at-b.at);if(range.end-range.start<=2*86400000)return points;const buckets=new Map();for(const p of points){const slot=Math.floor(p.at/600000)*600000,old=buckets.get(slot);if(!old||p.count>old.count)buckets.set(slot,{at:slot,count:p.count});}return [...buckets.values()];}
