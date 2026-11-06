// A blank host is a shell, not an additional Nova app instance.
(()=>{let hosted=false;try{hosted=parent!==window&&parent.__novaBlankHost===true&&parent.document.querySelector('#nova-blank-frame')?.contentWindow===window}catch{}
 window.NovaBlankHosted=hosted;
 window.NovaAccountNavigate=path=>{const url=new URL(path,location.href);if(hosted&&url.origin===location.origin){parent.location.replace(url.href);return}location.replace(url.href)};
})();
