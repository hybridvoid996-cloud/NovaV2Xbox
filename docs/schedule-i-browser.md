# Schedule I Demo browser deployment

The catalog entry `schedule-i-demo` launches `content/schedule-i/index.html` directly in Nova's game player. It does not go through Scramjet.

Playable release: `20261117031448`. This is the last verified playable browser recovery, not the newer experimental hand/shadow repair builds. Existing visual limitations remain.

The small launcher, cover and template assets are tracked. Large Build and StreamingAssets files are uploaded separately to the existing bucket under `content/schedule-i/`; they must not enter Git or the Amplify compute bundle. Amplify's existing `/content/` rewrite serves those public assets at Nova's own origin. The existing S3 sync has no `--delete`, so later site deployments preserve these uploads.

Before changing the catalog to a different release, upload the matching data, wasm, framework and loader, then verify their lengths and launch the live page. Do not include local save folders, credentials, recovery project source or `nova-local-build.json` in uploads.
