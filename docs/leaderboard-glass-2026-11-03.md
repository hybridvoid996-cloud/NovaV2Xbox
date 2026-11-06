# Leaderboard glass revamp

Minutes, Coins and Rank views now share a left navigation sidebar and the existing Shuttle-style SVG glass lens. Each view asks the authenticated leaderboard endpoint for its own server-side order; Rank uses account ELO, Coins uses the current coin balance, Minutes uses active seconds. Selecting a game limits comparisons to players with recorded time in that game. Coins and ELO remain account totals, not invented per-game ratings. Search retains each player's standing.

Player podium cards tilt gently with pointer movement. Hover or keyboard focus opens a card with minutes, coins, ELO and up to two most-played games. Additional profile data loads after a short hover delay and is cached; missing data stays empty. Existing profile click/friend actions and cosmetics remain connected. On phones, navigation moves above the content and profile clicks replace hover interactions. Reduced motion disables tilt/animations.

Verification: three Node tests pass for metric sorting, game scope, account totals, search positions, ties and safe public fields. Local sample-data preview verified metric switching and generated hover details. Live Firebase results were not verified because the backend is restricted. Deploy the updated server/leaderboard.mjs with the client. The client shows an update error if an old backend cannot provide the requested metric.

Local design preview: /leaderboard-preview.html (sample players, localhost only). Production leaderboard remains /leaderboard.html and uses authenticated backend data.
