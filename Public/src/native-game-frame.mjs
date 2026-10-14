import {auditedNativeGames} from './game-native-catalog.mjs';
const paths={...auditedNativeGames,"38":"/content/games/38-f.html","39":"/content/games/39-f.html","40":"/content/games/40-f.html","41":"/content/games/41-f.html","185":"/content/games/185-f.html","190":"/content/games/190-f.html","191":"/content/games/191-f.html","192":"/content/games/192-f.html","204":"/content/games/204-a.html","428":"/content/games/428-f.html","503":"/content/games/503.html","504":"/content/games/504.html","704":"/content/games/704-fix.html","710":"/content/games/710-fix.html","750":"/content/games/750-u.html","813":"/content/games/813-f3.html",'206':'/content/games/206-f.html','505':'/content/games/505.html','506':'/content/games/506-f.html','694':'/content/games/694.html','696':'/content/games/696-f.html'};
export function nativeGameURL(item,kind,base){
 if(kind!=='game'||!paths[String(item?.id)])return null;
 const url=new URL(item.url,base),home=new URL(base);
 if(url.origin!==home.origin||url.pathname!==paths[String(item.id)])return null;
 return url.href;
}
