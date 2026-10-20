# Shared game recovery

`player.js` enables `gameRecovery` for proxied games and attaches `attachGameHealth` to both proxy and native game frames. Apps, movies and cloud launchers keep their existing recovery policies.

| Failure | Shared response |
| --- | --- |
| Transient GET/HEAD network failure or HTTP 408/502/503/504 | Retry once on the existing transport |
| Startup script, JSON or HTML stops responding | Abort the read after 20 seconds and retry once |
| WASM served with the wrong MIME type | Set `application/wasm`, preserving response bytes |
| Engine startup exception or failed initial socket | Retry startup before user interaction, up to two reloads per game in two minutes |
| Lost WebGL context | Allow browser restoration and report success; offer retry if restoration fails |
| Socket lost after opening | Report disconnection; preserve the game’s own reconnect protocol |
| Browser returns online before interaction | Try startup again within the same retry budget |
| Visible loading screen reports a download failure | Retry startup within the existing budget |
| Recognized loading UI has no progress for 90 seconds | Retry before interaction; offer manual retry during an active session |
| Missing/corrupt asset, insufficient memory, emulator isolation requirement | Explain the problem rather than endlessly reload |

Large archives, ROM downloads and media do not get the short startup deadline. Loading UI progress values, percentages, stages and completed resources keep its watchdog alive. A canvas that looks still is not treated as a failed loader. Hidden loaders are ignored, and time spent in hidden tabs does not count toward the loading timeout. Canvas-only loaders without DOM progress indicators cannot be reliably identified by this generic detector. Writes are never replayed. The handler does not clear saves, invent server messages, replay socket packets, or reload a session after input in the game frame. Monitoring pauses while Nova’s tab is hidden and stops on leaving the player. Error text is shown locally; no telemetry service is added.

Specific compatibility adapters still apply. Zombs.io and Zombs Royale keep their specialized request policy (`gameRequestPolicy: 'specialized'`) while receiving the shared frame monitor; adding startup request wrappers changed their behavior in live comparison tests. A generic handler cannot create missing game files, add unsupported browser APIs or repair an offline upstream server. `game-health.mjs` contains the shared classification and request policy; `game-health-runtime.mjs` handles frame observation and bounded startup recovery.

Checks: `node --test tests/game-health.test.mjs` and `node tests/game-health-ui.cjs`. The UI test covers the actual native-game launcher as well as startup retry, active-session protection, socket semantics and graphics restoration.

## Engine and hosting regressions

- The pinned proxy event patch preserves native `(event, callback, capture)` identity. Without it, a legacy feature test in Royale installs an old-browser event shim that drops mouse and keyboard listeners. Check `tests/proxy-events.test.mjs` after upgrading Scramjet.
- Zombs.io's graphics preference is set before its app bundle executes. Its checkbox change handler reloads the page, so startup code must never fire that event to select compatible rendering.
- The match relay preserves binary packets when a hosted adapter omits the optional `ws` message flag. Its allowlist includes Royale's official gateway and regional probes; gameplay tickets and authentication remain provider-owned.
- Monkey Mart writes native progress to `monkeymart_config` in localStorage, not its otherwise working Defold IDBFS mount. That key is included in Nova's per-account backup and restore policy.
