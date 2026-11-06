# Discord cosmetics import

Added 197 locally hosted assets from the public Infinitay/discord-collectibles-archive at commit 6f7036a9649ecbdc3834d2db168d666f504f16c5: 130 decorations and 67 profile effects. Nova now has 392 catalog entries. Existing 195 catalog records and ownership IDs were retained.

This is a public archive import, not the full current Discord shop. The official unauthenticated catalog returned HTTP 401. No Discord credentials were requested or used. Collection promotional banners were not treated as user profile banners. Effect previews use one primary animated PNG layer; full Discord layer scheduling is not implemented.

All 197 imported PNGs and preview paths were verified, stable IDs checked for uniqueness, and compatibility with existing shop rotation tested. Two new import tests passed. The pre-existing profile-effect test has a fixed expectation of 40 files while the existing ProfileEffect folder contains 46; this unrelated test still fails on its count assertion. No files in that folder were changed by this import.

Preview: http://127.0.0.1:8800/cosmetics-preview.html
Not deployed. Buying/equipping new items through the live account backend has not been verified.

## Current signed-in shop inspection — November 4, 2026

Inspected 1,108 distinct visible catalog labels across all 20 Browse pages. Added 676 additional assets: 414 animated avatar decorations and 262 animated nameplates adapted to Nova chat banners. The full Nova catalog now contains 1,068 entries. Existing IDs and inventory records were preserved. Public cosmetic URLs only were retained; user avatars, private messages, credentials and account tokens were not collected.

Nameplate WebM files were converted to looping animated WebP at 15 fps and 600 px width for compatibility with existing image-based banner renderers. Original WebM sources are retained locally. This conversion reduces frame rate and may not exactly reproduce Discord playback. These are chat-row banners, not user-uploaded header banners.

277 current profile-effect entries and 51 profile-frame entries were recorded but not added as wearables: their preview artwork alone is insufficient for full layered animation/frame behavior. Existing 67 archive effects remain available. Only default visible variants were inspected; hidden, retired and unselected variants are not claimed as imported. Duplicate names within a kind keep the existing cosmetic rather than replacing ownership IDs.

All five focused import tests passed (local image signatures, animated banner frames, unique IDs, manifest privacy filtering, and shop rotation). The local banner gallery was checked in-browser. Live account purchases/equipping and deployment have not been verified. Preview: http://127.0.0.1:8800/cosmetics-preview.html
