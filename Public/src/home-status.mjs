import {NOVA_VERSION} from './nova-release.mjs';
export function mountHomeStatus({openUpdates,openActive,win=window,doc=document}={}){
 const bar=doc.createElement('div');bar.className='main-home-status';bar.setAttribute('aria-label','Nova version and community');
 const update=doc.createElement('button');update.type='button';update.className='main-version-status';update.setAttribute('aria-label','Open update log · Nova '+NOVA_VERSION);update.title='Nova update log';update.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/></svg>';const version=doc.createElement('span');version.textContent='v'+NOVA_VERSION;update.append(version);update.onclick=openUpdates;
 const line=doc.createElement('span');line.className='main-status-divider';line.setAttribute('aria-hidden','true');const online=doc.createElement('button');online.type='button';online.className='main-online-status';const dot=doc.createElement('i');dot.setAttribute('aria-hidden','true');const count=doc.createElement('span');online.append(dot,count);online.onclick=openActive;
 const paint=()=>{const rows=win.novaOSMembers;const n=Array.isArray(rows)?rows.filter(p=>p.online).length:null;const label=n===null?'— online':n.toLocaleString()+' online';if(count.textContent!==label)count.textContent=label;online.setAttribute('aria-label','Open active players · '+label)};
 bar.append(update,line,online);doc.body.append(bar);win.addEventListener('nova-guide-data',paint);paint();return {bar,paint};
}
