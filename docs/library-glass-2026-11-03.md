# Glass library refresh — November 3, 2026

End Task/version dock is now Home-only; hidden on libraries, active players and settings. Resume/recent strip shares the size-aware liquid lens. Existing task state remains retained when hidden.

Game and App libraries share a longer glass search, integrated Favorites and Categories, adjacent Cloud Gaming control (games only), a glass sort segmented control with Popular initially selected, and an interactive count pill with a green navigation indicator. The green dot is not a claim that every game is working. Count opens the existing published Game Status UI. When the account service cannot be reached, the catalog remains visible with Status unavailable labels rather than invented owner results.

Removed the library refresh control. Search, category filtering, favorites, sort and launch still use their existing data paths. Image hover glow samples a one-pixel average from loaded artwork; cross-origin images without canvas permission use a neutral glow. Pointer tilt and fade launch remain enabled unless reduced motion is explicitly chosen. Lens filters are restricted to small controls, not game render frames or the entire scrolling grid.

Local verification: status box lists 1,018 catalog games while the backend is offline, with unavailable labels. Monkey Mart search returns one result. Popular selected; refresh absent. End Task is hidden in NovaTube and the libraries and visible after returning Home. Apps and Games layout inspected at 1366×768. Six session tests and build pass. No deployment performed.

Reference videos inspected locally: short recordings show a game catalog/game launch, with an OBS window obscuring much of the first clip. No uploaded video assets are included in Nova; launch/reveal animations remain native UI effects.
Added reference-based Games/Apps launch motion (November 3): the selected tile expands into the player area over blurred artwork, then reveals the running player. The player starts loading immediately; the visual overlay is temporary and does not gate startup. Closing uses a reverse shrink/fade. Reduced-motion preferences skip it. Verified Monkey Mart game and Desmos app launches; app return completed and temporary overlay nodes were removed. Clips were reviewed through local contact sheets; temporary copies removed after review.
