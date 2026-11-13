# Remaining recent Noah games — November 12, 2026

Imported 11 additional missing entries from the recent catalog group: Spore, Find the Needle, POSTAL 2, ROAM0120.EXE, Team Fortress 2, The One Fish, Five Nights at Freddy's: Into The Pit, Sally Face, Feed & Grow: Fish, Leaf Blower Revolution, and Project Zomboid Tech Demo.

Roblox (1030), CS Surf (1027), and BO1 Zombies (1026) already exist, so their account/game IDs and launch settings were preserved. The Random tile is not a separate game.

The ten available HTML downloads and all eleven cover images are stored locally. Existing upstream asset bases were preserved; missing bases now resolve against the original source URL. Spore disables Download on the source site and remains a hosted URL through Nova's proxy. No login bypass was needed or performed.

Validation:
- Each new ID, cover, and downloaded launcher exists exactly once.
- Inline classic scripts in the ten downloaded launchers parse successfully.
- Explicit startup scripts for Spore, Find the Needle, POSTAL 2, and Team Fortress 2 returned HTTP 200. Spore's WASM and engine script also returned 200.
- Local Nova/Scramjet startup observations are recorded below. A loading screen does not certify a full playable session.

Limits: many of these ports download hundreds of MB or more. Find the Needle reports approximately 1.68 GB; FNAF Into the Pit approximately 645 MB; Sally Face approximately 246 MB. Spore requires a recent browser with WebGPU, WebAssembly JSPI, cross-origin isolation, and OPFS. Upstream game data, multiplayer services, complete gameplay, and account-save syncing remain outside these startup checks. Missing monolithic URLs can be expected when a launcher fetches split chunks instead.
