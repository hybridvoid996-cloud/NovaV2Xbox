// Account restoration and live chat profiles can finish in either order.
// Retain live permissions/cosmetics only for the same authenticated account.
export function restoredAccountProfile(current,user,record){
 const existing=current?.uid===user.uid?current:{};
 return {...existing,uid:user.uid,name:existing.name??record.name??'Nova player',photo:existing.photo??record.photo??''};
}
