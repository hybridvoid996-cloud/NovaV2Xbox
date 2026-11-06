# Skate 3 source compatibility — November 1

Local changes only; no deployment or Working status update.

The reported error requested `http://127.0.0.1:8795/manifest.json` instead of the source's file manifest. The inspected `/host.js?v=335e6b4e7f6b` chooses `saved || location.origin`; its origin reference escaped virtual origin handling. A compatibility repair limited to catalog game 1046 and `https://skate.aaddpp.lol/host.js` pins the default server to the source origin. Explicit user-selected servers remain unchanged.

The source manifest and config respond HTTP 200. The config names its game-data pack on gamedata.xposed.wtf. No game data is bundled into Nova by this change.

First browser test passed the reported error and downloaded 45 MB, then stalled with CacheStorage synthetic-key rewriting errors. The same scoped repair selects the loader's existing IndexedDB download-cache fallback. This preserves existing CacheStorage data and does not delete game settings or saves. The next browser test passed the download stage and displayed the game canvas; the tab closed before a rendered world or controls could be verified. Partial-file transport errors also occurred. Full gameplay is still unverified.

Fresh verification after the cache repair reached Press Start, difficulty selection, the Freeskate menu, and a rendered University free-skate world. Space and W inputs moved the skater and board across the ramp. Screenshot: `artifacts/game-audit/skate-playable.png`. This verifies startup and basic movement locally, not every map, multiplayer, persistent saves, or long-session performance.

The repair fails explicitly if the inspected origin-selection marker changes. Two focused tests check default routing, explicit server overrides, cache selection, header cleanup, scoping, and source-change detection. All seventeen related tests passed after the cache adjustment. `npm run build` passes.
