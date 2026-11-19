# EducationUnite

Production runs at [education-unite-mvp.vercel.app](https://education-unite-mvp.vercel.app).

## Run locally

Use Node.js 24 and npm. On Windows, use Node.js 24.22.1 or a newer Node 24 release for the local regression suite. Node 24.18.1 showed intermittent V8 crashes and loopback connection resets on the project workstation. From the project directory, run `npm ci`, then `npm run dev` and open [localhost:3000](http://localhost:3000). Use `npm run build` to check the production build and `npm start` to serve it locally.

Run `npm run build` followed by `npm test` for the regression checks. The tests apply the migrations to a disposable database, validate the 24-template bank and submit the forms served by the production build on loopback. GitHub Actions runs the same checks and an npm dependency audit on pushes and pull requests.

The regression suite checks cross-student isolation with the runtime database role and separate app sessions. An Ubuntu GitHub Actions run can verify the full suite when the Windows preview runner hits a V8 memory error.

To try student sign-up, sign-in and maths practice locally, run `npm run build` and then `npm run preview:student -- --port 3002`. Open [the local preview](http://127.0.0.1:3002) and enter class code `EU-PREVIEW`. Use a test password. After joining, select **Start maths practice**. The preview binds to loopback and uses an in-memory PostgreSQL database, so accounts and sessions reset when the server restarts.

## Update the practice workbook

The approved question bank has 24 templates across Shopping and finance, Pop culture, and Music and streaming. The importer validates the template ranges, formulas, hints, worked solutions and example answers.

Run `node scripts/import-practice-sheet.mjs path/to/workbook.xlsx` to regenerate the checked-in question bank. Append `--check` to verify that the workbook matches the generated bank. Rebuild the application after importing.

## Apply the local database migration

With Docker running and the Supabase CLI available, run `supabase init` once if `supabase/config.toml` is absent, then run `supabase start` from the project directory. The CLI applies the migrations in `supabase/migrations` on startup. On a disposable local Supabase instance, `supabase db reset --local` recreates the database and reapplies the migrations. The reset discards local database contents.

Production uses the owner-approved Sydney Supabase project. When provisioning a fresh project, apply the migrations in order and provision a dedicated PostgreSQL login with membership in `education_unite_app` and `education_unite_admin` and permission to switch into both roles. Set `DATABASE_URL` to its connection string with certificate verification and set `EDUCATION_UNITE_SECRET` to a stable random secret of at least 32 bytes. Store both values in server-only environment variables.

Enable `pg_cron` on the hosted database before applying `20261116000005_expired_records.sql` to schedule hourly cleanup. If the migration was applied before `pg_cron` was enabled, an operator with migration privileges can register the same schedule from the migration after enabling the extension.

## Owner admin

For a local preview, open `/login` and use `owner@example.test` and the password configured as `EDUCATION_UNITE_PREVIEW_ADMIN_PASSWORD` in `.env.local`. If you leave it unset, the preview command generates and prints a temporary password. The test owner and six-digit test code (`123456`) are available only in loopback preview mode with the in-memory database. The local preview skips email delivery.

The current Vercel deployment uses email verification codes. Configure the server-only `EDUCATION_UNITE_SUPABASE_URL`, `EDUCATION_UNITE_SUPABASE_KEY` (publishable or legacy anon key), and `EDUCATION_UNITE_OWNER_ID` (the primary admin's Auth user UUID). Set Supabase Auth's minimum password length to 12 before creating or changing the owner password. If the existing owner password is shorter, rotate it before deploying this app version. The app and local preview accept admin passwords of 12–128 characters. For email-code mode, apply the admin email challenge migration and set `EDUCATION_UNITE_ADMIN_EMAIL_CODE=1`, `RESEND_API_KEY`, and `EDUCATION_UNITE_ADMIN_EMAIL_FROM`. The configured owner receives the code at their confirmed Supabase email address. The Resend test sender supports its linked inbox.

From `/login`, enter the admin email and password, select **Sign in**, and enter the six-digit code in the same browser. The old `/admin/login` address redirects to `/login`. Codes expire after five minutes and can be used once. The admin session lasts 15 minutes. Hosted admin sign-in requires email-code mode.

Student and admin login share one IP limit. The class-code check has its own. Each limit allows ten failed attempts in 15 minutes. Successful attempts do not use the failure allowance.

Generate a code at `/admin/codes`. It works in the student join screen for 168 hours. To reset a student password, use `/admin/password-reset` with the student's username and share the resulting one-time password privately. It expires after 15 minutes and immediately replaces any previous reset credential, disables the old password and revokes all of the student's existing sessions. The student can set a new password from the sign-in screen. If the credential expires, issue a fresh one. The reset flow purges expired reset records when students use the reset form.

## Manage students

Open `/admin/students` to search by username, combine the search with an optional gender filter, and page through accounts (20 per page). Students can still join with a class code and sign in with their username and password. Gender is optional; existing accounts remain unspecified until edited.

Select **Add student** to generate a unique username and one-time password. Copy the credential before leaving the result page and share it privately. It expires after 15 minutes. The student can enter it on the normal login screen, which takes them to mandatory password setup without creating a practice session. They must choose their own password before signing in. The same one-time password cannot be redeemed again. Use the key/password action to issue a replacement if it expires.

Each student row has Edit, Password (key icon), and Delete actions. Renaming an account signs it out on every device; give the student their new username. Password reset immediately disables the old password and revokes sessions. Delete requires typing the exact username and permanently removes that account and its related practice data. These actions require an authenticated admin session on the server.

Apply `20261119000006_student_management.sql` before deploying this version. It adds optional gender and creation metadata, narrowly scoped admin permissions, and a server-only one-time credential check. Do not enable local preview/test settings on a hosted deployment.

For a client owner inbox, use a verified Resend sending domain. The `onboarding@resend.dev` test sender only delivers to the Resend account's own recipient and cannot complete handover to a different inbox. Verify code receipt and dashboard access before retiring the previous owner.

See the [handover guide](docs/HANDOVER.md) for production verification, owner transfer and services/data inventory. The [Phase 1 foundation](docs/PHASE-1-FOUNDATION.md) covers the screen map and original data rules; the optional gender field was added with the student-management scope.
