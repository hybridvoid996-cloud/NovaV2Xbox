# Nova Shop

Shop is available beside Computer in the Home dock. It opens fullscreen with the Nova Menu. Chat’s old Shop entry is removed; old chat links forward to Shop. Existing crates, inventory, equip controls, hack purchases, and virtual coin gambling use their existing authenticated backend actions.

Daily offers rotate at 00:00 UTC, shared by all users. A stable day-seeded shuffle selects six distinct cosmetics from each active crate pool. Standard pools exclude Halloween; Halloween expires at the existing seasonal deadline. Direct prices are 2× / 3× / 6× / 10× / 20× / 40× a single crate for common through singularity.

storeStatus returns the authoritative rotation. buyDailyCosmetic validates the rotation, selected item, balance, ownership, and purchase ID on the server. One transaction debits coins and grants inventory. Retrying the same purchase returns its saved receipt without charging twice. Owned items cannot be purchased again.

Deploy both frontend and backend to the primary novaoffical Vercel project to enable daily purchases. Other hosts forward account actions there. If the backend has no dailyShop version, the frontend shows a read-only preview and disables direct purchases; existing purchases remain available. No new season or inventory reset is introduced.

Validation: node --test tests/daily-shop.test.mjs tests/daily-shop-integration.test.mjs tests/shop-season.test.mjs tests/hack-shop.test.mjs
