# Terraria startup repair — November 1, 2026

Local player: game 1041 on port 8795. Not deployed.

Reproduced “Game not running” with MONO_WASM `SyntaxError: Unexpected token '}'`. Scramjet's debugger removal left the .NET runtime's conditional hook without a statement body. The game-specific response repair wraps that hook in braces before rewriting. It is limited to this Terraria export's runtime file; other games and saves are unchanged.

Verified through Nova's actual proxy: language selection, main menu, creating a Classic character (test name N), creating a small world (Hot Shrublands of Ogres), entering the world, moving right and jumping. Screenshot: artifacts/game-audit/terraria-playable.png. No long-session or cross-domain save-sync verification was performed.

Build passed. Ten related tests passed, including a regression that runs the repaired conditional after debugger filtering with the flag both on and off.
