(()=>{try{
 const oldVisit=localStorage.getItem('nova-first-visit-v1'),existing=localStorage.getItem('nova_user')||localStorage.getItem('nova_account_version')||localStorage.getItem('nova_welcome_completed');
 let device=localStorage.getItem('nova-device-v1');if(!device){device=crypto.randomUUID();localStorage.setItem('nova-device-v1',device)}
 let pending;try{pending=JSON.parse(sessionStorage.getItem('nova-referral-pending'))}catch{}
 const token=new URLSearchParams(location.search).get('invite');if(token&&/^[a-f0-9]{32}$/.test(token)&&pending?.token!==token){pending={token,firstVisit:!oldVisit&&!existing,at:Date.now()};sessionStorage.setItem('nova-referral-pending',JSON.stringify(pending))}
 if(!oldVisit)localStorage.setItem('nova-first-visit-v1',String(Date.now()));
 window.NovaReferralEntry={device,...pending};
}catch{window.NovaReferralEntry={firstVisit:false}}})();
