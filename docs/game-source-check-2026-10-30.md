# Replacement game source checks
All seven requested pages returned HTTP 200. Catalog entries use the shared Scramjet launcher (no native bypass matches these replacement URLs). Four supplied images installed; all seven entries stamped New.

- 557 Getting Over It: proxied download reached 170 MB of 660 MB. Full gameplay not verified.
- 1044 Minecraft Multi-Version: version selector rendered through proxy; engines not play-tested.
- 1026 BO1 Zombies: game setup, modes, guns and graphics menu rendered; multiplayer not verified.
- 1046 Skate 3 (Real): source explicitly identifies itself as a fan engine requiring user-owned game files. Intro rendered; assets not provided/tested.
- 1041 Terraria: fixed source eval(import('../_framework/dotnet.js')) resolution by replacing with a module-relative import, scoped to this exact export. Retest reached content installation (part 6/36). Full gameplay not verified.
- 1047 Mario Wii: WebGL2 and shaders initialize, but game exits code 1 because game/part/sys/main.dol and game/main.dol both return 404. Cannot fix missing upstream game assets through a proxy change.
- 1045 GTA on Browser: reaches archive mounting then threaded engine RuntimeError: unreachable. Low-memory mode retested; crash persists. Full gameplay NOT working in this proxy test. Do not mark Working. No security-origin guard was disabled.

Ad-policy now blocks the two advertising script hosts observed in Fiveplay HTML (quge5.com, alwingulla.com). Existing popup suppression remains active when Nova ad blocking is enabled. This is not a guarantee that every future ad is blocked. Three targeted policy/compatibility tests and the build passed. No deployment performed.
