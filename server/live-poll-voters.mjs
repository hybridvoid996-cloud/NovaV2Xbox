import {announcementProfile} from './announcement-profile.mjs';
export async function livePollVoters(db,votes,optionCount,now=Date.now()){
 const count=Math.max(0,Math.min(6,Number(optionCount)||0)),groups=Array.from({length:count},()=>[]);
 for(const [uid,choice]of Object.entries(votes||{})){if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid)||!Number.isInteger(choice)||!groups[choice]||groups[choice].length>=4)continue;groups[choice].push(uid)}
 return Promise.all(groups.map(ids=>Promise.all(ids.map(async uid=>{try{const p=await announcementProfile(db,uid,now);return {id:uid,name:p.name||'Nova user',photo:p.photo||''}}catch{return {id:uid,name:'Nova user',photo:''}}}))));
}
