# EducationUnite

Production runs at [education-unite-mvp.vercel.app](https://education-unite-mvp.vercel.app).

## Run locally

Use Node.js 24 and npm. On Windows, use Node.js 24.22.1 or a newer Node 24 release for the local regression suite. Node 24.18.1 showed intermittent V8 crashes and loopback connection resets on the project workstation. From the project directory, run `npm ci`, then `npm run dev` and open [localhost:3000](http://localhost:3000). Use `npm run build` to check the production build and `npm start` to serve it locally.

Run `npm run build` followed by `npm test` for the regression checks. The tests apply the migrations to a disposable database, validate the 24-template bank and submit the forms served by the production build on loopback. GitHub Actions runs the same checks and an npm dependency audit on pushes and pull requests.

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

The current Vercel deployment uses email verification codes. Configure the server-only `EDUCATION_UNITE_SUPABASE_URL`, `EDUCATION_UNITE_SUPABASE_KEY` (publishable or legacy anon key), and `EDUCATION_UNITE_OWNER_ID` (the primary admin's Auth user UUID). For email-code mode, apply the admin email challenge migration and set `EDUCATION_UNITE_ADMIN_EMAIL_CODE=1`, `RESEND_API_KEY`, and `EDUCATION_UNITE_ADMIN_EMAIL_FROM`. The configured owner receives the code at their confirmed Supabase email address. The Resend test sender supports its linked inbox.

From `/login`, enter the admin email and password, select **Sign in**, and enter the six-digit code in the same browser. The old `/admin/login` address redirects to `/login`. Codes expire after five minutes and can be used once. The admin session lasts 15 minutes. Hosted admin sign-in requires email-code mode.

Generate a code at `/admin/codes`. It works in the student join screen for 168 hours. To reset a student password, use `/admin/password-reset` with the student's username and share the resulting one-time password privately. It expires after 15 minutes and immediately replaces any previous reset credential, disables the old password and revokes all of the student's existing sessions. The student can set a new password from the sign-in screen. If the credential expires, issue a fresh one. The reset flow purges expired reset records when students use the reset form.

See [Phase 1 foundation](docs/PHASE-1-FOUNDATION.md) for the screen map and data rules.
