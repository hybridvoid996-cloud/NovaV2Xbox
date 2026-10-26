Owner-approved Nova recovery codes

1. The user contacts an owner. The owner verifies account ownership using information outside the guessed username/email alone.
2. In Owner Studio, open People or Players, select Manage on the exact account, then Generate recovery code. Confirm ownership before generating.
3. Share the displayed username and code privately with that verified person. Codes expire after 15 minutes and work once. A new code invalidates the previous code; Revoke recovery code cancels the current one.
4. The user chooses Forgot password on the Nova login page, enters the username and owner code, and selects Sign in with code. Access to the registered email inbox is not required. The remembered email field is informational, not authentication.
5. The user may choose a new password during recovery. It goes directly through Firebase Authentication; Nova owners and the recovery endpoint never receive it. Email reset remains a separate option for users with a working inbox.

Only owners can issue codes. Only protected primary owners can approve recovery for owner accounts. Codes cannot recover disabled or site-banned accounts, and codes from demoted/banned issuers are rejected. Renaming an account invalidates its outstanding code.

Server records under novaAccountRecovery contain only code hashes. Root and recovery database access must remain private. Code exchange is rate limited, atomically single-use and audited without logging codes or tokens. The public endpoint never issues codes based on username/email guesses.

This feature needs deployment of the updated frontend and shared backend. Existing root-deny database rules safely deny an absent recovery node; the repository also declares an explicit private novaAccountRecovery node. Browser tests use mocked Firebase sign-in callbacks; real production sign-in still requires the deployed Firebase Admin signer and a live account verification test.
