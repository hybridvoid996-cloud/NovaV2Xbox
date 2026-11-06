Movy integration (local, not deployed)

- Reads only public server-rendered page metadata. No account, private key, cookie or authenticated endpoint is used.
- Adds cached home shelves, a search supplement over those shelves, movie/TV details, artwork and cast. This does not enumerate Movy's entire catalog or implement its full search engine.
- Adds Movy as the last playback fallback after existing providers. Movies use TMDB movie IDs; shows preserve season and episode. Anime requires Nova's existing verified TMDB mapping; raw AniList IDs are never sent to Movy.
- No watch-party feature is imported. Existing successful playback is not interrupted to select Movy.
- Public live checks: home returned 10 shelves; Breaking Bad details returned TV ID 1396 and five seasons; /tv/1396/2/3 selected season 2, episode 3. Earlier local proxy test played A Story of Derry through Movy. Automatic traversal through every prior failing provider has not been browser-tested.
- Noah's public Movies script references its authenticated movie service. No account was created, login bypassed, credentials copied or protected endpoints called. Integration remains pending authorized access and a supported service arrangement.
