# ShuttleTV integration

Implemented locally; not deployed.

Verified public homepage and its public player bundle. /watch/157336 loads a CineSrc movie iframe with TMDB ID 157336. The public player builds TV routes using s/e query parameters. Added ShuttleTV watch-page routes as the final movie/TV fallback; existing providers retain priority. ShuttleTV uses the same CineSrc player family already present in Nova, so this is not an independent stream backend. AniList anime IDs are never sent directly to ShuttleTV. The existing Nova proxy popup guard and iframe restrictions apply to the new fallback too. Full-length movie playback through Nova was not verified.

Metadata uses only the public /api/folders/featured?endpoint=browse, movie and series endpoints. No third-party account, session, private API key or copied TMDB credential is used. These are curated featured lists, not the complete searchable site library: 76 distinct movies and 14 series were returned during the live check. Their original titles, years and approved TMDB poster URLs are normalized; missing ratings/backdrops/logos are not invented. Existing detail providers continue supplying detailed title information. The existing catalog is merged with these lists, not replaced. Search matches ShuttleTV's cached featured titles only. Requests are bounded, cached for five minutes and coalesced.

The supplied /icon.png was downloaded to Public/Img/app/shuttletv.png and appears beside the new ShuttleTV movie and series shelf headings. A sampled poster returned HTTP 200 image/jpeg.

Fixed the catalog merge deadline so a stalled sibling provider cannot discard an already available backup: individual backup waits finish before the outer merge deadline. Tests cover this, identity/type separation, artwork allowlisting, fixed public endpoints, caching, typed episode routes, and catalog fallback. Deploy updated frontend and server/movie-catalog-backup.mjs plus server/movie-shuttle.mjs together.
