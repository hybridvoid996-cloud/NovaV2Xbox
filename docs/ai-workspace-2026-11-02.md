# Nova AI workspace

Implemented locally, not deployed. Open /ai.html. Chat is the default; Codex opens HTML/CSS/JavaScript editors and an isolated preview. Drafts stay in this browser. AI returns validated complete replacement files, with one-step Undo. It does not edit Nova repository files or deploy websites. Publishing requires a signed-in Nova account and explicitly publishes the source code. Gallery projects open in isolated previews and can be forked into the editor; feedback is authenticated.

## Credits

Each account gets a one-time 5,000-token allowance, shared between Nova AI and the Nova Bot assistance channel. No daily reset is configured. A refill buys 2,000 tokens for 500,000 Nova Coins, in a single Firebase transaction. Tokens include context and output, using provider-reported usage when available, otherwise a conservative estimate. Small projects only: three files capped at 30,000 characters each; AI editing context must fit the existing 6,000-character per-message limit and the remaining allowance. Long conversations may require a new conversation. Requests reserve the account budget to block concurrent spending; failed provider requests refund it, successful but invalid code responses bill usage without modifying code. A three-second account cooldown applies, and the shared bot channel also retains its existing six-second delay.

## Isolation

Previews use sandboxed opaque-origin data documents with allow-scripts only: no same-origin permission, popups, top navigation or forms. A restrictive CSP blocks network requests and external scripts; HTTPS images are allowed. This is a small standalone website viewer, not a full Node/package runtime. Untrusted code can still consume CPU; do not claim protection against every resource-exhaustion script. Legacy unauthenticated AI POST endpoints now reject requests. All credit, coin and project operations use the authenticated owner-control service with server-derived account IDs. Provider keys remain server-side.

## Required rollout

1. Deploy the updated frontend AND account backend together, including server/ai-workspace.mjs, api/owner-control.js, api/ai-chat.js, api/nova-ai.js, server/shared-backend.mjs and server/chat-ai.mjs. If NOVA_SHARED_BACKEND_URL points elsewhere, update that backend too; an old backend will report Unknown action.
2. Apply firebase-voice.rules.json to the existing Realtime Database. New novaAIProjects, novaAIFeedback and novaAIClocks paths deny direct client reads/writes and index updatedAt/at for bounded server queries. Keep novaControl denied to clients.
3. Configure the existing Firebase Admin service account and GROQ_API_KEY or GROQ_API_KEYS (or OPENROUTER_API_KEY) on that backend. No keys belong in frontend code.
4. Verify with real signed-in accounts: token balance, one refill, code generation, public publish/open/feedback, and the same allowance on another domain. Local provider models currently report Not configured, so those live paid/account actions have not been verified here.

## Verification

Automated tests cover account isolation, initial allowance, atomic refill, duplicate purchase rejection, provider usage debit, cooldown, concurrent request exclusion, failed request refunds, invalid code preservation, and preview policy. Existing AI image/model/channel tests pass. Browser checked default Chat, Codex layout, manual HTML rendering and local draft restoration. Build passes. No production deployment or live token purchase was performed.

Broader regression run: 105/107 passed. Two Shop/Case price assertions failed in tests/owner-control.test.mjs (Case purchases and the 200090-coin cache test); these involve the existing shop pricing paths, which this AI change does not edit. They have not been repaired as part of this AI task. The focused 18 AI tests all pass.

## Studio UI update

Codex now fills the page with a conversation column, file explorer, syntax-colored editor with line numbers and cursor status, and a live preview. Drag separators or use arrow keys to resize. Split/Code/Preview switches, desktop/mobile viewport, adjustable font size, line wrapping, three editor themes, focus workspace, and downloadable standalone HTML are available. These controls edit the same three HTML/CSS/JS files; they do not create arbitrary repository files or install packages. The AI and payment handlers were unchanged during this UI update. Open /ai.html?mode=codex directly. Browser checked manual HTML/CSS edits and rendered output, file tabs, mobile preview, and editor controls at laptop dimensions.
