# Minecraft and Fortnite follow-up — November 1

Local changes only. Nothing deployed and no owner Game Status entries changed.

## Browser observations

- Minecraft multi-version: 1.8.8 Standard and WASM-GC, and 1.12.2 Standard reached rendered singleplayer worlds. Movement and inventory were tested on those three builds. 1.12.2 WASM-GC reopened the saved Standard world and rendered it; its controls have not received a separate test.
- The latest shared controller change has not been replayed against all four builds. These observations do not establish universal Minecraft compatibility or cross-domain save syncing.
- Minecraft 26.2 still fails its integrated server liveness probe. Its mesh worker now boots. It must not be marked Working.
- Older entries 181/182 have a pinned offline-build replacement that retains their virtual storage origin. End-to-end verification remains pending. Several other old version entries contain only placeholder pages, not game engines.
- After the user signed in, Retrora reached a rendered Fortnite match through Nova's proxy, with the live compass, storm countdown, health and inventory. The match continued to storm elimination. Agent movement, combat, multiplayer reliability and sustained FPS were not measured. Some same-origin-fetch guard errors remain in its console, so this is not a claim of error-free operation.
- The alternate launcher is labelled 2.0 as requested, but the inspected Retrora source currently hosts Fortnite build 1.8.1. The selector discloses that distinction.

## Repairs and validation

Frame-owned Blob URL reads remain in their creating frame. The controller materializes response bytes before returning them across its message channel, avoiding a non-transferable ReadableStream error. Other URLs retain the normal proxy route. Exact dependency markers fail the build if the installed proxy changes.

Minecraft launch destinations are allowlisted; signed launch hints receive server configuration safely. Minecraft 26.2 uses separate world/resource-pack database names so incompatible old worlds are not loaded. Old databases are preserved.

Twelve targeted automated tests passed on November 1: Blob handling, controller response bytes, Minecraft launch allowlisting and old-entry replacement, scoped compatibility repairs, and Fortnite edition selection. Browser gameplay verification remains the authority for Working status.
