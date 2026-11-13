# Noah imports — November 12, 2026

Added the four newest downloadable entries at the top of Noah's public catalog: Minecraft Rust Edition (1048), R.E.P.O. (1049), Backyard Baseball '97 (1050), Turbo Dismount (1051). Downloaded the same public HTML files used by Noah's Download button and stored their covers locally. The first three entries launch through Nova's existing Scramjet content route. Turbo Dismount uses Nova's existing local native-frame path for compatibility. Relative asset bases are preserved. Existing games and saves were not replaced.

Requirements and limits:
- Minecraft Rust Edition needs WebGPU. Its HTML contains the compressed engine; sound files still download from its upstream CDN.
- R.E.P.O. uses an upstream split-file manifest with approximately 744 MB of game data. First download and memory usage can be substantial. Multiplayer service availability has not been verified.
- Backyard Baseball uses its upstream ScummVM runtime and game files.
- Turbo Dismount uses an older Unity runtime whose factory source is incompatible with this Scramjet build. It uses the same local native-frame mechanism as other audited Unity games instead of rewriting the engine through Scramjet. Its CDN files must be reachable directly. No proxy repair is claimed.
- Launch HTML and artwork are local, but these are not completely offline game packages. Upstream runtime/data availability remains required.

Validation: all four covers and launch files downloaded successfully; inline classic scripts parsed successfully; Baseball runtime, Turbo runtime/build config, and REPO manifest returned HTTP 200. Local Nova proxy browser launches checked. Full playthroughs, multiplayer, and account-save syncing for these newly imported engines have not been verified.

Observed browser results: Minecraft displayed its sound-download screen; R.E.P.O. displayed its game-file loader; Backyard Baseball reached its rendered startup logo; Turbo Dismount reached the Unity splash with an active frame counter and no page exception through the native-frame path. These startup checks are not full gameplay certification.

Minecraft Rust module repair: replaced the embedded data-URL module graph with five local .mjs files, retaining Nova’s proxied virtual content origin. The engine and four helpers now have explicit URLs and correct module content types. No game resources or save keys were changed.
Browser verification after the module repair: local Nova/Scramjet reached Minecraft Rust Edition’s rendered welcome/accessibility screen. No dynamic-import error or page exception occurred. The runtime reported unavailable narrator support; full world gameplay was not tested.
