const root='https://playobsidian.com/cdn/assets/html/46975ef1-a576-49c2-b0ae-b740301204d2/1/';
// The installed curl transport treats HEAD Content-Length as missing body
// bytes. A one-byte range supplies the real file size without downloading it.
export async function wiiFileHead(request,[url,method,body,headers,signal],gameId){
 if(String(gameId)!=='1047'||method!=='HEAD'||!url.href.startsWith(root))return null;
 const rangeHeaders=[...(headers||[])].filter(([name])=>!['range','content-length'].includes(name.toLowerCase()));
 rangeHeaders.push(['Range','bytes=0-0']);
 const response=await request(url,'GET',undefined,rangeHeaders,signal);
 const values=new Headers(response.headers);
 if(response.status!==206)return {...response,body:null,headers:response.headers};
 const match=/^bytes 0-0\/(\d+)$/.exec(values.get('content-range')||'');
 if(!match||Number(match[1])<1)throw Error('Wii file server returned an invalid file size.');
 const bytes=await new Response(response.body).arrayBuffer();
 if(bytes.byteLength!==1)throw Error('Wii file size check returned incomplete data.');
 values.delete('content-range');values.delete('content-encoding');values.set('content-length',match[1]);
 return {...response,status:200,statusText:'OK',body:null,headers:[...values]};
}
