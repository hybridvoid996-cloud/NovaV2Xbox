# Opium cloud integration — 2026-11-13

- Opium appears as Server 7 in Nova's shared cloud picker. Its public catalog has 207 distinct game keys; all match existing Nova games, including the `Witchers 3` / `The Witcher 3` spelling variant. Existing Nova IDs, covers and other provider choices are preserved.
- `opium-cloud.html` is a same-origin native stream player. It intentionally stays outside `/content/`, which Amplify sends to external asset storage. It does not load Opium's whole nested proxy or protected menu.
- The player uses the public Stratus service at `cdn.vipersfutbol.com/stratus`: availability, session creation, queue, startup, WebSocket signaling, WebRTC audio/video and the upstream keyboard/mouse data-channel format. Connect is explicit; microphone access is not requested.
- Cancel/end/page exit releases the upstream session. Keyboard state is released on focus loss. Failed startup and service limits show retry guidance without automatic session-creation loops. Original provider capacity, duration limits and account/game requirements still apply.
- Pool downtime is reflected by Nova's availability checker rather than treating every HTTP 200 as available.

## Verification

- `node --test tests/opium-cloud.test.mjs`: 7 passed (catalog identity, repeat merging, spelling variants, invalid input, binary controls, native picker entry and service health).
- Local browser test through `player.html?kind=cloud&id=gsn-bs0095`: selected Opium, connected to Red Dead Redemption, received 1280x720 video (821 decoded frames in the sampled run), open input channel and 5 transmitted input packets; no browser JavaScript errors. Visible upstream game startup reached its shader-compilation screen. This is a verified stream/startup test, not a completed gameplay test.
- Both live test sessions were explicitly ended; quit requests returned HTTP 200.
- Browser failure checks: queued session cancellation released exactly one session and did not relaunch; HTTP 429 displayed its service message and retry control without retry loops.
- All catalog card covers exist locally. Syntax and whitespace checks passed.
- Existing `cloud-gaming.test.mjs` / `cloud-providers.test.mjs` contain stale GSN assumptions and old Astra DOM mocks. The broader legacy suite is not passing; those unrelated fixtures were not rewritten as part of this integration.

## Limits

Desktop keyboard/mouse and WebRTC streaming are implemented. The upstream WebCodecs relay-only mode and native controller packets are not implemented. A network blocking WebRTC can still prevent connection; another Nova provider must be selected. Every catalog title has not been play-tested. Availability can change, and deployment to the hosted site must finish before the option is live there.
