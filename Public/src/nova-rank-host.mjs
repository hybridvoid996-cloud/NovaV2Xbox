export function isRankRuntimeHost(win){
 try{
  if(win===win.top)return true;
  return new URL(win.location.href).pathname==='/home.html'&&win.parent.__novaBlankHost===true&&win.frameElement?.id==='nova-blank-frame';
 }catch{return false}
}
