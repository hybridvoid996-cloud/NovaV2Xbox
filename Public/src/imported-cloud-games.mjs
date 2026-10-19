export const importedCloudGames=Object.freeze({'969':'synapse-9d695bb2e96d65f6','974':'ng_among_us','976':'clash_royale'});
export function importedCloudLaunch(kind,id,base){const target=kind==='game'&&importedCloudGames[String(id)];if(!target)return null;const url=new URL(base);url.searchParams.set('kind','cloud');url.searchParams.set('id',target);return url.href}
