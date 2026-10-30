export async function supportRequest(operation,data={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),operation==='message'?45000:15000);
 try{const response=await fetch('/api/account-support',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',credentials:'same-origin',signal:controller.signal,body:JSON.stringify({operation,...data})});let result;try{result=await response.json()}catch{throw Error('Support could not connect. Please retry shortly.')}if(!response.ok){const e=Error(result.error||'Support could not connect');e.status=response.status;throw e}return result}
 catch(e){if(e.name==='AbortError')throw Error('The connection is taking too long. Keep this tab open and try again.');if(e instanceof TypeError)throw Error('Support couldn’t connect. Your message stays here; reconnect and try again.');throw e}finally{clearTimeout(timer)}
}
