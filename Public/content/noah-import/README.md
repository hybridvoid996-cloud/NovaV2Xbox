# Noah catalog import

Imported 114 new games from the 448-entry public catalog on 2026-10-17. Skipped 333 existing/duplicate entries, including alternate names. Fruit Merge was omitted because its source points to /h and returns HTTP 404.

Each game uses locally stored downloaded HTML and its original cover. Existing base URLs were preserved; missing base URLs resolve against the original download URL. Game dependencies remain upstream and are loaded through Nova’s existing proxy, so this is not an offline game archive. Original source attribution is retained.

manifest.json records source URLs and file hashes. No imported IDs are in the native-launch allowlist. Tests verify all files, catalog entries, new stamps and proxy routing. Chrome Dino was verified in the browser; every game has not been play-tested.

Mindustry includes a large (~118 MB) inline game payload from the source download. Hosting services with per-file size limits may require a separate asset hosting arrangement for that file.

2026-10-17 repair audit: checked startup for all 119 current New entries, repaired 32 imported wrappers, prepared eight local emulator cores, added local Portal data and split-pack recovery, and routed session-dependent cloud games through Nova’s existing provider selector. Wrassling uses its publisher page. See docs/game-audit/new-games-repair.md for coverage and limits.
