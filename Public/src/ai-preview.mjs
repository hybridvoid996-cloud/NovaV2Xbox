const bridge=`(()=>{const send=(level,args)=>parent.postMessage({novaPreviewConsole:true,level,text:args.map(v=>{try{return typeof v==='string'?v:JSON.stringify(v)}catch{return String(v)}}).join(' ').slice(0,2000)},'*');for(const level of ['log','warn','error','info']){const old=console[level];console[level]=(...a)=>{send(level,a);old.apply(console,a)}}addEventListener('error',e=>send('error',[e.message+' · line '+e.lineno]));addEventListener('unhandledrejection',e=>send('error',[String(e.reason)]));send('info',['Preview started']);})();`;
export function previewDocument(files){
 const escape=s=>String(s||'').replace(/<\/script/gi,'<\\/script');let html=String(files.html||'').replace(/<!doctype[^>]*>/gi,'');
 const entries={'styles.css':files.css||'','script.js':files.js||'',...files},scripts=[],seen=new Set();
 html=html.replace(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi,(tag,path)=>Object.hasOwn(entries,path.replace(/^\.\//,''))?'<style>'+String(entries[path.replace(/^\.\//,'')]).replace(/<\/style/gi,'< /style')+'</style>':tag).replace(/<script\b[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,(tag,path)=>{const name=path.replace(/^\.\//,'');if(!Object.hasOwn(entries,name))return tag;if(!seen.has(name)){scripts.push(entries[name]);seen.add(name)}return ''});
 if(!seen.has('script.js')&&files.js)scripts.push(files.js);
 const head='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src https: data:; font-src data:; connect-src \'none\'; form-action \'none\'; base-uri \'none\'"><script>'+bridge+'</script><style>html{color-scheme:light}body{color:#171717;background:#fff}'+String(files.css||'').replace(/<\/style/gi,'< /style')+'</style>';
 if(/<head\b[^>]*>/i.test(html))html=html.replace(/<head\b[^>]*>/i,tag=>tag+head);
 else if(/<html\b[^>]*>/i.test(html))html=html.replace(/<html\b[^>]*>/i,tag=>tag+'<head>'+head+'</head>');
 else html='<html><head>'+head+'</head><body>'+html+'</body></html>';
 const tail=scripts.map(source=>'<script>'+escape(source)+'</script>').join('');
 html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,tail+'</body>'):html+tail;
 return '<!doctype html>'+html;
}
