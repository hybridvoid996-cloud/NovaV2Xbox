import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../Public/content/runtime/nova-ytgame.js', import.meta.url), 'utf8');
function host(enabled) {
 const saved = new Map();
 const context = {window: {}, location: {pathname: '/content/games/663.html'}, navigator: {language: 'en'}, document: {currentScript: {dataset: enabled ? {novaPlayableHost: 'true'} : {}}, addEventListener() {}, removeEventListener() {}}, localStorage: {getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value)}};
 vm.runInNewContext(source, context);
 return context.window.ytgame;
}
test('Bolt opts into the standalone host without changing other exports', async () => {
 const html = await readFile(new URL('../Public/content/games/663.html', import.meta.url), 'utf8');
 assert.match(html, /nova-ytgame\.js\?v=[^" ]+" data-nova-playable-host="true"/);
 assert.equal(host(true).IN_PLAYABLES_ENV, true);
 assert.equal(host(false).IN_PLAYABLES_ENV, false);
});
test('Bolt host preserves saves and resolves unavailable interstitials without rewards', async () => {
 const api = host(true);
 await api.game.saveData('{"level":2}');
 assert.equal(await api.game.loadData(), '{"level":2}');
 assert.equal(await api.ads.requestInterstitialAd(), 'AD_NOT_SHOWN');
 assert.equal(await api.ads.requestAd(), 'AD_NOT_SHOWN');
});
