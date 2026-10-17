# Native Nova Music

Nova renders its own Spotify-style interface with SoundCloud search, artist and release pages, private Nova playlists, likes, queue, listening parties, and one state shared with Nova Menu. Existing music backend authorization and ownership rules remain authoritative.

## Playback

Public formats supported by HTML audio/HLS use the same-origin `/api/soundcloud` relay. The fixed HTTPS provider-CDN allowlist applies to audio, artwork, HLS manifests, segments, and standard keys/init references. Metadata is bounded/cached, uses anonymous public provider data, and does not send Nova identity or cookies to SoundCloud. This integration depends on SoundCloud's current anonymous interfaces and can be affected by provider changes, rate limits, and geography.

An unsupported or encrypted format is not evidence that Go+ is required. These songs remain selectable and saveable. The server returns a fixed official widget URL rather than attempting to decrypt protected streams. `nova-music-guest.mjs` uses the documented SoundCloud Widget API in a credentialless iframe with autoplay/encrypted-media permissions. Nova bridges play, pause, seek, duration, position, volume, ended events, and party state. The provider decides guest access and preview duration. A visible player opens when a direct interaction is needed; retries/timeouts are bounded.

The guest fallback now loads its official Widget SDK, player, artwork, API requests and media through Nova's existing same-origin Scramjet/Wisp connection. School filtering of Nova itself or its WebSocket transport and browser media restrictions can still prevent playback. No protection, authentication, signup gate, subscription entitlement, or browser security restriction is bypassed. Ads/embedded sponsorship cannot be universally guaranteed absent. The test browser loads Addicted and reports its duration, but does not sustain its protected-format playback; do not claim full playback of that song was verified.

## Play/Pause interruption fix

Playback intent is tracked separately from the media element's paused state. Pausing a pending play or replacing its source cancels stale completions. Duplicate Play requests share the pending operation. A current transient AbortError retries once; canceled/stale requests do not overwrite the new song or surface raw browser exceptions. Autoplay denial waits for a click. Metadata listeners are removed when a source changes. Party sync reads the selected transport snapshot, including guest playback, instead of the inactive native audio element.

## Validation and deployment

93 music tests pass, covering private backend/party behavior, catalog identity, guest routing, rapid pause during pending play, stale play rejection, bounded interruption recovery, autoplay denial, and transport state. Real proxied native audio was verified in Nova at readyState 4 with advancing position. Existing HLS.js 1.6.13 remains locally pinned, with its Apache-2.0 license retained. Required-file checks include the guest module. No real invitations, party messages, or playlist mutations were sent during this revision's UI checks.

Deploy Public (including all music modules), api/soundcloud.js, server/soundcloud-service.mjs and the existing API handlers together. The current frontend cache stamp is 20261016-sc112. Local changes do not update an already-deployed site. SoundCloud Widget API reference: https://developers.soundcloud.com/docs/api/html5-widget

## Lyrics, playlists and search — revision 111

Search now uses a debounced, cancellable combobox dropdown with provider query completions, artist/release artwork, local recent searches, Up/Down/Enter/Escape navigation, clear and browse controls. Short partial queries use SoundCloud's completion to select relevant artist/release suggestions.

Playlists have eager-loaded collage covers, descriptions, accurate song counts/total time, track tables with available album/date metadata, search/sort, song options for reordering/removing, and a separate Add songs sidebar with server-confirmed Added states. Existing private collections stay private. IDs omitted in legacy playlist values are recovered from collection keys. Library reads and writes share one serial queue, preventing delayed refreshes from overwriting newer edits. Duplicate song additions preserve their original order/date. Batch create/import and batch additions are atomic, bounded to 200 songs and the existing request limits. Creation returns the new playlist ID. Deploy api/music.js with server/music-library.mjs alongside frontend changes.

Lyrics are fetched through the same-origin /api/soundcloud?op=lyrics endpoint using LRCLIB, cached, and matched on cleaned title, artist and recording length. Unrelated lyrics are rejected. The client supports timed line highlighting, click-to-seek through the selected transport/party permissions, follow toggle, plain lyrics, instrumentals, not-found and retry states. It does not promise lyrics for every SoundCloud upload. Source attribution remains visible. Reference: https://lrclib.net/docs.

Validation: 107 music tests pass, including real API ownership checks, atomic imports and invalid batch rollback, stale library read serialization, idempotent playlist ordering, lyric matching and synced line lookup. Build and required-file checks pass. Isolated UI checks exercised creation, song search/add, description editing, reordering/removing, and matching timed lyric display with click-to-seek. The test library and playback transport were isolated from real user accounts; no real library writes or party messages were made. Real lyrics and SoundCloud metadata endpoints returned successful results.

Responsive check: the 1024×768 layout has equal client/scroll widths (no horizontal overflow), with the temporary viewport override reset afterward. Existing game-session runtime/manager regression tests also pass (8 tests). Lyrics may be unavailable for unmatched uploads; these show an explicit not-found state instead of unrelated text.

Track metadata prefers SoundCloud publisher artist attribution when supplied, so lyric matching uses a recording artist rather than a label/upload handle. Uploader names remain the fallback when publisher attribution is absent.

## School connection fix — revision 112

The fallback previously embedded w.soundcloud.com directly, so native audio could work while fallback songs failed on filtered networks. It now uses a lazy, shared music proxy controller with eight transport connections and a trusted proxied shell. Only approved music commands/state cross the shell facade. Provider/track URLs are strictly checked. The official SDK stays inside the proxy; a scoped compatibility transform supplies empty transfer lists on its two cross-frame postMessage calls so Scramjet preserves the caller's origin/window. Other sites, audio data, authorization and non-200 responses are unchanged.

