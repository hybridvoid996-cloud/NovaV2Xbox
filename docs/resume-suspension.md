# Retained player suspension

Nova retains the current game and at most two app frames. The session manager observes panel visibility and the current view; hidden retained frames suspend their supported runtime work. Browser visibility also suspends the frames. Split panes that remain visible continue running. Nova Music is separate and is not suspended.

The runtime installs before proxy document scripts and in native game entry pages. It holds timer callbacks with their remaining delays, cancels pending animation frames, pauses playing media and audio contexts, pauses document animations, and exposes a paused visibility state. On return it resumes the same document without replaying missed timer ticks. Its monotonic simulation clock excludes suspended time. It does not change saves or reload retained frames.

This is cooperative browser scheduling, not an operating-system process freeze. Cross-origin inaccessible embeds, dedicated worker computation, in-flight requests, and server-side multiplayer/cloud sessions cannot be frozen by this controller. Retained game memory stays allocated. Starting another game replaces the previous game; opening a third app evicts the oldest app. With Resume Game disabled, hidden sessions are unloaded.

Validation: session-runtime and session-manager tests cover remaining delay, interval backlog, frame loops, visibility, media, cancellation, clock continuity, frame reuse, app limits and releasing disabled sessions. Browser check: 2048 launches, becomes paused on Home, then returns to its same proxy URL and board.

## Laptop and media continuation — revision 113

Search, NovaTube and Nova Movies install the suspension runtime before their own startup code. Their proxied descendants join through the existing inject hook. Hidden system pages now enter the same pause controller as game/app players; Nova Movies is retained instead of removed on every navigation. Inactive Search tabs also suspend, including descendants attached after a tab becomes hidden. CSS animations added during suspension stay paused.

Library apps and these system pages share two retained app slots, alongside one game/cloud slot. The oldest hidden app is released when another slot is needed. Turning Resume off releases hidden sessions. Music and ongoing chat/call services remain independent. Retained documents still occupy memory; dedicated worker processing and inaccessible cross-origin contexts are not an OS-level freeze.

The Home continuation shelf uses real library artwork and account-specific recent history. Only documents still retained are labeled Resume; evicted/reloaded entries are Recently opened. Cards retain no iframe or video previews. Search's transparent start page now permits the shared wallpaper video to play on laptops; navigating to a covering website pauses it. Home decorations remain stopped while Search is active. Explicit Performance/Reduced Motion still select a static wallpaper.

Validation: 18 session/layout-policy regression tests and all 115 music tests pass. The pinned proxy build and required-file checks pass. In the browser, Search kept a typed address across Home/resume, NovaTube and 2048 became paused on Home, and the new cards correctly showed Resume app/game. The 1024x768 laptop layout was checked. No claim is made that every remote worker or actual laptop hardware has zero background cost.
