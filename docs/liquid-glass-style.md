# Nova glass liquid effect

Style reference: ShuttleTV navigation at https://shuttletv.pk/ and the user's supplied navigation screenshot (November 3, 2026).

In this project, “glass liquid effect” means a clear, lightly darkened surface with background refraction at rounded edges, a fine white inner highlight, soft outer shadows, and restrained smooth opening/closing motion. It does not mean an opaque blue panel or heavy frosted blur.

The first trial is scoped to the bottom-right End Task dock and its upward flyout. Public/src/liquid-glass.mjs supplies a size-aware SVG displacement lens; main-home.css supplies the tint, highlights, controls and blur fallback. The filter affects the backdrop, not text or icons. It updates only when the surface changes size; there is no animation polling loop. Browser support varies; the fallback retains the rounded transparent styling with blur.

Verified the empty and populated flyout visually in the local offline home preview. Existing six task lifecycle tests and the build pass. Not deployed. Other Nova surfaces have not been restyled by this trial.
