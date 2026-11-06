# Getting Over It local verification — November 1, 2026

Catalog game 557, tested through Nova's Scramjet player on port 8795. No deployment was performed.

The source's large loading text was clipped by its desktop positioning. A game-specific repair centers a compact loading panel, reports download and engine preparation separately, and makes the Unity container responsive. Nova's Unity viewport helper now honors an explicit responsive-container opt-in instead of locking this game to its first canvas size. Other Unity games retain their existing behavior.

The source downloads approximately 660 MiB. Part assembly preserves order, limits concurrency per merge, avoids the extra Uint8Array copy, and assigns the WASM Blob its correct MIME type. First launch still depends on downloading these large upstream assets. Failed file downloads produce a readable error. A blocked external-link popup is caught so it cannot terminate the Unity callback.

Verified in the in-app browser: download completion, main menu, starting New Game, and hammer input moving the player and camera. Verified the responsive canvas at 1366×768; normal-window gameplay at 1284×900 also worked. The game can preserve its own aspect-ratio bars. No long-session performance or account-save synchronization claim is made by this check.

Proof: artifacts/game-audit/getting-over-it-playable.png.

Validation: npm run build passed; 20 related Node tests passed, including four Getting Over It tests covering bounded part assembly, scope/layout, native Blob merging, and rejected external links.
