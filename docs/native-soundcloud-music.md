# Native Nova Music



The Home music integration now loads a native Nova interface instead of the old Netlify music application. It uses a single HTML audio element, a pinned local HLS.js build, and the same player state for the app and Nova Menu. music.html is the standalone/pop-out entry. The visual shell has a searchable SoundCloud catalogue, library, real artwork, Nova account identity, now-playing queue, liked songs, playlist creation/rename/pin/delete, shuffle/repeat, seeking, volume and media-session controls.



SoundCloud search and stream resolution use anonymous public web data through /api/soundcloud. The service reads only the public apiClient hydration entry, caches it for 20 minutes, refreshes once after authorization expiry, and never sends Nova identity or cookies to SoundCloud. Search results and metadata are bounded/cached. This public web integration depends on SoundCloud's current anonymous interfaces; provider changes, rate limits, region restrictions, or unavailable tracks can still require a retry. BLOCK/SNIP/unstreamable tracks and snipped/DRM transcodings are rejected. No SoundCloud account or subscription access is circumvented.



Audio, HLS manifests, encryption/init references, segments and artwork are served through a fixed HTTPS provider-CDN allowlist. Arbitrary origins, credentials, ports and HTTP are rejected. Redirects are not followed. No SoundCloud page, widget, advertising SDK, registration screen or third-party UI script runs in the Nova client. Advertisements or sponsorship already present in a recording are not removed or promised removable. HLS audio keeps a short buffer and uses one worker; there is no animation-frame or DOM-observer polling loop. One automatic network recovery is allowed per track; later failures expose Retry.



Existing private /api/music APIs remain authoritative for likes, playlists, invitations and up-to-five-member parties. SoundCloud identity is sc:<numeric track ID>. Old-provider songs are preserved, but are not falsely treated as SoundCloud recordings. Queue/playback state is host-authoritative, with long polling, 25-second heartbeats, corrected server clock offsets, bounded drift correction, stale-request guards and autoplay recovery. Party audio requires the listener to press Play if browser autoplay rules reject it. Saved-library mutations are serialized.



Validation: 81 music/SoundCloud tests pass, including the real backend with two isolated accounts, private library enforcement, party ownership and queue synchronization. Browser checks cover actual SoundCloud audio (readyState 4, advancing position), pause, Nova Menu metadata/artwork/progress, isolated playlist creation, saving/liking a track, hosting a playlist and immediate search-row like updates. The 1024px layout has no horizontal overflow. npm run build passes. No real party invitations, party chat messages or playlist writes were sent during UI testing. Temporary UI fixture files are removed after verification.



Deployment must include Public, api/soundcloud.js, server/soundcloud-service.mjs and the usual API handlers. No new SoundCloud account credentials are required for the current public integration. The endpoint is included in localhost routing and Vercel functions.



Dependency: HLS.js 1.6.13, Apache-2.0 license retained in Public/vendor/hls-LICENSE.txt. Official references: https://github.com/video-dev/hls.js and https://developers.soundcloud.com/docs/api/guide.



Catalog revision 106: mixed SoundCloud search now includes verified artists, albums, playlists and songs, with All/Songs/Artists/Albums/Playlists filters. Artist pages load provider tracks and releases; album/playlist pages resolve stub tracks without changing order. Restricted songs remain visible with a Go+/restricted label, disabled playback/save controls, and are excluded from playable queues and imported Nova playlists. Stream resolution still rejects restricted audio. Search and home use compact neutral panels and horizontal shelves; the right panel starts hidden until playback. Home discovery uses recent artist history rather than a fixed lofi query. 86 music tests pass, including catalog identity, restriction visibility, artist pages and album track expansion. Live public Yeat search confirms the verified profile and COCOON release, whose seven songs are restricted.


Revision 107 also detects protected-only cbc/ctr-encrypted-hls sources during catalog normalization. These remain visible as SoundCloud player required, rather than failing after a Play click. Standard public HLS stream resolution forwards only the provider-supplied track authorization on the server. Restricted preview durations are not presented as full song lengths.
