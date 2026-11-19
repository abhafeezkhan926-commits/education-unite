# EducationUnite handover

Production is available at [education-unite-mvp.vercel.app](https://education-unite-mvp.vercel.app). The source is in the [EducationUnite GitHub repository](https://github.com/abhafeezkhan926-commits/education-unite). The app uses the approved 24 question templates and requires an email verification code for admin sign-in.

## Deploy and verify

1. Follow the [README](../README.md) for local setup, migrations and server environment variables. Run `npm run build` followed by `npm test` before publishing app changes. GitHub Actions runs the same checks.
2. Push approved changes to the connected GitHub repository and check the production deployment in Vercel. Apply database migrations in order when a release adds them.
3. For workbook revisions, validate and import the templates. Verify the generated answers, hints and worked solutions. On production, check Login, Join, Practice and the summary with synthetic accounts.
4. Give the client repository and infrastructure access before the account transfer. Verify the client's access in GitHub, Vercel, Supabase and Resend.

## Test accounts and owner transfer

- Production handover uses real account workflows. Remove positively identified synthetic students and their linked data after verification; keep automated fixtures in the local/CI test environment. Give the client a fresh class code if they want to test sign-up.
- The final admin email has been supplied. Activation is pending a verified Resend sending domain and client inbox verification; the working owner remains active meanwhile. Create or prepare the confirmed Supabase Auth account with a password of at least 12 characters and configure the approved owner ID in Vercel when delivery is ready. Coordinate the change with the client and confirm inbox receipt, code verification and dashboard access.
- After the replacement owner has signed in, revoke the previous admin account and any outstanding app admin sessions and email challenges. Have the replacement owner sign in again. Verify that the old account and any previous admin session are rejected.
- Remove or rotate the synthetic test accounts after handover. Record results in the project status without credentials, authentication tokens or student data.

## Student management

The client can use **Students** to create accounts, search usernames, filter by optional gender and page through results. New admin-created accounts receive a system-generated username and a one-time password expiring in 15 minutes. Their first login requires setting their own password before any practice access. The credential appears in the creation/reset result and is not retrievable afterward; issue a fresh one if needed. Share it privately.

Edit changes username and gender. A username change revokes existing student sessions. The key action replaces the password with a one-time credential and revokes all sessions. Delete requires exact username confirmation and cascades to sessions, resets and practice records. Existing class-code signup remains available and gender is optional for both signup and admin provisioning.

Client owner activation depends on a verified Resend sender that can deliver to the client inbox. Keep the working owner active until delivery and the client's full sign-in are verified. A Resend test sender is not sufficient for a different recipient.

## Independent review

Give the reviewer the production link, Phase 1 scope and synthetic test access through a private channel. For each finding, record its receipt date, whether it is in scope, the fix or disposition, and the re-test result. Deliver in-scope fixes within seven days of receipt. No reviewer report was available when this guide was prepared.

| Finding | Received | Phase 1 scope | Fix or disposition | Re-test |
| --- | --- | --- | --- | --- |
| Pending reviewer report | | | | |

## Service inventory

| Service | Data processed | Region | Provider log retention |
| --- | --- | --- | --- |
| Supabase | Student usernames, password hashes, optional gender and account creation metadata, session token digests, practice answers and duration, temporary interests and hints, join-code digests, rate-limit buckets, reset digests, owner Auth and admin challenge digests | Sydney (`ap-southeast-2`), existing developer-owned project retained at the user's request | Confirm the project plan, Logs Explorer retention and log drains with the account owner. [Supabase logs documentation](https://supabase.com/docs/guides/platform/manage-your-usage/logs) |
| Vercel | App requests, server-side secrets, access and build logs. The trusted request IP is used to derive a keyed rate-limit digest. | Production functions in Washington, D.C. (`iad1`). CDN edge locations vary by request. | Confirm the active plan and log drains. [Vercel runtime logs](https://vercel.com/docs/logs/runtime) |
| GitHub | Source, CI logs, dependency audit and synthetic test fixtures | GitHub-hosted Ubuntu runner. Exact runner location is pending confirmation. | Confirm the repository's Actions retention setting. |
| Resend | Sender and recipient addresses, the sign-in email body and delivery metadata | Account processing region pending confirmation. | Confirm retention and access with the account owner before the pilot. |

App access windows are seven days for student sessions and class codes, 30 days for the optional remembered-device cookie, 15 minutes for rate-limit windows, resets and admin sessions, and five minutes for email challenges. Active practice expires after two hours and its summary after 15 minutes. Account and completed practice retention is an owner decision. Confirm that the hosted expiry job is enabled and verify provider retention before the pilot.

Keep credentials, TOTP material and student data out of handover notes, the repository and the reviewer findings log.
