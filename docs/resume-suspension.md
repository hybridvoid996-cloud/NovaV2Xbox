# Retained player suspension

Nova retains the current game and at most two app frames. The session manager observes panel visibility and the current view; hidden retained frames suspend their supported runtime work. Browser visibility also suspends the frames. Split panes that remain visible continue running. Nova Music is separate and is not suspended.

The runtime installs before proxy document scripts and in native game entry pages. It holds timer callbacks with their remaining delays, cancels pending animation frames, pauses playing media and audio contexts, pauses document animations, and exposes a paused visibility state. On return it resumes the same document without replaying missed timer ticks. Its monotonic simulation clock excludes suspended time. It does not change saves or reload retained frames.

This is cooperative browser scheduling, not an operating-system process freeze. Cross-origin inaccessible embeds, dedicated worker computation, in-flight requests, and server-side multiplayer/cloud sessions cannot be frozen by this controller. Retained game memory stays allocated. Starting another game replaces the previous game; opening a third app evicts the oldest app. With Resume Game disabled, hidden sessions are unloaded.

Validation: session-runtime and session-manager tests cover remaining delay, interval backlog, frame loops, visibility, media, cancellation, clock continuity, frame reuse, app limits and releasing disabled sessions. Browser check: 2048 launches, becomes paused on Home, then returns to its same proxy URL and board.
