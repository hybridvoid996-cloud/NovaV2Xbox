Nova Computer is temporarily restricted to owners and administrators. The backend checks the trusted role and administrator permission for browser requests, registered devices, and pairing completion. Account profile names and labels do not grant access.

Computer uses a separate relay configuration from chat/voice. In the Production environment of the primary Nova Vercel project, set:

| Variable | Metered credential value |
| --- | --- |
| `NOVA_COMPUTER_TURN_URL` | All actual TURN URLs, comma-separated or a JSON array; include the provided TLS/TCP 443 URL |
| `NOVA_COMPUTER_TURN_USERNAME` | Username |
| `NOVA_COMPUTER_TURN_CREDENTIAL` | Credential/password |

Create a separate Metered TURN credential for Computer and copy its ICE server values. Leave `NOVA_COMPUTER_TURN_SECRET` unset when using Metered static credentials; it is only for a provider supporting coturn REST signing.

Redeploy after changing environment variables. Existing `NOVA_TURN_*` values continue to serve voice and are not used as a Computer fallback. Computer relay mode remains unavailable until the dedicated values are supplied. Direct connections may still work in Automatic mode. Separate credentials do not prove real network connectivity; verify an approved two-computer session on the intended network.
