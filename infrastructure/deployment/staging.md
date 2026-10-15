# Staging Environment

## Purpose

Staging is the final validation environment before production. It should resemble production configuration while using isolated resources and non-sensitive test data.

## Checklist

- [ ] Deploy the intended commit.
- [ ] Apply migrations using the approved process.
- [ ] Confirm health and readiness checks.
- [ ] Test registration, login, verification, and password recovery.
- [ ] Test education and career search flows.
- [ ] Test application and document upload restrictions.
- [ ] Test payment integrations in sandbox mode.
- [ ] Test notifications, scheduled jobs, and worker shutdown.
- [ ] Review accessibility, responsive layout, and error handling.
- [ ] Check logs for secrets or unnecessary personal data.
- [ ] Verify backup and restore procedures when changes affect data.
- [ ] Record results and obtain release approval.

Never connect staging to production payment processing or production user data unless a formally approved, tightly controlled requirement exists.
