export function pollResult(poll,votes,kind,now=Date.now()){
 const counts=(poll.options||[]).map((_,i)=>Object.values(votes||{}).filter(v=>v===i).length),total=counts.reduce((a,b)=>a+b,0);
 return {id:poll.id,title:poll.title||poll.text||'Poll',kind,at:poll.at||0,endsAt:poll.closesAt||poll.expiresAt||0,open:(poll.closesAt||poll.expiresAt)>now&&!poll.ended,options:poll.options||[],counts,total,percentages:counts.map(n=>total?Math.round(n/total*100):0)};
}
export async function ownerPollResults(db,now=Date.now()){
 const get=async p=>(await db.ref(p).get()).val()||{};
 const [community,history,current]=await Promise.all([get('novaControl/polls'),get('novaControl/livePollHistory'),get('novaControl/live')]);
 if(current.id&&Array.isArray(current.options))history[current.id]={...current};
 const live=await Promise.all(Object.entries(history).sort(([,a],[,b])=>b.at-a.at).slice(0,20).map(async([id,p])=>pollResult({...p,id},await get('novaControl/liveVotes/'+id),'live',now)));
 return [...live,...Object.entries(community).map(([id,p])=>pollResult({...p,id},p.votes,'community',now))].sort((a,b)=>b.at-a.at).slice(0,30);
}
