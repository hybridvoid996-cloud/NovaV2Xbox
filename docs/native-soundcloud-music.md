# Native Nova Music

Nova renders its own Spotify-style interface with SoundCloud search, artist and release pages, private Nova playlists, likes, queue, listening parties, and one state shared with Nova Menu. Existing music backend authorization and ownership rules remain authoritative.

## Playback

Public formats supported by HTML audio/HLS use the same-origin `/api/soundcloud` relay. The fixed HTTPS provider-CDN allowlist applies to audio, artwork, HLS manifests, segments, and standard keys/init references. Metadata is bounded/cached, uses anonymous public provider data, and does not send Nova identity or cookies to SoundCloud. This integration depends on SoundCloud's current anonymous interfaces and can be affected by provider changes, rate limits, and geography.

An unsupported or encrypted format is not evidence that Go+ is required. These songs remain selectable and saveable. The server returns a fixed official widget URL rather than attempting to decrypt protected streams. `nova-music-guest.mjs` uses the documented SoundCloud Widget API in a credentialless iframe with autoplay/encrypted-media permissions. Nova bridges play, pause, seek, duration, position, volume, ended events, and party state. The provider decides guest access and preview duration. A visible player opens when a direct interaction is needed; retries/timeouts are bounded.

The guest fallback connects directly to SoundCloud, so it is not an all-traffic proxy and can still be blocked by school networking or browser media restrictions. No protection, authentication, signup gate, subscription entitlement, or browser security restriction is bypassed. Ads/embedded sponsorship cannot be universally guaranteed absent. The test browser loads Addicted and reports its duration, but does not sustain its protected-format playback; do not claim full playback of that song was verified.

## Play/Pause interruption fix

Playback intent is tracked separately from the media element's paused state. Pausing a pending play or replacing its source cancels stale completions. Duplicate Play requests share the pending operation. A current transient AbortError retries once; canceled/stale requests do not overwrite the new song or surface raw browser exceptions. Autoplay denial waits for a click. Metadata listeners are removed when a source changes. Party sync reads the selected transport snapshot, including guest playback, instead of the inactive native audio element.

## Validation and deployment

93 music tests pass, covering private backend/party behavior, catalog identity, guest routing, rapid pause during pending play, stale play rejection, bounded interruption recovery, autoplay denial, and transport state. Real proxied native audio was verified in Nova at readyState 4 with advancing position. Existing HLS.js 1.6.13 remains locally pinned, with its Apache-2.0 license retained. Required-file checks include the guest module. No real invitations, party messages, or playlist mutations were sent during this revision's UI checks.

Deploy Public (including all music modules), api/soundcloud.js, server/soundcloud-service.mjs and the existing API handlers together. The current frontend cache stamp is 20261016-sc109. Local changes do not update an already-deployed site. SoundCloud Widget API reference: https://developers.soundcloud.com/docs/api/html5-widget
