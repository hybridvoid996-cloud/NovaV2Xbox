export const NOVA_RANKS=Object.freeze([
 ['rookie','Rookie',0,'#a6b2c4',0,0],['bronze','Bronze',120,'#dc9867',5000,1],
 ['silver','Silver',600,'#dbe9f8',10000,2],['gold','Gold',1800,'#ffd369',25000,3],
 ['platinum','Platinum',4200,'#77e4d3',50000,4],['diamond','Diamond',9000,'#81cfff',100000,5],
 ['master','Master',18000,'#c099ff',175000,7],['grandmaster','Grandmaster',30000,'#ff87ac',250000,10],
 ['legend','Nova Legend',48000,'#fff3b1',500000,15]
].map(([id,name,elo,color,coins,levels],index)=>Object.freeze({id,name,elo,color,coins,levels,index})));
export const RANK_DAILY_SECONDS=3*3600;
export function rankForElo(value){const elo=Number.isFinite(value)?Math.max(0,value):0;return [...NOVA_RANKS].reverse().find(r=>elo>=r.elo)||NOVA_RANKS[0]}
export function rankSummary(record={},position=null){const elo=Math.floor(Math.max(0,Number(record.elo)||0)),rank=rankForElo(elo),next=NOVA_RANKS[rank.index+1];return {elo,rank,next:next||null,remaining:next?next.elo-elo:0,fraction:next?(elo-rank.elo)/(next.elo-rank.elo):1,position,champion:position===1&&rank.index>=6,activeSeconds:Math.floor(Number(record.seconds)||0),dailySeconds:Math.floor(Number(record.dailySeconds)||0)};}
// Timestamps, daily caps, rewards and duplicate-session exclusion are enforced on the server.
export function advanceRank(record,event,now){
 const row={...record},day=new Date(now).toISOString().slice(0,10),valid=event.active===true&&/^(game|cloud):[\w-]{1,100}$/.test(event.game||'')&&typeof event.session==='string'&&/^[a-f0-9-]{36}$/.test(event.session);
 if(row.day!==day){row.day=day;row.dailySeconds=0}
 const delta=now-Number(row.at),same=row.session===event.session&&row.game===event.game;
 const seconds=valid&&row.active===true&&same&&delta>=5000&&delta<=25000?Math.min(20,delta/1000,Math.max(0,RANK_DAILY_SECONDS-(Number(row.dailySeconds)||0))):0;
 if(Number(row.at)>now)return {record:row,promotions:[],seconds:0};
 row.seconds=(Number(row.seconds)||0)+seconds;row.elo=row.seconds/60;row.dailySeconds=(Number(row.dailySeconds)||0)+seconds;
 row.at=now;row.active=valid;row.game=valid?event.game:null;row.session=typeof event.session==='string'&&/^[a-f0-9-]{36}$/.test(event.session)?event.session:null;
 const reached=rankForElo(row.elo).index,claimed=Number.isInteger(row.rewarded)?row.rewarded:0,promotions=NOVA_RANKS.filter(r=>r.index>claimed&&r.index<=reached);
 row.rewarded=Math.max(claimed,reached);return {record:row,promotions,seconds};
}

let badgeSerial=0;
export function rankBadgeSVG(rank,size=64){
 const r=NOVA_RANKS.find(value=>value.id===(typeof rank==='string'?rank:rank?.id))||NOVA_RANKS[0],i=r.index,c=r.color,id='nova-crest-'+(++badgeSerial);
 const symbols=[
 '<path d="m43 48 17 11 17-11v12L60 72 43 60Z"/>',
 '<path d="m39 42 21 14 21-14v12L60 69 39 54Zm6 23 15 10 15-10v7L60 83 45 72Z"/>',
 '<path d="m35 36 25 15 25-15v10L60 62 35 46Zm4 19 21 13 21-13v10L60 79 39 65Z"/>',
 '<path d="m60 28 8 20 22 2-17 14 5 22-18-12-18 12 5-22-17-14 22-2Z"/>',
 '<path d="m60 25 12 22 21 13-21 13-12 22-12-22-21-13 21-13Z"/><path d="m60 42 17 18-17 18-17-18Z" fill="#0c1922" fill-opacity=".65"/>',
 '<path d="m39 36 42 0 13 20-34 36-34-36Z"/><path d="M26 56h68M39 36l8 20 13 36 13-36 8-20M47 56l13-20 13 20" fill="none" stroke="#142b3c" stroke-opacity=".7" stroke-width="2"/>',
 '<path d="m29 40 17 11 14-23 14 23 17-11-8 36H37Z"/><path d="M39 83h42M44 61l16 10 16-10" fill="none" stroke-width="4" stroke-linecap="round"/>',
 '<path d="m60 26 10 22 24-9-7 35-27 17-27-17-7-35 24 9Z"/><path d="m42 60 18 13 18-13M42 82l18 13 18-13" fill="none" stroke="#1a1320" stroke-width="3"/>',
 '<path d="m60 19 9 27 25-12-12 25 27 7-28 7 9 25-25-13-9 24-6-28-25 10 13-24-26-9 28-4-9-25 24 13Z"/><path d="m60 43 11 18-14 17-10-19Z" fill="#fff"/>'
 ][i];
 const wings=i>=6?'<path d="M29 42 4 32l9 20 16 7M27 63 10 55l9 20 13 5M91 42l25-10-9 20-16 7M93 63l17-8-9 20-13 5" fill="url(#'+id+'-metal)" stroke="'+c+'" stroke-opacity=".5"/>':'';
 return '<svg class="nova-rank-badge" viewBox="0 0 120 120" width="'+size+'" height="'+size+'" aria-hidden="true"><defs><linearGradient id="'+id+'-metal" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff"/><stop offset=".25" stop-color="'+c+'"/><stop offset=".6" stop-color="'+c+'"/><stop offset="1" stop-color="#26354b"/></linearGradient><linearGradient id="'+id+'-glass" x2=".8" y2="1"><stop stop-color="'+c+'" stop-opacity=".3"/><stop offset="1" stop-color="#090d18" stop-opacity=".95"/></linearGradient></defs>'+wings+'<path d="M60 8 96 26 91 83 60 110 29 83 24 26Z" fill="url(#'+id+'-glass)" stroke="url(#'+id+'-metal)" stroke-width="2"/><path d="m60 16 28 14-4 49-24 22-24-22-4-49Z" fill="none" stroke="'+c+'" stroke-opacity=".35"/><path d="m29 29 31-15 31 15-31 12Z" fill="#fff" fill-opacity=".06"/><g fill="url(#'+id+'-metal)" stroke="'+c+'" stroke-width=".8">'+symbols+'</g><path d="m37 87 8 7m38-7-8 7" stroke="'+c+'" stroke-width="2"/><circle cx="60" cy="101" r="2" fill="'+c+'"/></svg>';
}
