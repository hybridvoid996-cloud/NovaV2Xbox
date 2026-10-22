// Standalone compatibility for exports that otherwise wait for a YouTube host.
(()=>{const noop=()=>{},ready=()=>Promise.resolve(),key='nova-playable-save:'+location.pathname;const subscribe=(type,fn)=>{const callback=()=>{if((type==='pause'&&document.hidden)||(type==='resume'&&!document.hidden))fn()};document.addEventListener('visibilitychange',callback);return ()=>document.removeEventListener('visibilitychange',callback)};
// Opt in only exports that require this lifecycle; other games keep their existing behavior.
const flags={getFlag:()=>false,getFlags:()=>({})};window.ytgame={SDK_VERSION:'nova-standalone-1',IN_PLAYABLES_ENV:document.currentScript?.dataset?.novaPlayableHost==='true',ready,getFlag:flags.getFlag,getFlags:flags.getFlags,flags,
game:{ready,firstFrameReady:noop,gameReady:noop,getFlag:flags.getFlag,async loadData(){try{return localStorage.getItem(key)||''}catch{return ''}},async saveData(value){if(typeof value!=='string')throw Error('Save data must be a string.');try{localStorage.setItem(key,value)}catch{throw Error('Browser save storage is unavailable.')}},onGameDataAvailable:()=>noop},
system:{ready,isAudioEnabled:()=>true,onAudioEnabledChange:()=>noop,onPause:fn=>subscribe('pause',fn),onResume:fn=>subscribe('resume',fn),async getLanguage(){return navigator.language||'en'},getFlag:flags.getFlag},
ads:{AdResult:{AD_NOT_SHOWN:'AD_NOT_SHOWN'},async requestInterstitialAd(){return 'AD_NOT_SHOWN'},async requestAd(){return 'AD_NOT_SHOWN'}},engagement:{sendScore:ready},health:{logError:noop,logWarning:noop}};
})();
