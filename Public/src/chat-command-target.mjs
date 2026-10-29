// Resolve canonical IDs first. Display names may be duplicated and are never authority.
export function resolveCommandTarget(raw, profiles, self){
 const text=String(raw||'').trim().replace(/^"|"$/g,'');
 if(!text)return self?[self,profiles[self]||{name:self}]:null;
 const mention=text.match(/^(?:@<|<@!?)([^<>]+)>$/);
 const target=mention?mention[1]:text.replace(/^@/,'');
 if(Object.hasOwn(profiles,target))return [target,profiles[target]];
 const matches=Object.entries(profiles).filter(([,p])=>[p.name,p.username,p.loginUsername].some(n=>typeof n==='string'&&n.toLowerCase()===target.toLowerCase()));
 return matches.length===1?matches[0]:null;
}
