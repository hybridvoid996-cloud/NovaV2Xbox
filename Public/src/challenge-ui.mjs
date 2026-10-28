const catalogs=new Map();
export function challengeGame(games,id){return games.find(game=>String(game.id)===String(id))}
export function challengeCountdown(resetAt,now=Date.now()){const remaining=Number(resetAt)-now;if(!Number.isFinite(remaining)||!resetAt)return 'Syncing challenge schedule…';if(remaining<=0)return 'Refreshing challenges…';const seconds=Math.ceil(remaining/1000),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);return 'New challenges in '+(hours?hours+'h ':'')+minutes+'m '+seconds%60+'s'}
export async function launchChallenge(challenge,{request=fetch,launch=globalThis.window?.NovaRecent?.launch,navigate=url=>location.assign(url),open=globalThis.window?.openPage}={}){
 const kind=challenge.kind||'game';
 if(kind==='movie'){if(typeof open==='function')return open('movies');return navigate('/novamovies.html')}
 const file={game:'games',app:'apps',cloud:'cloud'}[kind];if(!file)throw Error('This challenge is unavailable.');
 if(!catalogs.has(kind))catalogs.set(kind,request('/library-'+file+'.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('The library could not load.');return r.json()}).catch(e=>{catalogs.delete(kind);throw e}));
 const game=challengeGame(await catalogs.get(kind),challenge.id);if(!game)throw Error('This challenge is no longer available. Refresh your challenges.');
 if(typeof launch==='function')return launch({...game,kind});return navigate('/player.html?kind='+kind+'&id='+encodeURIComponent(game.id));
}
