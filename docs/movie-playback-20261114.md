# Movie and anime playback fixes

Nova reads playback readiness and time updates through both Scramjet's window-message envelope and a per-launch, token-bound DOM bridge. The bridge handles proxy frames whose rewritten messages never reach the outer page. A smaller working video takes precedence over a large empty video element, and unrelated provider errors cannot replace a healthy visible player.

The Anime tab races its normal catalog with Ani.pm's public catalog, caches successful results, and falls back to the bundled anime listings after 2.8 seconds when the services hang. Ani.pm search, artwork, title information, and numbered episode metadata are supported. HiAnime watch links are offered only after its details page confirms the exact AniList ID. Site-local IDs are never substituted for AniList or TMDB IDs. The existing anime player remains first; the new players are fallback choices. Nova preserves the selected audio language using the providers' published player settings.

HiAnime requires an explicit Play click. Nova reveals that control and waits for the user, then restarts its bounded connection checks after Play. Security-block pages and confirmed removed-file pages trigger recovery rather than an endless loader. This does not bypass access restrictions or restore files removed by an upstream host.

## Verification

- Unit coverage includes provider identity, episode and language routing, artwork restrictions, blocked/removed pages, stale-session rejection, nested media, startup deadlines, and the catalog outage fallback.
- Browser regression checks run with `node tests/movie-playback-browser.cjs` and `node tests/movie-tv-anime-ui.cjs` (Playwright and Microsoft Edge required).
- Live checks returned Ani.pm catalog/search and One Piece episode metadata, and resolved the matching HiAnime watch page. The proxied HiAnime Play control was accessible without Nova's overlay.
- Full playback is **not** guaranteed for every title: the tested Ani.pm video host returned a security block, and the tested HiAnime host returned a removed-file message. Nova now detects those cases and moves on. Availability, network restrictions, autoplay permissions, and upstream changes still apply.

The broad `movie*.test.mjs` run also includes two existing home-presence fixture failures caused by separate, uncommitted changes to `Public/home.html` (`presenceBusy` missing from that fixture). The playback changes do not modify that file.
