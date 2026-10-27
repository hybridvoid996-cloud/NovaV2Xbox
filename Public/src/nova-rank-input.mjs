export function createRankInput(now=()=>performance.now()){
 let last=-Infinity;
 return {input(event){if(event?.isTrusted!==true||event.repeat||!['keydown','pointerdown','touchstart'].includes(event.type))return false;last=now();return true},active(){return now()-last<45000},reset(){last=-Infinity}};
}
