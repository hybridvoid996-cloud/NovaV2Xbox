// Nova Weed owner panel. Only shown when Nova's server says the signed-in account is an owner.
import {ITEMS,GUNS,VAPES,STRAINS,EFFECTS,RANKS,BOARDS,productKey,productName} from './economy.mjs?v=15';
import {RIDES} from './vehicles.mjs?v=15';
import {BUSINESSES,CAREERS} from './life.mjs?v=15';

// Ask Nova who this is. Never throws; owner stays false when signed out or offline.
export async function checkOwner(G){
 try{const n=await G.net();if(!n.signedIn)return false;const mod=await import('../novaflip/nova.mjs');const r=await mod.control('status');G.isOwner=!!r?.owner;return G.isOwner}catch{return false}
}

export function openAdmin(G,{h,money,openModal,closeModal,sfx}){
 if(!G.isOwner)return G.toast('The admin panel is for Nova owners only.','bad');
 const S=G.S;let tab='Player';
 const body=h('div',{class:'nw-admin-body'}),tabs=h('div',{class:'nw-tabs'});
 const done=(msg)=>{sfx.click();G.toast(msg,'good');G.onInventory();G.save();paint()};
 const btn=(label,fn,cls='')=>h('button',{class:'nw-b '+cls,onclick:fn},label);
 const sec=(title,...kids)=>h('section',{},h('h4',{},title),h('div',{class:'grid'},...kids));
 const stat=(k,v)=>h('div',{class:'st'},h('small',{},k),h('b',{},v));
 const P=G.PLACES;
 const pages={
  Player:()=>[
   h('div',{class:'stats'},stat('Cash',money(S.money)),stat('Bank',money(S.bank||0)),stat('Rank',RANKS[G.rank()].name),stat('Health',Math.round(S.hp??100)),stat('Wanted','★'.repeat(G.wanted||0)||'none')),
   sec('Money',...[100,1000,10000,100000].map(n=>btn('+'+money(n)+' cash',()=>{S.money+=n;done('Added '+money(n))})),btn('+'+money(10000)+' bank',()=>{S.bank=(S.bank||0)+10000;done('Added to bank')}),btn('Reset to $0',()=>{S.money=0;S.bank=0;done('Money reset')},'red')),
   sec('Rank',...RANKS.map((r,i)=>btn(r.name,()=>{S.xp=r.xp;done('Rank set to '+r.name)},G.rank()===i?'go':''))),
   sec('Cheats',
    btn((G.god?'✓ ':'')+'God mode',()=>{G.god=!G.god;done(G.god?'You can’t be hurt.':'God mode off')},G.god?'go':''),
    btn('Speed ×'+(G.adminSpeed||1),()=>{G.adminSpeed=(G.adminSpeed||1)>=3?1:(G.adminSpeed||1)+1;done('Walk speed ×'+G.adminSpeed)}),
    btn('Heal',()=>{S.hp=100;done('Healed')}),
    btn('Clear wanted',()=>{G.wanted=0;G.curfewChase=false;for(const o of G.police)if(!o.dead)o.w.release();done('Wanted cleared')}),
    btn('Clear effects',()=>{G.effects={};done('Effects cleared')}),
    btn('Get lifted',()=>{G.effects.high=performance.now()/1000+60;done('Lifted for 60s')})),
   sec('Teleport',...[['Home',P.home.door.x,P.home.door.z+2],['Bus stop',P.spawn.x,P.spawn.z],['Green Thumb',P.garden.clerk.x,P.garden.clerk.z+2.4],['Quick Stop',P.quick.clerk.x,P.quick.clerk.z-2.4],['Thread Co.',P.thread.clerk.x,P.thread.clerk.z-2.4],['Police',P.police.x,P.police.z+4],['Park',P.park.x,P.park.z-10],['Island Motors',0,121],['Vic (motel)',(G.world.motel?.x||-79)+8.5,(G.world.motel?.z||-41)-3.6],['Fuel & Go',G.world.gas?.door.x||16,(G.world.gas?.door.z||-80)-2],['Beach pier',20,150]].map(([n,x,z])=>btn(n,()=>{closeModal(G);if(G.driving)G.rides.exit();G.player.teleport(x,z,G.player.yaw);G.toast('Teleported to '+n)})),
    ...(G.coop?[...G.coop.players.values()].filter(rp=>rp.model).map(rp=>btn('→ '+rp.name,()=>{closeModal(G);const p=rp.model.position;G.player.teleport(p.x+1.5,p.z,G.player.yaw)})):[]))
  ],
  Items:()=>{
   const give=(id,n)=>{const it=ITEMS[id];if(it?.gives)for(const [k,q]of Object.entries(it.gives))S.inv[k]=(S.inv[k]||0)+q*n;else S.inv[id]=(S.inv[id]||0)+n;if(GUNS[id]){G.mag=G.mag||{};G.mag[id]=GUNS[id].mag}};
   return [
    sec('Quick kits',
     btn('Starter grow kit',()=>{for(const id of ['seed_kush','seed_haze','seed_star'])give(id,5);give('soil',10);give('fertilizer',5);give('baggies',5);done('Grow kit added')}),
     btn('Armory',()=>{for(const id of Object.keys(GUNS))S.inv[id]=1;give('ammo',8);give('med_kit',5);G.mag=G.mag||{};for(const id of Object.keys(GUNS))G.mag[id]=GUNS[id].mag;done('Guns, ammo and med kits added')}),
     btn('All vapes',()=>{for(const id of Object.keys(VAPES))give(id,1);done('Vapes added')}),
     btn('All mixers ×10',()=>{for(const id of Object.keys(ITEMS))if(ITEMS[id].mixer)give(id,10);done('Mixers added')}),
     btn('Clear inventory',()=>{S.inv={};done('Inventory cleared')},'red')),
    sec('Any item',...Object.entries(ITEMS).filter(([,it])=>it.price).map(([id,it])=>btn(it.name,()=>{give(id,id==='pot'?0:1);if(id==='pot'&&G.potList().length<8){if(G.coop)G.coop.addPot();else S.pots.push({});G.refreshPots()}done('Gave '+it.name)}))),
    sec('Products (10 bags, 100% quality)',...Object.keys(STRAINS).flatMap(st=>[[st,[]],[st,['glow','focus']],[st,['energy','fruity','fizzy']]]).map(([st,eff])=>{const key=productKey(st,[...new Set([...eff])]);return btn(productName(key),()=>{const p=S.products[key]||(S.products[key]={bags:0,buds:0,quality:1});p.bags+=10;p.quality=1;done('Added 10× '+productName(key))})}))
   ]},
  World:()=>{const ck=G.clockNow();return [
   h('div',{class:'stats'},stat('Day',ck.day),stat('Time',String(Math.floor(ck.minute/60)).padStart(2,'0')+':'+String(Math.floor(ck.minute%60)).padStart(2,'0')),stat('Clock',G.freezeTime?'frozen':'running'),stat('Pots',G.potList().length+'/8')),
   sec('Time of day',...[['Morning',7],['Noon',12],['Evening',18],['Curfew 9 PM',21],['Midnight',0]].map(([n,hr])=>btn(n,()=>{if(G.coop&&!G.coop.isHost)return G.toast('Only the host controls time.','bad');S.minute=hr*60;G.coop?.pushClock(S);done('Time set to '+n)})),
    btn(G.freezeTime?'Unfreeze time':'Freeze time',()=>{G.freezeTime=!G.freezeTime;done(G.freezeTime?'Time frozen':'Time running')}),
    btn('Next day',()=>{S.day++;S.minute=7*60;G.onNewDay?.();G.coop?.pushClock(S);done('Day '+S.day)})),
   sec('Grow room',
    btn('Finish all plants',()=>{for(const p of S.pots)if(p?.strain){p.progress=1;p.water=1}G.refreshPots();done('All plants ready to harvest')}),
    btn('Water all',()=>{for(const p of S.pots)if(p?.strain)p.water=1;G.refreshPots();done('Watered')}),
    btn('Fill every pot',()=>{const mx=G.maxPots?.()||8;for(let i=0;i<mx;i++)S.pots[i]=S.pots[i]||{};for(const p of S.pots){p.soil=true;if(!p.strain){p.strain='star';p.progress=0;p.water=1;p.quality=1}}G.refreshPots();done('8 pots planted with Starlight OG')})),
   sec('Unlocks',
    btn('All rides',()=>{S.rides=S.rides||{};for(const id of Object.keys(RIDES))S.rides[id]={...S.rides[id],owned:true};G.rides.load();done('Every ride unlocked')}),
    btn('All boards',()=>{S.boards={};for(const id of Object.keys(BOARDS))S.boards[id]=true;S.board='gold';done('Every deck unlocked')}),
    btn('All businesses',()=>{S.biz={};for(const id of Object.keys(BUSINESSES))S.biz[id]=true;done('All businesses owned')}),
    btn('Hire for a career',()=>{S.career={id:'tailor',status:'hired',day:S.day};done('Hired at Thread Co.')}),
    btn('All outfits',()=>{S.owned=S.owned||{};for(const k of ['tee_white','tee_black','hoodie_green','tee_red','hoodie_purple','jersey_blue','flannel','gold_tee','cap','beanie','bucket','none'])S.owned[k]=true;done('Every outfit unlocked')})),
   sec('Town',
    btn('Everyone wants to buy',()=>{for(const n of G.npcs)if(!n.dead)n.wants=true;done('All customers are buying')}),
    btn('Max loyalty',()=>{for(const n of G.npcs){S.customers[n.c.id]={...(S.customers[n.c.id]||{}),met:true,loyalty:5}}done('Everyone is a regular')}),
    btn('Revive everyone',()=>{for(const n of [...G.npcs,...G.police])if(n.dead){n.dead=false;n.hp=undefined;n.g.rotation.x=0;n.g.position.y=0;n.w.release()}done('Everyone is back up')}))
  ]},
  Session:()=>{const c=G.coop;if(!c)return [h('p',{class:'sub'},'You’re playing solo. Host or join a session to manage players here.')];
   return [h('div',{class:'stats'},stat('Code',c.code),stat('Role',c.isHost?'Host':'Guest'),stat('Players',(c.players.size+1)+'/4')),
    sec('Players',...[...c.players.values()].map(rp=>h('div',{class:'prow'},h('b',{},rp.name),btn('Send $1,000',async()=>{try{await c.gift(rp.uid,{money:1000});done('Sent '+rp.name+' $1,000')}catch{G.toast('Gift failed','bad')}}),c.isHost?btn('Kick',async()=>{await c.kick(rp.uid);done(rp.name+' was removed')},'red'):null))),
    sec('Announce',(()=>{const inp=h('input',{class:'nw-name',maxlength:'120',placeholder:'Message to everyone'});inp.addEventListener('keydown',e=>e.stopPropagation());return h('div',{class:'ann'},inp,btn('Send',()=>{const t=inp.value.trim();if(!t)return;c.chat('[Owner] '+t);inp.value='';G.toast('Sent')},'go'))})())]}
 };
 const paint=()=>{tabs.replaceChildren(...Object.keys(pages).map(t=>h('button',{class:t===tab?'on':'',onclick:()=>{tab=t;paint()}},t)));body.replaceChildren(...pages[tab]())};
 paint();
 openModal(G,h('div',{class:'nw-panel nw-admin'},h('div',{class:'ahead'},h('div',{},h('span',{class:'badge'},'OWNER'),h('h2',{},'Admin panel')),h('button',{class:'x',onclick:()=>closeModal(G),'aria-label':'Close'},'×')),tabs,body,h('p',{class:'sub foot'},'F8 opens this panel. Changes apply to your own save.')));
}
