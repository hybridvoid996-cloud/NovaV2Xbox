// A failed resume must not disguise an existing email as a failed new login.
export async function createOrResumeAccount(email,password,{create,signIn}){
 try{return {user:await create(email,password),resumed:false}}
 catch(error){
  if(error.code!=='auth/email-already-in-use')throw error;
  try{return {user:await signIn(email,password),resumed:true}}
  catch(resumeError){
   if(['auth/invalid-credential','auth/wrong-password','auth/user-not-found'].includes(resumeError.code))throw Object.assign(Error('An account already uses this email. Log in or reset its password, or use a different email to create a new account.'),{code:'auth/email-already-in-use'});
   throw resumeError;
  }
 }
}
