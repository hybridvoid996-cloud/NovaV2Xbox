// Restore the asset base used by Construct exports hosted under a remote <base>.
export async function repairConstructBase(url,response){
 if(response.status!==200||!url.pathname.endsWith('/scripts/main.js')||!/(?:blumgi-rocket|catgunner)/.test(url.pathname))return response;
 const source=typeof response.body==='string'?response.body:await new Response(response.body).text();
 const body=source.replace(/new (?:self\.|window\.)?RuntimeInterface\(\{/g,match=>match+'baseUrl:document.baseURI,');
 return {...response,body,headers:response.headers.filter(([name])=>!['content-length','content-encoding'].includes(name.toLowerCase()))};
}
