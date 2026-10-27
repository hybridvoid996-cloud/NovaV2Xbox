(()=>{try{
 const key='nova-referral-pending',maxAge=7*86400000,oldVisit=localStorage.getItem('nova-first-visit-v1'),existing=localStorage.getItem('nova_user')||localStorage.getItem('nova_account_version')||localStorage.getItem('nova_welcome_completed');
 let device=localStorage.getItem('nova-device-v1');if(!device){device=crypto.randomUUID();localStorage.setItem('nova-device-v1',device)}
 let pending;try{pending=JSON.parse(sessionStorage.getItem(key)||localStorage.getItem(key)||'null')}catch{}
 if(pending&&(!/^[a-f0-9]{32}$/.test(pending.token||'')||!Number.isFinite(pending.at)||Date.now()-pending.at>maxAge)){pending=null;sessionStorage.removeItem(key);localStorage.removeItem(key)}
 const token=new URLSearchParams(location.search).get('invite');if(token&&/^[a-f0-9]{32}$/.test(token)&&pending?.token!==token)pending={token,firstVisit:!oldVisit&&!existing,at:Date.now()};
 const save=value=>{const data={token:value.token,firstVisit:value.firstVisit===true,at:value.at||Date.now(),error:value.error||'',terminal:value.terminal===true};sessionStorage.setItem(key,JSON.stringify(data));localStorage.setItem(key,JSON.stringify(data))};
 if(pending)save(pending);if(!oldVisit)localStorage.setItem('nova-first-visit-v1',String(Date.now()));
 window.NovaReferralEntry={device,...pending,save(){save(this)},clear(){sessionStorage.removeItem(key);localStorage.removeItem(key);delete this.token;delete this.error;delete this.terminal}};
}catch{window.NovaReferralEntry={firstVisit:false}}})();
