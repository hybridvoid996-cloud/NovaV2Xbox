# Signed-in blank-tab workspace

Nova attempts to open an about:blank workspace after the existing account gate has verified a signed-in user and completed onboarding. Login and signup remain regular pages. Settings → tab cloaking can disable automatic opening and customize the tab title and icon. The default is Home - Google Classroom.

The wrapper embeds the actual same-origin home page. It does not copy cookies, tokens or game saves. Existing domain storage remains in use; this does not recover saves from another domain or add cross-domain syncing.

If the browser blocks automatic opening, Nova continues loading normally and retries on the next genuine click or Enter/Space action. There is no choice dialog. If that is blocked too, a notice explains how to allow popups in the browser. After opening, the original tab becomes a lightweight reopen page. Reloading an about:blank document can erase its wrapper; use that original page to reopen. Browser tab titles do not hide network activity or bypass device policies.

Root notifications and game tracking recognize the hosted workspace. Account navigation exits the wrapper to the real account URL.

Verification: four automated tests pass for launch eligibility, tab-style validation, original-origin iframe construction, blocked popups and disallowed destinations. The repository build passes. The isolated in-app browser did not open the popup, so live wrapper execution, real Firebase sessions and game playback remain unverified in a regular browser. No production deployment was made.
