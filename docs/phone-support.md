# Nova phone support

Added shared phone layouts to home, settings, library, search, shop, music, chat, NovaTube, and player pages. Chat navigation collapses behind a menu on screens up to 600px. Existing music and NovaTube responsive layouts remain in use.

The player offers optional arrow/WASD, jump, action, enter and escape touch controls. Multiple pointers are supported. Held keys release when controls close, movement mode changes, the page hides, focus is lost, or the player frame changes. Native game touch controls remain usable.

Limitations: games requiring trusted keyboard input, inaccessible cross-origin frames, pointer lock, powerful desktop graphics, or unsupported mobile browser features may not work with these controls. This does not make every desktop game phone compatible. Cloud streaming latency and touch support depend on the provider. The controls are intended for accessible keyboard-based game frames.

Verification: mobile JavaScript syntax checks and scripts/check-systems.mjs pass. No physical phone or authenticated gameplay testing has been completed; visual checks on iOS Safari and Android Chrome remain required. Test portrait/landscape, keyboard opening in search/chat, multi-touch movement and jump, and navigating away while holding a direction before rollout.

## Phone refinement — November 3
The actual home and local offline home now initialize the Nova phone shell at phone sizes. Home uses the saved wallpaper with a bundled image fallback, glass app icons, clock and six-button dock. The Resume shelf is hidden. Music uses full-width content, a bottom navigation strip and a compact player; the album rail no longer overlaps at phone widths.

Touch input now targets the largest accessible game canvas, supports a multi-touch joystick and held-key repeats, and retains each key's original frame for release. A browser input fixture verified Jump keydown/keyup and joystick movement/release. A focus-order bug that lost the keyup tracking was fixed. These checks verify event delivery, not every third-party engine.

Browser checks: actual local offline home at 390×844, phone game library navigation, phone music layout and input fixture. Music playback end-to-end remains unverified because the backend reports Vercel restrictions. Physical iOS/Android testing remains outstanding.

## Swipe close — November 3
Phone game/app player headers use a compact glass strip and a left-swipe handle instead of an X. Opening a player shows a brief swipe hint. A horizontal left swipe of at least 75 CSS pixels closes through the existing game-stop path; short or mostly vertical gestures cancel. The header captures the gesture so gameplay drags are unaffected. Keyboard Enter/Space on the handle remains available for accessibility. Phone settings uses the same gesture header. Desktop close buttons are unchanged.

Verified in the browser on a running Moto X3M Winter frame: full left swipe returns to library, a short swipe leaves the player open, and the X is hidden. Landscape UI checked at 844×390. Physical device testing remains outstanding.

## Full-screen gesture revision
Removed the phone player title/close strip. A deliberate left swipe across accessible player content closes the phone app. Detection requires at least 110px or 28% of viewport width, limited vertical movement, and completion within one second. Touch controls, editable fields, links, buttons and the music seek/player controls are excluded. Nested same-origin game documents are observed; an invisible right-edge gesture area covers inaccessible frames. Such frames require starting at the right edge. A brief notification explains the gesture.

Verified with a proxied Moto X3M Winter game: swipe in the game canvas closes it, joystick drag leaves it open, and no title bar is visible. Controls now use SVG icons, transparent glass buttons, and a thumb-base-scaled joystick dead zone. Physical touch-device testing still outstanding.
