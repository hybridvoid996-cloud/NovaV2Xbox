// Require the provider error's distinctive wording, not an ordinary movie title.
export function isMovieProviderError(text,title=''){
 const content=(String(title)+' '+String(text)).replace(/\s+/g,' ').trim().slice(0,12000);
 return /No available servers found/i.test(content)&&/Playback Error|No alternative servers available/i.test(content)||
  /(?:DEPLOYMENT_NOT_FOUND|DEPLOYMENT_DISABLED|FUNCTION_INVOCATION_FAILED|FUNCTION_INVOCATION_TIMEOUT)/.test(content)||
  /\b404\b/.test(content)&&/\bNOT_FOUND\b/.test(content)||
  /404\s*:?\s*(?:NOT_FOUND|This page could not be found|This page (?:does not|doesn't) exist)/i.test(content)||
  /(?:deployment|page) (?:could not be found|does not exist|doesn't exist)|page not found/i.test(content)&&/\bvercel\b/i.test(content)||
  /^(?:404\s*[:|–—-]?\s*)?(?:this page could not be found|this page (?:does not|doesn't) exist|page not found)[.!\s]*$/i.test(String(title).trim());
}
