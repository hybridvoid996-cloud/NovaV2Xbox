# Welcome and live account support

Implemented locally on October 30, 2026. Publishing the website and the private database rules is still required. No real account was recovered during testing.

## What changed

- `account.html`: a 1.1-second Nova logo spin fades into left-side login/create forms and a right-side, automatically fading preview of nine Nova sections. The preview is illustrative; it does not open real chats, games, movies or private account pages. It has page controls and a pause control. Nova’s explicit reduced-motion setting skips the intro.
- Existing Firebase login, account creation, email password reset, and owner recovery-code flows remain in use. The login page links to live support and explains how to find credentials saved for the old origin in Chrome’s Google Password Manager. Availability comes from owner presence, not a fabricated online label.
- `support.html`: remembered username/email intake, optional AI consent, a private waiting room, owner chat, status updates, and an owner-approved sign-in loader. The room capability is kept in this tab’s session storage, never its URL. Keep that tab/browser open. A different browser cannot resume the private room without its secret.
- Owner Studio → **Account support**: waiting rooms, join, return to queue, close, messaging, optional AI intake, AI summary, and account selection/approval. The existing Players recovery controls are linked. Room selection is by the original account’s UID; no account is granted based solely on guessed username/email.
- Owners receive a Nova notification linking to support. An unseen recent support notification is also shown when an owner comes back. Existing notification mute preferences still apply.

## Required publication/configuration

1. Review and publish **`firebase-voice.rules.json`** to the existing Firebase project’s **Realtime Database → Rules**. The new `novaAccountSupport` root must have `.read: false` and `.write: false`, with `rooms/.indexOn: ["createdAt"]`. Keep the existing private `novaAccountRecovery` rules. There must be no root or wildcard grants that expose either root. The support API refuses to run with unsafe rules.
2. Deploy these code changes to the central **`novaoffical1.vercel.app`** Vercel project, then any other approved Nova deployments. The new `/api/account-support` route is handled by `api/account.js`; mirror sites forward to the fixed central backend. Static files alone are not sufficient.
3. The central deployment needs the existing **`FIREBASE_SERVICE_ACCOUNT_JSON`** with access to this Firebase project. Do not put the credential into public files. No new service-account key is required.
4. For optional AI intake, keep the existing **`GROQ_API_KEY`** or configured Groq key pool on the central deployment. The existing `GROQ_TEXT_MODEL` may select a model available to that account. Missing keys, provider errors, malformed AI output or limits switch the room back to human mode and notify owners. The AI has no account tools and cannot approve recovery.
5. Owners must already have Nova’s verified **owner** role. Admin/moderator roles do not grant recovery approval. Existing primary-owner restrictions on recovering owner accounts remain enforced.
6. Existing Firebase Authentication and authorized Nova domains must already be configured for regular sign-in. This feature uses Firebase custom-token sign-in after human approval; it does not share cookies between Vercel domains.

After deployment, test with two disposable accounts and two browser profiles: create a support request while signed out, open Owner Studio in the owner’s browser, join and chat, verify the correct disposable account, approve it, and confirm the requester lands in that exact account. Then repeat with an expired approval and an intentionally unavailable AI provider. Do not test on someone else’s real account.

## Recovery and privacy boundaries

- This does **not** expose saved passwords or bypass ownership checks. Remembered emails may be inaccurate and are shown to owners as unverified claims. The visitor must not share passwords or recovery codes. Obvious password/code submissions are refused.
- Approval requires the assigned owner, an explicit verification checkbox, the chosen UID, and a recorded explanation of independent verification. The server reuses the established 15-minute, account-bound, single-use recovery flow. Approval and redemption are audited. Guest responses and owner room lists do not reveal the stored recovery code.
- Owner assignment is exclusive. One owner handles one live room at a time. A disconnected owner’s room can be taken over after a two-minute inactivity lease; a polling owner keeps the lease alive. Visitors can leave messages in the waiting room.
- Each room allows 100 messages, 1,600 characters per human message, and two seconds between messages from the same side. AI intake is at most once per ten seconds and requires both visitor consent and owner enablement.
- Room secrets are random, hashed at rest, and expire after 24 hours. Up to 100 unexpired rooms are retained; expired transcripts are removed when a new room is created. Creation is limited to 20 requests per IP per 15 minutes. A full queue returns an explicit capacity error. Room indexes and limits are bounded; there is no background third-party cookie dependency.
- Failed sign-in stays in the same tab with retry and return-to-support controls. If the server consumed an approval but the browser lost its response, an owner may need to verify and approve a new request. The system does not mint repeated sessions from a used code.
- AI consent shares support transcript text with the configured AI provider. AI summaries are unverified claims for the owner to check. They never serve as an authorization decision.

## Verification performed

- Automated server tests cover private room access, wrong-secret denial, queue/owner exclusivity, owner vs admin approval permissions, independent-evidence requirement, code redaction, real recovery-module integration using an in-memory database, concurrent/single-use redemption, rollback/retry, expiry, rate limits, unsafe-rule rejection, AI consent, summaries, AI failure fallback, and trusted server prompt isolation.
- Browser checks used an isolated in-memory support server, fake owner/account data and a fake AI response: visitor intake → waiting room → owner joins → consented AI intake → reply and owner summary. No live Firebase database, real AI request or real user account was modified by that test.
- Browser checks also covered login/create transitions, forgot-password/live-support navigation, preview pause/page controls, preview artwork loading, and the desktop/laptop layout. The production Firebase rules, live Groq response, owner notification delivery and real Firebase recovery sign-in still require the post-deployment smoke test above.

For local visual QA only, `node tests/helpers/support-preview-server.mjs` runs the isolated fake support server on port 8796. This helper is not a production endpoint. Standard website preview: `PORT=8795 node server.mjs` (set the environment variable using your shell’s syntax).
