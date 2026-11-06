GTA on Browser (game 1045), local gameplay check

The original low=1 launch reached Sandbox → City Map, then stopped after movement with
`THREAD ERROR (main): Uncaught RuntimeError: null function`.

Changed its catalog launch URL to the provider's existing supported settings:
`?low=1&cores=1&fps=30&res=1280x720`.
The provider's public loader reads cores to size engine workers, fps to set its
engine frame limiter, and res to set the render buffer. No errors are suppressed,
engine binaries patched, caches deleted, or saves reset. Lower concurrency and
render load are a stability mitigation; the exact underlying engine fault has not
been isolated to a single setting.

Verification: a fresh Nova proxy launch entered Sandbox → City Map. The character
responded to W/A/D and space over repeated movement runs (over 30 seconds of held
movement plus idle inspection). The earlier fatal message did not return; the
browser reported no error log entries in this test. Screenshot:
`artifacts/gta-city-safe-gameplay.png`.

Limits: 720p and a 30 FPS cap intentionally trade visual quality/frame rate for
stability. Story mode, vehicles/combat, long sessions and school laptops have not
been verified. This is not proof that every engine crash is fixed. Local only;
not deployed.
