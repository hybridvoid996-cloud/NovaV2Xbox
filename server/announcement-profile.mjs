const caches=new WeakMap();
export async function announcementProfile(db,uid,now=Date.now()){
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid||''))return {};
 let cache=caches.get(db);if(!cache)caches.set(db,cache=new Map());const old=cache.get(uid);if(old&&now-old.at<30000)return old.value;
 const get=async p=>(await db.ref(p).get()).val();
 const [p,role]=await Promise.all([get('novaChatV2/profiles/'+uid),get('novaChatV2/roles/'+uid)]);const profile=p||{};
 const colors={owner:['#7af0a6','#ffffff'],admin:['#6ba4ff','#c1f3ff'],moderator:['#e699ff','#ffc28c'],member:['#a7afc4','#eeeeff']};let pair=colors[role]||colors.member;
 if(/^[A-Za-z0-9_-]{1,128}$/.test(profile.nameColorRole||'')&&!colors[profile.nameColorRole]){const [member,custom]=await Promise.all([get('novaChatV2/memberRoles/'+uid+'/'+profile.nameColorRole),get('novaChatV2/customRoles/'+profile.nameColorRole)]);if(member&&custom)pair=[custom.from,custom.to]}
 const color=(v,f)=>/^#[a-f0-9]{3,8}$/i.test(v||'')?v:f;
 const value={name:String(profile.name||'').slice(0,80),photo:String(profile.photo||'').slice(0,200000),effect:String(profile.effect||'').slice(0,100),decoration:String(profile.decoration||'').slice(0,100),nitroAnimation:['orbit','shimmer'].includes(profile.nitroAnimation)?profile.nitroAnimation:'none',usernameFont:['serif','mono','rounded','heavy'].includes(profile.usernameFont)?profile.usernameFont:'default',nameRole:{from:color(pair[0],'#a7afc4'),to:color(pair[1],'#ffffff')}};
 cache.set(uid,{at:now,value});return value;
}