Real ODESZA Widget playback advanced past 40 seconds with CSP disallowing direct third-party scripts, frames, connections and media. All observed player/API/audio requests used Nova's proxy and returned 200. Play, pause, seek to 30 seconds and resume were exercised; a trailing progress event no longer changes a paused player to playing. This reproduces a browser-side block, not the actual school's firewall. The school device and protected-format playback remain unverified. Deploy the complete Public directory, including connection.js and all new widget/connection modules, alongside the existing Wisp endpoint; reload Nova after deployment.

Validation: 115 music tests and nine connection/session regression tests pass. Required-file checks and the pinned connection build pass. Temporary browser test fixtures are removed before delivery.

## Faster selection and queue transitions — revision 115

The engine prepares one upcoming stream response in advance, deduplicates concurrent preparation, and consumes it on selection instead of resolving that song again. Entries expire after 45 seconds; the next entry is refreshed during the last 25 seconds of playback. Hover/focus can prepare a selected row while music is stopped. Preparing public HLS also warms the local HLS module; preparing a fallback warms Nova's proxy connection. No second hidden player, whole-playlist download, protected-audio extraction, or unbounded cache is added.

Consecutive SoundCloud fallback songs reuse the same trusted shell/iframe and official Widget object using the provider's load(url, options) method. Bindings and state reset per song; old generation listeners are aborted. Finish is deduplicated, and seeking back resets finish state for Repeat Song. Failed players are released so Retry creates a clean player. Repeat Song explicitly requests Play rather than depending on a toggle. Suggested tracks in the playlist-adder preserve the result queue instead of reducing it to a single song.

Real proxied Widget playback advanced automatically from ODESZA 55149736 to Yeat 1061010121 in the actual Nova playlist interface, with one retained player frame and advancing position on the second song. The isolated library performed no real account/playlist writes. A separate timing check observed approximately 3078 ms to the first Play event and 1924 ms for the following song; these are local observations, not guaranteed school-network or zero-latency measurements. Initial provider/media requests still depend on the network, so instantaneous first playback cannot be promised.

Validation: 118 music tests and 13 session/performance regression tests pass. Tests cover preparation deduplication/consumption, failed preparation fallback, guest reuse and listener cleanup, reload in the same frame, duplicate Finish, and existing pause/interruption behavior. Required-file checks and syntax checks pass. Frontend revision is 20261016-sc115; deploy the complete Public directory and refresh Nova. SoundCloud's supported load behavior is documented at https://developers.soundcloud.com/docs/api/html5-widget.

## Automatic alternate audio — revision 117

Voidify at https://oda-loves-vng.renaca.com/~a/ exposes public search metadata and numeric-ID audio stream endpoints. Nova now queries that fixed host through its backend when SoundCloud playback fails. Title, artist and bounded recording-duration differences must match; alternate remixes, covers, different artists and unsafe IDs are rejected. Production-credit brackets and official audio/video labels are normalized without removing remix/live/version labels. Existing SoundCloud track IDs, playlists, artwork and party queues stay intact. The Music source badge says Voidify fallback while alternative audio is selected.

Explicit stream/player/media failures trigger one lookup per generation. An eight-second no-progress watchdog also recovers stalled starts and buffering. A successful primary source wins over a late alternate lookup; late primary errors cannot overwrite a playing alternative. Changing songs cancels stale completions. Pausing during lookup stays paused. Browser autoplay denial remains a user-gesture prompt. The fallback never extracts protected audio, handles authentication, or decrypts provider media.

The new same-origin /api/soundcloud?op=fallback lookup accepts bounded title/artist/duration fields. /api/soundcloud?op=alternate-audio&id=NUMERIC relays audio only from the fixed site's /~a/stream/ path, validates audio content types, supports byte ranges/HEAD, and does not accept arbitrary target URLs or redirects. Lookups are deduplicated with a bounded cache; successful matches cache for two minutes and missing matches for 30 seconds. Search lookup times out after five seconds. Only public track metadata is sent to the alternate site.

Verification: a simulated SoundCloud failure played the matched ODESZA recording through Nova at readyState 4 with advancing position. A separate deliberately stalled SoundCloud request recovered at first progress in about 9239 ms, including the eight-second watchdog; this is a local measurement, not a school-network guarantee. The external source remains a third-party dependency and does not cover every SoundCloud upload. No real accounts, playlists or party messages were changed. 127 music tests pass, including strict matching, fixed-host/range relay, invalid upstream types, stale requests, paused intent and watchdog recovery. Existing session/performance tests also pass.

Deploy server/music-alternative.mjs, server/soundcloud-service.mjs and api/soundcloud.js together with the complete Public directory at revision 20261017-fallback117. Refresh Nova after deployment. Temporary verification pages are removed before delivery.

## Voidify-only preview — revision 118

Open /music-void-preview.html to test Voidify search, artwork, native audio, seeking and queue playback in Nova's music interface. The adapter sends no SoundCloud catalog/widget/playback requests: search and cover requests use fixed-host Voidify backend routes, and audio uses the existing same-origin alternate relay. Preview track keys only bridge the shared UI locally and never enter account data. Its library is in memory; account writes, real playlists and parties are not available. The normal Nova Music source selection is unchanged.

The reusable Music UI accepts a catalogName label (default SoundCloud) so this page identifies its search/source as Voidify. Cover relaying accepts a bounded token, fixed /~a/img path and raster image responses only. Search validates and bounds public metadata. Browser verification played ODESZA through alternate-audio with readyState 4 and advancing position and loaded real cover artwork. Voidify search returned its own Yeat catalog. 128 music tests pass.
