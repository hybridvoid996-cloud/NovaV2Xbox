# Abstract media integration — November 2, 2026

Public source: https://cchealthdev.org/get-involved (app entry /1.html).

## Music
- Public `/api/music/search?q=…` supplies track metadata, artwork, album and artist names.
- Distinct `abs:` IDs prevent collisions with Noah, Void and SoundCloud IDs.
- Search runs alongside existing providers with a four-second deadline and a bounded 60-second cache. Existing deduplication retains alternate sources.
- Albums/artists are explicitly partial search collections, not complete discographies.
- Audio goes through Nova's fixed-host adapter; metadata and ranges are validated. No arbitrary URLs, credentials or third-party sessions are accepted.
- Live check: “Rock with You Michael Jackson” returned 25 tracks / 17 partial collections, including Michael Jackson's track and Tidal artwork. A 1,024-byte range through Nova's new adapter returned HTTP 206, audio/webm, bytes 0-1023/3709320.
- This verifies initial audio delivery, not every song or uninterrupted long-session playback. The provider can fail and is handled by the existing fallback system.

## Movies
- User opened Lupin S1 E1 in the source site. DOM confirmed a playing CineSrc iframe, elapsed time progressing past one minute.
- CineSrc already existed in Nova; moved it first within the backup group, preserving the primary routes and successful-player pinning. Matched subtitle/autonext settings.
- Source picker also exposed VidLink. Selected it and verified the exact TV route; added that format as another backup. Movie and TV routes keep typed TMDB IDs; unmapped AniList IDs are not reused.
- No separate movie metadata endpoint was confirmed. Existing Nova catalogs remain; this change does not claim to import the site's entire movie database.
- No authentication bypass or private account data used.

## Verification
- 14 media/route/recovery tests passed.
- 46 existing music engine/catalog/provider-page tests passed.
- Production deployment has not been performed. Initial audio delivery and source-site movie playback were checked; full end-to-end Nova playback and long-session stability still require testing.
