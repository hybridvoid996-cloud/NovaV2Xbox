# Nova AWS migration plan

Status: planning only. No AWS resources created, no traffic moved, no Vercel configuration removed.

## Repository findings

- Public/ is the frontend output in vercel.json.
- api/, api-handlers/, server/, lib/ contain backend code. S3 cannot execute this code.
- Nova uses cookies, Firebase Admin, AI secrets, HTTP APIs and WebSockets (including Wisp).
- server.mjs is currently a local development server, not a production AWS deployment entry point. It exposes a local-AI preview route, imports a catalog stamping script at startup, and does not reproduce every Vercel API route. Do not expose it publicly unchanged.
- Vercel currently supplies rewrites and COOP/COEP headers. Those must be reproduced.

## Target architecture

Browser -> CloudFront HTTPS
- Default origin: private S3 bucket, Public/ contents only, Origin Access Control.
- /api/* and /game-runtime/*: production Node backend (EC2/Lightsail or ECS with a WebSocket-capable ingress).
- Firebase database and existing user IDs stay unchanged.

Use a CloudFront HTTPS address or your own domain. A raw S3 website URL does not provide the HTTPS setup Nova needs for service workers and browser features.

## Before provisioning

1. Sign into an AWS account with billing enabled. Choose a region and a monthly spending budget.
2. Create budget alerts. Storage, requests, delivery and compute can incur charges; alerts are not a hard spending cap.
3. Choose the backend service and size after estimating concurrent users and traffic. Do not create paid compute before approving its estimated cost.
4. Keep Vercel available until the AWS staging site passes validation.

## Implementation before cutover

1. Build a production Node entry point with parity for every Vercel API/rewrite, HTTPS-aware cookies and WebSocket upgrade routes. Exclude local-only preview/support bypasses. Add health checks, structured logs and process supervision.
2. Store Firebase service-account material, Groq/Gemini keys and TURN credentials in backend-only environment/secrets configuration. Never upload .env files, API code or private keys to S3.
3. Build the frontend. Audit the Public/ output for local-only preview/test pages before publishing. Upload only the reviewed output to S3.
4. Keep S3 Block Public Access enabled. Let CloudFront read the bucket using Origin Access Control. Set index.html as the CloudFront default root object.
5. Configure CloudFront behaviors for backend API and runtime routes before the default S3 behavior. Disable caching for authenticated API responses. Forward required cookies, query parameters and authorization/origin headers; support all required HTTP methods. Forward WebSocket handshake headers for the relevant behavior.
6. Reproduce COOP same-origin and COEP credentialless response headers, the /computer rewrite, account endpoint aliases, and service-worker no-cache behavior. Do not map API errors or missing JS files to index.html.
7. Add the final hostname to the application's approved origin/redirect configuration, central sign-in allowlist, Firebase authorized domains where applicable and provider origin settings. Do not use wildcard sign-in redirects.
8. Test the AWS staging URL before changing any production links.

## Required validation

- Sign-in, sign-out, account switching, password recovery and central handoff.
- Private data access remains restricted; user IDs and inventories match Firebase.
- Game-save restore/upload and account isolation.
- Scramjet service worker, WebSocket proxy, games using workers/WASM, and cloud sessions.
- AI, music, movies, chat, uploads, shop transactions and server-side authorization.
- Secrets absent from static output and browser responses.
- Cache headers do not cache personalized responses; stale service workers update safely.
- Preserve rollback path. Existing browser-only storage on Vercel does not automatically move to a new origin; use the existing explicit import/cloud-save process.

## Official references

- https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-working-with.websockets.html
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html

## Preparation completed November 5, 2026

- Inspected Amplify app dnw9x6dxqh8lf / main in us-east-2.
- Original console build spec had an empty build command and artifact baseDirectory '.', which attempted to package the entire repository. Backed up to docs/amplify-original-build.yml.
- Updated existing Amplify console build spec and added amplify.yml locally: npm ci --ignore-scripts --include=dev; npm run build; artifact baseDirectory Public.
- Did not start a new deployment or create paid resources.
- Local npm run build passed (archive validation, catalog stamping, pinned proxy build and required-system checks).
- Added server/production.mjs: routes all current api/*.js modules, existing account aliases, Fortnite/Wii runtime routes, WebSocket upgrade handler, health endpoint and production login root. Local-only preview endpoints are rejected.
- Two production router tests passed. Tests use stub API handlers; they do NOT prove real AWS authentication, database access, billing, media providers or proxy gameplay works.
- Current local Public assets are about 10.1 GB (9.4 GiB); content ~6.66 GiB, profile-assets ~1.39 GiB, backgrounds ~1.06 GiB. The deployed Git revision may differ. Need an asset split/origin routing plan before redeployment; publishing all Public content may exceed Amplify's 5 GB build artifact quota.
- No account data or private credentials were moved. No AWS resources provisioned. Awaiting monthly cost budget before selecting/provisioning the Node backend and asset storage.

Remaining production validation: exact committed build/artifact size, API module behavior under real requests, all hostname/redirect settings, Firebase service credentials, secure proxy ingress, WebSockets, origin routing for large assets, game save isolation, authenticated browser checks and rollback.

## Approved deployment constraints

- User approved up to $10/month and an AWS-provided HTTPS hostname (November 5).
- Lightsail draft selection is Nano: $7/month, 512 MB RAM, 0.25 vCPU, one node. Not created. Traffic overage is billable; this is not a guaranteed total cost or hard spending cap.
- CloudFront/S3 assets and request costs must be included before provisioning. CloudFront plan eligibility and WebSocket behavior remain unverified.
- Fixed Docker startup permission hazard by applying the Wisp compatibility patch at image-build time before switching to the unprivileged node user. Docker image itself is not yet built or tested.
- Re-ran both production routing tests successfully and regenerated the secret-free backend staging package.
- Firebase service-account credential is still needed privately in the AWS backend environment. Do not publish credentials with static assets. Without it the existing shared-backend fallback would still depend on Vercel.
- No paid service, bucket, distribution, or successful AWS deployment has been created in this preparation.
