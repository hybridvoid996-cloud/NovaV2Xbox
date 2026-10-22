// The export pauses its menu-to-game transition for a host interstitial.
// Nova has no interstitial inventory; complete that transition without a reward.
(() => {
 window.ShowAds = () => {
  Promise.resolve().then(() => {
   window.gameInstance?.SendMessage('AdsManager', 'onAdServed');
  });
 };
})();
