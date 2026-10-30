# Nova Remote · Windows agent

Nova website: https://novaoffical1.vercel.app/computer

## Use

Install `NovaRemote.exe` on a Windows computer you own or have permission to control. Log into an existing Nova account with email or username and password. The computer registers to that account automatically; no pairing code or account-creation form is used. The launcher shows your profile. Passwords and Firebase login tokens are not saved; Windows encrypts the resulting device credential, and the database stores only its hash. Log out to disable this computer and erase its local credential.

Access starts disabled. Click Enable remote access locally. Sign into the same Nova account in another browser and click Connect. On the Windows computer review the request, Allow this session, then Start screen sharing. The agent stays visible. Disconnect immediately or press Ctrl+Shift+F12 to stop. Closing the agent disables access. Each request expires after 45 seconds; an approved session lasts at most one hour. Disable or remove the computer from Nova to revoke access. Lost server contact stops local input and sharing after ten seconds.

The first version shares the primary Windows display, at up to 1080p/60fps (a target, not a guaranteed frame rate), with keyboard and mouse control. Clipboard, file transfer, unattended access, startup services, and Windows secure-desktop/UAC control are not included. Browsers may reserve some keyboard shortcuts.

## Build

```
cd remote-agent
npm ci
npm run dist
```

The installer is produced at `dist/NovaRemote.exe`. Run `node scripts/package-remote-download.mjs` from the repository root before deploying the website. This publishes two chunks below Git's per-file limit; the download button verifies SHA-256 checksums and reconstructs `NovaRemote.exe`. Packaging does not install or launch the agent. The executable is unsigned; obtain a signing certificate for a production release. No security-warning bypass or automatic installation is implemented.

## Deployment

Keep Nova on Vercel. Deploy the updated website and `/api/remote` function; publish `firebase-voice.rules.json` to the existing Firebase Realtime Database. Keep `FIREBASE_SERVICE_ACCOUNT_JSON` in server environment settings. `novaRemote` is private: browsers and agents go through authenticated API operations, never direct database writes.

Configure a TURN service which supports TLS on port 443 for networks that allow HTTPS but block direct WebRTC. Set `NOVA_COMPUTER_TURN_URL` to the provider's actual TURN URLs. Prefer `NOVA_COMPUTER_TURN_SECRET` for coturn REST credentials (HMAC credentials expiring with the authorized session); existing `NOVA_COMPUTER_TURN_USERNAME` and `NOVA_COMPUTER_TURN_CREDENTIAL` are supported as a fallback. STUN alone is not enough on many restricted networks. Nova does not bypass school or device policies. TURN relay bandwidth, availability, and costs are external to Vercel.

Device credentials, pairing tokens, and session signaling must not be logged. Private database records contain ICE addresses as part of connection negotiation; the UI never displays raw IPs or opens inbound remote-control ports. Pairing codes expire in ten minutes, session records in one hour; Nova cleans expired pairing/session/limit records in bounded batches when the computer list is opened (at most once per ten minutes). Add scheduled cleanup if you need retention enforcement even when nobody opens the page. Neither API tokens nor credentials are baked into the agent.

## Verification scope

Server tests cover pairing possession, ownership, revocation, request locking, expiry, bans, signaling direction/limits, and fail-closed database rules. Native input is constrained to validated coordinates/buttons/known keys and only accepted for the approved session. A full two-computer test and a school-network test require deployment, a running agent on the owner PC, and the TURN service; passing unit tests does not prove those network environments work.

Click the browser desktop to lock the mouse; Esc unlocks it. The first click engages control without clicking anything on the remote desktop. Relative mouse movement is supported for games. The connection fills the Computer page; the Fullscreen button expands it further. Actual FPS is displayed in the toolbar and depends on the host GPU/CPU and network. The video sender uses a 24 Mbps maximum; The sender prioritizes maintaining full resolution; congestion and device limits can still reduce delivered FPS. Fullscreen hides the toolbar; Esc leaves fullscreen.

If launcher username login fails while website login works, use **Log in through Nova in your browser**. Use your existing signed-in browser account or log in there, choose Connect, then confirm the account in Nova Remote. No pairing code is displayed or entered. Deploy `remote-login.html` and `src/remote-login.js` before using this option.

## Connection recovery in 0.2.5

The viewer and host allow up to 15 seconds for a temporarily disconnected WebRTC connection to recover. Temporary polling failures retry; explicit revocation still stops immediately. The Windows agent retains its ten-second server authorization watchdog, so loss of server contact still stops screen sharing and input. Initial connection attempts time out after 45 seconds with a specific message, and the browser keeps the failure visible instead of replacing it with the computer list heading.

A failed cross-network connection can still require a working TURN relay. Configure the existing NOVA_COMPUTER_TURN_URL and either NOVA_COMPUTER_TURN_SECRET or NOVA_COMPUTER_TURN_USERNAME / NOVA_COMPUTER_TURN_CREDENTIAL on the primary backend. The client reports whether a relay was supplied; that alone does not prove its credentials or network route work. School-network connectivity has not been reproduced locally. Deploy the viewer/backend updates and install Nova Remote 0.2.5 on the host PC for both sides of the recovery fix.

## Restricted Wi-Fi connection mode

Nova Computer now offers Automatic and Restricted Wi-Fi modes. Restricted Wi-Fi requires a provider-issued `turns:HOST:443?transport=tcp` URL and working credentials on the primary backend. The server validates readiness before reserving a session, then supplies only those TLS relay URLs to both sides and makes the viewer use relay candidates. Nova Remote 0.2.5 already consumes this server-provided ICE list, so this update does not require another installer version. Automatic retains direct and other relay paths. Relay setup status means configuration is present, not that a real allocation or the school network has been tested. Do not invent endpoints or use unrelated credentials; copy the URLs from the existing provider dashboard. Deploy the updated backend and viewer after configuring that service.

Version 0.3.5: adaptive stream resolution/bitrate, bounded mouse input backlog, new central backend. Rebuild and update the host app to use these changes. Viewer uses presented video frames when supported. Frame rate and latency are not guaranteed; verify over a real approved session on the target network.
