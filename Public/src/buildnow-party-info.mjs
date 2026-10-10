export function lobbyDetails(value){
 if(!value||value.available===false)return {available:false};
 const count=value.players,max=value.capacity;if(!Number.isInteger(count)||count<0||count>256||max!==null&&(!Number.isInteger(max)||max<1||max>256))throw Error('Invalid lobby player count.');
 return {available:true,mode:typeof value.mode==='string'?value.mode.trim().slice(0,64):'',players:count,capacity:max,open:value.open!==false,full:max!==null&&count>=max};
}
export function lobbySummary(lobby){
 if(!lobby)return {text:'Live lobby details updating…',blocked:false};
 if(!lobby.available)return {text:'Owner lobby unavailable · waiting for lobby details.',blocked:true};
 const population=lobby.capacity===null?lobby.players+' players':lobby.players+' / '+lobby.capacity+' players';
 return {text:(lobby.mode||'Mode unavailable')+' · '+population+' · '+(lobby.full?'Lobby full':!lobby.open?'Lobby closed':'Open lobby'),blocked:lobby.full||!lobby.open};
}
export function findOwnerParty(win,code,visited=new Set()){
 if(!win||visited.has(win)||visited.size>=24)return null;visited.add(win);
 try{const info=win.NovaBuildNowParty?.snapshot();if(info?.code===code)return {...lobbyDetails(info),code};for(const frame of win.document.querySelectorAll('iframe')){let result;try{if(frame.contentWindow.location.origin!==win.location.origin)continue;result=findOwnerParty(frame.contentWindow,code,visited);}catch{}if(result)return result;}}catch{}
 return null;
}
