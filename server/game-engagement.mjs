import {readFile} from 'node:fs/promises';
let catalog;
async function known(kind,id){catalog??=Promise.all(['games','cloud','testing'].map(async name=>[name,JSON.parse(await readFile(new URL('../Public/library-'+name+'.json',import.meta.url),'utf8'))]));return (await catalog).some(([name,rows])=>(kind==='cloud'?name==='cloud':name!=='cloud')&&rows.some(g=>String(g.id)===id));}
export function changeEngagement(record,uid,event){
 record={...(record||{})};record.views=Number.isSafeInteger(record.views)&&record.views>=0?record.views:Object.keys(record.viewers||{}).length;delete record.viewers;record.votes={...record.votes};
 if(event==='view')record.views++;
 if(event==='like'||event==='dislike'){if(record.votes[uid]===event)delete record.votes[uid];else record.votes[uid]=event;}
 return record;
}
export function engagementTotals(record={},uid){const votes=Object.values(record.votes||{});return {views:Number.isSafeInteger(record.views)&&record.views>=0?record.views:Object.keys(record.viewers||{}).length,likes:votes.filter(v=>v==='like').length,dislikes:votes.filter(v=>v==='dislike').length,choice:record.votes?.[uid]||null};}
export async function gameEngagement(db,uid,b){const kind=b.kind,id=String(b.id||''),event=b.event||'read';if(!['game','cloud'].includes(kind)||!['read','view','like','dislike'].includes(event)||!await known(kind,id))throw Error('Choose a valid game.');const ref=db.ref('novaControl/gameEngagement/'+kind+'/'+id);const snap=event==='read'?await ref.get():(await ref.transaction(record=>changeEngagement(record,uid,event))).snapshot;return engagementTotals(snap.val()||{},uid);}

