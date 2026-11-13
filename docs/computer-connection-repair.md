# Computer connection repair — November 13, 2026

Computer browser fallback and Nova Remote 0.3.6 now use the AWS account backend, rather than the removed Vercel deployment. Existing Windows installations must download and install the new launcher; their old update address is also on the removed deployment.

Canceled connection attempts cannot reopen the desktop. Late ICE callbacks from an older peer cannot disconnect a replacement session. Non-JSON account-service errors now show a useful message. Saved TURN settings are labeled configured, not connected: a successful remote session is still required to establish actual connectivity.

Verification: 81 automated checks passed across Computer viewer, relay configuration, authorization, remote sessions, updater, input/video adaptation and backend routing. The live AWS remote endpoint returns the expected unauthenticated JSON 401; the retired Vercel endpoint returns deployment-not-found 404.

A live approved Windows host / browser TURN session has not been verified in this run. Keep the sharing PC online, install the updated agent, sign into the same owner/admin account, enable access and approve the browser connection. TURN credentials must be configured in the backend or supplied through Computer's personal relay settings. No relay credentials were added or changed by this repair.
