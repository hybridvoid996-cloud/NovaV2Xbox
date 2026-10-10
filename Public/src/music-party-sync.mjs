export function partyClockOffset(result,start,end){
 const serverNow=Number(result?.serverNow);if(!Number.isFinite(serverNow))return null;
 const held=Math.max(0,Math.min(Math.max(0,end-start),Number(result.serverWaitMs)||0));
 return serverNow-(start+end+held)/2;
}
