# Nova Roblox launcher — 2026-11-13

## Added
- `roblox.html`: compact Nova toolbar, Discover/Back/Reload/provider sign-in, fullscreen and proxy loading/error states.
- Home top-bar Roblox mark and launch action, registered with Nova's retained-app/runtime menus.
- Separate `app-tglsc-roblox` library entry. The existing `app-40` Roblox/nowgg entry is preserved.
- Scoped `robloxLauncher` transport response adapter. It keeps original authentication responses intact, styles the authorized launcher HTML and routes launcher pop-ups into the same Scramjet game frame. Supports immediate `window.open(url)`, blank-window followed by location assignment, and `_blank` links. Invalid schemes, embedded URL credentials and known advertising destinations are rejected by the host.
- Random per-launch bridge token plus exact frame-source checking. No browser cookies or session tokens were exported from the user's signed-in browser or put into source code.

## Verified
- Inspected the user's signed-in TGLSC site: live home game rows and a game detail screen load. Clicking Play leads to its Roblox Session screen. It says Roblox email sign-in is temporarily disabled and requests a separate session value. No session value was entered or copied.
- Local real Scramjet run: unauthenticated launcher response correctly opens TGLSC provider sign-in inside Nova; no browser JavaScript errors. Screenshot: `artifacts/roblox-proxy-preview.png` (local artifact, not shipped).
- Local Home preview: Roblox icon exists and clicking opens `roblox.html` in the main panel.
- Browser fixture checks: immediate and delayed popup destinations replace the inner game frame without opening a browser popup; toolbar has no horizontal overflow at 390px.
- `node --test tests/roblox-launcher.test.mjs`: 3 passed. JavaScript syntax and whitespace checks passed.

## Not verified / limits
- Actual Roblox gameplay and real provider game pop-up destinations could not be tested beyond its separate Roblox-session requirement. The provider's disabled email sign-in is not a Nova code error and was not bypassed.
- A TGLSC session on `321.tb2.net` does not automatically transfer to Nova's proxied browser storage. Users must sign into the provider in Nova's launcher separately. Nova account credentials are not TGLSC/Roblox credentials.
- Popup routing is implemented for the launcher HTML. Downstream services can impose account, session, capacity, frame or network restrictions. Popups relying on a real window/opener message exchange, rather than a destination URL, may require an additional adapter once an actual playable session can be tested.
