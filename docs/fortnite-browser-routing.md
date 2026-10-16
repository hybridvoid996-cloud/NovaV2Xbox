# Fortnite 1.8 browser routing

The deployed /game-runtime/fortnite18/fortnite/ path returned a Vercel 404 while /api/fortnite?path=fortnite/ returned the real game. Game 881 now starts at the static /content/fortnite-browser/fortnite/index.html page and uses the existing API directly. This removes the dependency on a custom rewrite.

The scoped compatibility worker imports the original game worker, retains its file cache, and maps only the fixed game namespaces to Nova's fixed-host relay. Nova's bootstrap lives outside that namespace. POST bodies are buffered to avoid Chromium's HTTP/2 requirement for streamed request uploads. Authentication headers and Range requests remain unchanged. No Nova account credentials or cookies are forwarded to the game host.

Verified locally through Fortnite's rendered main menu. Deploy the updated Public files to fix the launch address on the live site.

2026-10-16 canvas fix: reproduced the exact '#fnweb-canvas is not a canvas' failure through Home → Library → Fortnite. The launcher used document.open/write, producing a native canvas whose constructor/prototype did not match the runtime module's HTMLCanvasElement inside the nested frame (the native width getter still accepted it). fortnite-document.mjs now preserves the current document with innerHTML and activates the original classic/module scripts in order. It verifies a real native canvas before starting. No instanceof override, integrity-check bypass, or modified upstream runtime is used. Temporary diagnostic modules were removed. Verified the Fortnite menu through Nova's actual nested Home/player/native frame stack. Fifteen Fortnite tests and eight suspension tests pass. Reload Home to replace an already retained failed session.
