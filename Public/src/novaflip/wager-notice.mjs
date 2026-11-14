// One announcement on arrival or when the host enables wagers, not every room update.
export function createWagerNotice(notify){
 let wasEnabled=false;
 return (enabled,hasBet=false)=>{
  enabled=enabled===true;
  if(enabled&&!wasEnabled)notify(hasBet
   ?'Wagers are enabled · your Nova Coins bet is placed. The winner takes the pot.'
   :'Wagers are enabled! Place at least 5,000 Nova Coins in the pot below to play. The winner takes the pot.');
  wasEnabled=enabled;
 };
}
