# Call connectivity

Direct WebRTC audio can fail on networks that block UDP. Nova retries with the configured TURN relay after eight seconds, prioritizing TLS over TCP on port 443 when supplied. Pending SDP negotiation defers the retry without spending an attempt. Attempts are bounded; microphone tracks are retained while reconnecting.

Configure the actual relay in the server environment:

- NOVA_TURN_URL: provider-issued TURN endpoints, including a real turns:hostname:443?transport=tcp listener for restricted networks.
- NOVA_TURN_USERNAME and NOVA_TURN_CREDENTIAL: provider-issued credentials; alternatively NOVA_TURN_SECRET for a relay supporting TURN REST credentials.

The ExpressTURN port 3478 endpoints in .env.example do not provide TLS on port 443. Changing a port in the URL does not provision a server. Do not invent a TLS endpoint or place relay secrets in frontend files. TLS relay configuration is only a configuration check; actual reachability still requires a two-account call on the affected network. A network may block WebRTC or the relay even with this configuration.

Deploy the updated frontend and shared backend together. Call setup polls once per second and connected calls every two seconds. Presence on Home checks every three seconds. Member state and signal acknowledgements use batched database updates to reduce round trips.

The primary shared deployment is novaoffical.vercel.app. Put the NOVA_TURN_URL, NOVA_TURN_USERNAME and NOVA_TURN_CREDENTIAL values on that Vercel project, in the Production environment, and redeploy after changing them. Local .env settings do not change a shared-backend call. Keep the provider's actual TLS/443 endpoint; do not change a UDP or TCP endpoint to TLS by guessing its port. The client now derives relay availability from authenticated ICE server entries even if an older backend omitted the summary flags. A configured relay is not proof of reachability from a school network.
