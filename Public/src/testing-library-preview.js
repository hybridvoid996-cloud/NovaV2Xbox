await import('./nova-os-preview.js');
const css=document.querySelector('link[href="src/nova-os.css"]');
if(css&&!css.sheet)await new Promise(resolve=>{css.addEventListener('load',resolve,{once:true});css.addEventListener('error',resolve,{once:true})});
await new Promise(resolve=>requestAnimationFrame(resolve));
window.openLibrary('testing');
