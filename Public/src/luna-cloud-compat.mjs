/* Only remove Luna's courtesy delay for its guest-progress notice. */
export async function patchLunaGuestNotice(response){
 if(response.status!==200)return response;
 const text=typeof response.body==='string'?response.body:await new Response(response.body).text();
 if(!text.includes('You are using a guest account.'))return {...response,body:text};
 const patched=text.replace(/\b(var|let|const)(\s+\w+\s*=\s*)(?:3e3|3000)(;function\s+\w+\(\{onConfirm:\w+,onClose:\w+\}\))/,(_,declaration,assignment,fn)=>declaration+assignment+'0'+fn);
 if(patched===text)return {...response,body:text};
 return {...response,body:patched,headers:response.headers.filter(([name])=>!['content-length','content-encoding'].includes(name.toLowerCase()))};
}
