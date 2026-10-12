export const OS_APPS=['library','apps','music','chat','novatube','novamovies','search','ai','computer','settings','owner'];
export function gameKey(game){return ['game','cloud','app'].includes(game?.kind)&&game.id!=null?game.kind+':'+game.id:null}
export function cleanSession(value,now=Date.now()){
 if(!value||value.version!==1||!Number.isFinite(value.at)||now-value.at>7*86400000||value.at>now+60000)return null;
 const apps=[...new Set(Array.isArray(value.apps)?value.apps:[])].filter(p=>OS_APPS.includes(p)).slice(0,3);
 const game=typeof value.game==='string'&&/^(game|cloud|app):[^\s]{1,180}$/.test(value.game)?value.game:null;
 return apps.length||game?{version:1,at:value.at,apps,game}:null;
}
export function inviteText(game){const key=gameKey(game);if(!key)throw Error('Choose a game first.');return 'Nova game invite: '+key+'\n'+String(game.name||'Game').slice(0,120)+'\nOpen the same title in Nova. Multiplayer joining depends on the game.'}
export function parseInvite(text){const match=typeof text==='string'&&/^Nova game invite: ((?:game|cloud):[^\s]{1,180})\n/.exec(text);return match?match[1]:null}
export function searchItems(items,query,limit=40){const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);return items.filter(x=>terms.every(t=>String(x.name).toLowerCase().includes(t))).slice(0,limit)}
