# Community music playback sources

Nova includes Reading Music and TB Music in unified search and matched playback fallback. The existing queue, saved songs and listening-party system retain the recording identity and source alternatives. Pop, R&B, Rock, Latin, Jazz and Classical browse searches use the unified catalog.

Reading supplies song, album and artist metadata through its public music API. Audio is resolved separately to an exact title/artist match; Deezer preview clips are not used as full songs. Remix and other recording variants stay distinct. TB supplies its public music search and audio stream; album and artist availability depends on what its API returns.

Audio passes through Nova's fixed source routes with bounded byte ranges, audio response checks, startup deadlines and seek support. Artwork uses restricted image hosts. Search requests run concurrently with bounded waits and short caches; unavailable sources do not prevent other sources from returning results.

Cherrion is not enabled. Its visible Music button was inaccessible through the browser's closed component, and its public music-ticket endpoint returned HTTP 401 Unauthorized. No login or access checks were bypassed.

Verification: live upstream search and HTTP 206 audio responses were observed for Reading and TB. These checks confirm audio bytes and range support, not every song or uninterrupted playback on every network. Automated tests cover source normalization, recording variants, saved queue artwork, direct playback routing, malformed IDs and non-audio responses. Full browser listening-party and published-site playback were not verified in this change.
