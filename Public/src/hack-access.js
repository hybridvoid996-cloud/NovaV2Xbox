import {control} from './control-client.js';
export async function requireHackAccess(id){try{const data=await control('hackAccess');return Boolean(data.owned?.[id]);}catch{return false;}}
