
let chartRange='today',chartCustom='';

const today=new Date().toISOString().slice(0,10),now=Date.now();
const sampleUsers=[{uid:'sample-1',name:'NovaPlayer'},{uid:'sample-2',name:'Pixel'},{uid:'sample-3',name:'Orbit'},{uid:'sample-4',name:'Luna'}];
sampleUsers.forEach((u,i)=>{u.createdAt=now-i*86400000;u.coins=25000*(i+1);u.level=10+i});
const sample={users:sampleUsers,days:{[today]:{'sample-1':true,'sample-2':true,'sample-3':true,'sample-4':true}},visits:{[today]:{demo:{one:true,two:true,three:true}}},activity:{one:{at:now},two:{at:now},three:{at:now}},timeline:Object.fromEntries(Array.from({length:120},(_,i)=>[i,{at:now-(119-i)*60000,count:Math.max(1,Math.round(12+8*Math.sin(i/12)+4*Math.sin(i/5)))}])),progress:Object.fromEntries(sampleUsers.map((u,i)=>[u.uid,{activeSeconds:(4-i)*3600}])),roles:{'sample-1':'owner','sample-2':'member','sample-3':'member','sample-4':'moderator'},events:{id:"preview-event",title:"Community celebration",authorName:"Nova Owner",xpMultiplier:3,coinMultiplier:2,until:now+7200000},appeals:{},feedback:{},audit:{},polls:{demo:{title:'What should Nova add next?',text:'Help choose our next update.',options:['More games','New themes','Community events'],at:now,closesAt:now+86400000,votes:{one:0,two:1,three:1,four:2}}}};

export async function previewControl(action){if(action==='status')return {owner:true};if(action==='dashboard')return sample;if(action==='dashboardPulse')return {activity:sample.activity,timeline:sample.timeline};if(action==='staffCommand')return {chatBanned:false,novaBanned:false,muteUntil:0};if(action==='pollResults')return {polls:[]};if(action==='logs')return {messages:{}};throw Error('Preview only — live changes are disabled.')}
