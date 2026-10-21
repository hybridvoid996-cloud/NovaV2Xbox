(()=>{
 if(new URLSearchParams(location.search).get('nova-os')!=='1')return;
 document.documentElement.classList.add('nova-os-search');
 
 const title=document.querySelector('#newtab h1');title.replaceChildren();const logo=document.createElement('img');logo.src='Nova12.png';logo.alt='';const text=document.createElement('span');text.textContent='Explore your next idea.';title.append(logo,text);title.setAttribute('aria-label','Explore your next idea.');
 document.querySelector('#newtab>p').textContent='Your own corner of the web. Search, browse, and pick up where you left off.';
 document.querySelector('#add-shortcut').textContent='+ Add shortcut';document.querySelector('.quick-heading>span').textContent='YOUR SHORTCUTS';
 const note=document.createElement('p');note.className='os-search-tip';note.textContent='Type a website address or search for anything.';document.querySelector('.search-row').after(note);
})();
