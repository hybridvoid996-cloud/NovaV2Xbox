(()=>{
const message=document.getElementById('launch-message'),retry=document.getElementById('retry');retry.onclick=()=>location.reload();
async function launch(){
 if(!('serviceWorker' in navigator))throw Error('This browser cannot start Fortnite’s game files. Open Nova in a browser with service worker support.');
 message.textContent='Preparing Fortnite’s game files…';
 const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});await navigator.serviceWorker.ready;if(registration.installing)await new Promise(resolve=>{const worker=registration.installing;worker.addEventListener('statechange',()=>{if(worker.state==='activated'||worker.state==='redundant')resolve()})});
 if(!navigator.serviceWorker.controller)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',ready);reject(Error('The game connection did not start. Please retry.'))},20000);function ready(){clearTimeout(timer);resolve()}navigator.serviceWorker.addEventListener('controllerchange',ready,{once:true})});
 message.textContent='Starting Fortnite…';const response=await fetch('/api/fortnite?path=fortnite/',{cache:'no-store'});if(!response.ok)throw Error('Fortnite could not load ('+response.status+'). Please retry.');const html=await response.text();if(!/fnweb|Fortnite/i.test(html))throw Error('The game host returned an unexpected page. Please retry.');const {mountFortniteDocument}=await import('/src/fortnite-document.mjs?v=20261016-canvas94');await mountFortniteDocument(html);
}
launch().catch(error=>{message.textContent=error.message;retry.hidden=false});
})();
