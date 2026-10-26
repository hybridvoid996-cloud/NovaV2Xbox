import {isProtectedOwner} from './protected-owners.mjs';
export async function canUseComputer(db,uid,env=process.env){
 if(isProtectedOwner(uid)||(env.NOVA_OWNER_UIDS||'').split(',').map(s=>s.trim()).includes(uid))return true;
 const [role,staff]=await Promise.all([db.ref('novaChatV2/roles/'+uid).get(),db.ref('novaChatV2/staffAccess/'+uid).get()]);
 return ['owner','admin'].includes(role.val())||staff.val()?.administrator===true;
}
