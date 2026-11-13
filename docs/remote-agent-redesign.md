# Nova Remote 0.4.0

The Windows agent now uses a custom glass-style title bar and a compact sidebar with Connections, Stream settings, Appearance and Activity views. Scrolling remains available without visible scrollbar tracks. The sidebar account stays visible at compact laptop sizes. A startup animation respects the system reduced-motion preference and has a fallback so it cannot cover the controls indefinitely.

The paired account's `novaAccounts/{uid}/preferences` background is included in the authorized remote profile. Only the display name, photo and validated background fields are returned; private account data is never copied into the app. Images, videos and gradients are supported. Browser-only uploads and blob URLs cannot transfer into the desktop app. Account media failures fall back to the default Nova glass background. Videos pause when screen sharing, when the window is hidden, or when lighter effects/reduced motion is enabled.

Appearance settings are local to the Windows installation. Capture approval, owner/admin access checks, encryption, emergency stop and close-to-disable behavior remain in the existing remote access implementation. The new title-bar buttons call a small, trusted-frame-only IPC handler with fixed minimize/maximize/close actions.

Verified with automated remote session, capture, input, updater, backend routing, profile filtering and window-control checks; visual browser fixtures at 1060×800 and 800×560, including sign-in, sidebar navigation, hidden scrollbars, saved lighter-effects preferences and reduced motion. Fixtures do not represent a live streaming PC. A live Windows host / Metered session still requires an actual paired and enabled host.

Install the new 0.4.0 build to receive this UI. Existing paired-account credentials remain encrypted in the same app data location. The account background will appear after the accompanying backend update is deployed.
