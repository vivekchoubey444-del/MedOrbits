# Authentication

## Requirements

- Use a vetted password-hashing algorithm and library.
- Enforce secure session or token lifecycle, expiry, rotation, and revocation.
- Use HTTPS in production and secure cookie attributes when cookie sessions are used.
- Protect login, password recovery, verification, and two-factor flows with rate limits.
- Use single-use, time-limited tokens for verification and password reset.
- Avoid account enumeration through error messages and timing differences.
- Require re-authentication for sensitive account changes where appropriate.
- Record security-relevant events without logging passwords, tokens, or recovery secrets.

## Account Recovery

Generate unpredictable, short-lived reset tokens; store them safely; invalidate them after use; and notify users of important account changes. Do not send passwords by email.

## Verification

Test expired sessions, invalid tokens, brute-force resistance, logout/revocation, and recovery flows. Confirm exact implementation details against the authentication code.
