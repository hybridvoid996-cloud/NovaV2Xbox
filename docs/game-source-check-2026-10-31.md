# New-game follow-up — October 31

This pass is incomplete. Do not mark all new games Working. No production deployment or owner Game Status updates were made.

## Verified observations

| Entry | Actual result |
| --- | --- |
| Fortnite On Browser 1.8 (881) | Nova's existing local relay loaded the engine and rendered the Fortnite main menu. No successful match/gameplay verification. |
| Wii (1047) | Scramjet launch exits code 1: cannot read main.dol. The published file exists at game/sys/main.dol, while the engine requests game/part/sys/main.dol and game/main.dol. A scoped worker-path repair was added, but did not resolve the browser failure. |
| Wii local relay diagnostic | A read-only pinned relay fixes both path aliases and passes real HEAD/range checks. Engine passes the missing-DOL exit, creates browser NAND and audio, then remains black with zero rendered frames. Not connected to the catalog or Vercel. |
| GTA on Browser (1045) | Nova reproduces THREAD REJECTION (main): RuntimeError: unreachable at Mounting archives, 24%. Direct source comparison stalled at 6%, after downloading 539 MB, and displayed an advertising iframe. Cause of the crash is not established; not fixed. |
| Minecraft Multi-Version (1044) | Selector renders. Clicking WASM 1.8.8 returned Not found, although the original HTML is available (HTTP 200). Added scoped registered-frame navigation. Retest remained unsuccessful. |

The proxy worker keeps controller registrations in memory, while its previous revival broadcast omitted uncontrolled Nova player/search pages outside its scope. Added revival to those pages and a bounded registration wait for known proxy URLs. This has an automated worker-restart test; it has not restored Minecraft successfully in the browser test. Read failures become a retryable 503 rather than falling through to Nova's static 404. Writes are never retried.

The Wii relay forwards public GET/HEAD reads and range headers only. No account cookies, authorization, source logging uploads or NAND backups are forwarded. Existing local disc-file paths are not changed by the worker patch. Vercel streaming limits and real save integration remain unverified; it is a local diagnostic, not a supported game route.

## Remaining work

Other entries in the current seven-day New list have not received a fresh gameplay test in this pass: Getting Over It (557), BO1 Zombies (1026), Horsey (1036), DEEEER (1037), Castle Crashers (1038), Minecraft Legacy (1039), Cyberpunk (1040), Terraria (1041), Vice City (1042), CSGO Clicker (1043), Skate (1046). Prior checks are in the October 30 report and do not establish full compatibility.

Validation: 21 targeted tests pass for Fortnite's existing relay/document mounting, scoped Wii/Terraria repairs, pinned Wii relay/range/privacy behavior, Minecraft navigation allowlisting, and worker recovery. Build passes. One Fortnite New-badge test was made time-independent; the catalog's original added date was preserved.
