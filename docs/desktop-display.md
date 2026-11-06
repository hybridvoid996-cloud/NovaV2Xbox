# Desktop display controls

Settings → Desktop provides workspace FOV (75–140%), adaptive layout widths, brightness, contrast, gamma, vibrance and hue. Values are saved on the current browser and update immediately. Reset desktop display restores neutral values.

Higher workspace FOV shows more interface at a smaller size. Resolution presets set the logical layout width and fit it to the current screen ratio. They do not change the monitor resolution, cloud-stream bitrate, game engine render resolution or game camera FOV.

Nova Home applies the display adjustment to its embedded app/game view. Standalone Music, Movies, NovaTube, Chat, Computer, Shop and Settings also load it. Embedded documents do not apply it again; the about:blank Nova host delegates to its actual Home document. Color filters are removed at neutral settings, and updates are scheduled once per animation frame. Custom colors may add graphics work, so neutral settings are preferable on slower devices.

Verified locally: preference validation and layout math tests; repository build and JavaScript syntax checks; isolated browser changed a 1280×720 screen to a 1920×1080 logical workspace while retaining a 1280-pixel displayed body width; gamma slider updated the live SVG transfer filter. No production deployment or real game/stream/fullscreen testing was performed. Games retain control of their own fullscreen rendering.
