# Noah playback and catalog integration

Nova Music now has an additional public playback route through Noah's Tutoring Hub. This is an adapter for its public music API; Noah's client code and interface are not bundled into Nova.

## Playback

- Public Noah search tracks use `noah:<numeric-id>` in Nova libraries, imports and listening-party queues.
- The music engine can switch from a failed SoundCloud or Void route to a matching Noah recording, or from Noah to Void. It retains queue identity, position and playback intent.
- Failed routes are excluded from subsequent attempts. Healthy playback is not replaced by a late lookup, and old lookups cannot overwrite a newly selected track.
- `/api/soundcloud?op=noah-audio&id=...` resolves the public Noah stream and relays bounded one-megabyte byte ranges. Seeking and later portions of a song stay on Nova's origin.
- Only `FULL`, direct SoundCloud-backed responses from Noah's fixed public file route are supported. Preview responses, encrypted manifests and arbitrary media URLs are rejected.

## Metadata

Noah search results supplement Nova's catalog, artwork, artist cards and suggestions. Existing SoundCloud identities and verified artist metadata take precedence over duplicates. Search can use Noah when the primary catalog is unavailable.

Noah's current album-style cards also contain genre and uploader groupings. Nova labels these as **Noah search collections**, not complete albums. Explicit album metadata remains album metadata; existing full album pages and Void album matching remain available.

Noah collection and artist links carry bounded, validated query context, so they work across separate hosted function instances without depending on an in-memory index. New routes are `noah-search`, `noah-collection`, `noah-artist`, `noah-art` and `noah-audio` under the existing music endpoint.

## Verification

- 182 music unit/regression tests passed across 34 test files.
- Live adapter checks confirmed catalog, stateless collection lookup, exact-recording matching and `206 audio/mp4` range replies.
- `tests/music-noah-ui.mjs` uses the real Nova interface and real Noah network responses in an isolated, unauthenticated browser. Simulated SoundCloud/Void outages verify automatic recovery; playback, seeking, pause/resume, collection and artist navigation are checked.
- Screenshots and the latest browser result are in [music-noah-check](music-noah-check/).

These changes are local and have not been deployed. The game repair work remains paused.
