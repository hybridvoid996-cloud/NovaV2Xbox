(()=>{
const page=document.createElement('section');page.className='nova-settings-page';page.hidden=true;page.setAttribute('aria-label','Nova settings');const iframe=document.createElement('iframe');iframe.title='Nova settings';page.append(iframe);document.body.append(page);let previous;
function closePanel(focus=true){if(page.hidden)return;page.hidden=true;document.body.classList.remove('nova-settings-page-open');document.querySelector('header [data-page=settings]')?.classList.remove('active');if(focus)previous?.focus({preventScroll:true})}
const baseOpen=window.openPage;window.openPage=function(name,...args){if(name!=='settings')closePanel(false);return baseOpen.call(this,name,...args)};
window.openNovaSettings=()=>{if(!page.hidden)return;previous=document.activeElement;window.openPage('home');document.body.classList.remove('main-library-page','main-runtime-active');document.body.classList.add('nova-settings-page-open');if(!iframe.getAttribute('src'))iframe.src='settings.html';page.hidden=false;document.querySelector('header [data-page=settings]')?.classList.add('active')};
addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==iframe.contentWindow)return;if(e.data?.novaAction==='closeSettings')closePanel();if(e.data?.novaAction==='settingsChanged')dispatchEvent(new Event('storage'));if(e.data?.novaAction==='settingsSignOut')location.assign('account.html?logout=1')});
document.addEventListener('click',e=>{const button=e.target.closest('[data-page]');if(button&&button.dataset.page!=='settings')closePanel(false)},true);
addEventListener('keydown',e=>{if(e.key==='Escape'&&!page.hidden)closePanel()});
})();
