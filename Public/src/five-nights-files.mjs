export function gameFileMirrors(url){const match=String(url).match(/^https:\/\/cdn\.jsdelivr\.net\/gh\/([^/]+)\/([^/@]+)@([A-Za-z0-9_.-]+)\/(.+)$/);if(!match)return [url];return [url,url.replace('cdn.jsdelivr.net','fastly.jsdelivr.net'),'https://raw.githubusercontent.com/'+match[1]+'/'+match[2]+'/'+match[3]+'/'+match[4]]}
export async function fetchGameFile(url,{signal,fetcher=fetch,readBody=false}={}){let last;for(const mirror of gameFileMirrors(url)){if(signal?.aborted)throw signal.reason;try{const r=await fetcher(mirror,{signal:AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(90000)])});if(!r.ok)throw Error('Game file unavailable ('+r.status+').');return readBody?await r.arrayBuffer():r}catch(error){last=error;if(signal?.aborted)throw error}}throw last}

// EmulatorJS accepts Blob input directly; blob URLs trigger unsupported HEAD requests.
export function joinGameParts(chunks){return new Blob(chunks)}
