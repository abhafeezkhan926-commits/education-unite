# EducationUnite

## Run locally

Use Node.js 24 and npm. From the project directory, run `npm ci`, then `npm run dev` and open [localhost:3000](http://localhost:3000). Use `npm run build` to check the production build and `npm start` to serve it locally.

Run `npm run build` followed by `npm test` for the regression checks. The tests apply the migrations to a disposable database, validate the 24-template bank and submit the forms served by the production build on loopback. GitHub Actions runs the same checks and an npm dependency audit on pushes and pull requests.

To try student sign-up, sign-in and maths practice locally, run `npm run build` and then `npm run preview:student -- --port 3002`. Open [the local preview](http://127.0.0.1:3002) and enter class code `EU-PREVIEW`. Use a test password. After joining, select **Start maths practice**. The preview uses sample questions while the client spreadsheet is pending. The preview binds to loopback and uses an in-memory PostgreSQL database, so accounts and sessions reset when the server restarts.

## Replace the sample question workbook

The local bank comes from [sample-question-templates.xlsx](outputs/01a1d35d-1ffd-7803-b4c2-8cf9c0cc2df9/sample-question-templates.xlsx). Copy the real content into the sample's `Templates` tab structure, with three rows per interest and a unique ID for each row. The current rules are `multiply` (`a × b`), `remaining` (`a × b − c`), and `percentage` (`a × b × c ÷ 100`). Text placeholders are `{a}`, `{b}`, `{c}`, `{total}`, and `{answer}`. Review any new answer rules before importing.

With the Codex workspace runtime available, set `EDUCATION_UNITE_ARTIFACT_MODULES` to its Node `node_modules` path. Run `node scripts/import-practice-sheet.mjs path/to/workbook.xlsx` from the project root. The importer validates the workbook before replacing `app/practice-templates.json`. Rebuild and restart the preview to load the new bank.

## Apply the local database migration

With Docker running and the Supabase CLI available, run `supabase init` once if `supabase/config.toml` is absent, then run `supabase start` from the project directory. The CLI applies the migrations in `supabase/migrations` on startup. On a disposable local Supabase instance, `supabase db reset --local` recreates the database and reapplies the migrations. The reset discards local database contents.

For the owner’s UK Supabase deployment, apply the migrations in order and provision a dedicated PostgreSQL login with membership in `education_unite_app` and `education_unite_admin` and permission to switch into both roles. Set `DATABASE_URL` to its connection string with certificate verification and set `EDUCATION_UNITE_SECRET` to a stable random secret of at least 32 bytes. Store both values in server-only environment variables.

## Owner admin

For a local preview, open `/admin/login` and use `owner@example.test` and the temporary local password printed by the preview command. Run `npm run preview:student -- --admin-code` in another terminal to get the current test authenticator code. It changes every 30 seconds. The test owner is available only in loopback preview mode with the in-memory database.

For a hosted project, provision Husain's Supabase Auth user with email and password and enroll and verify a TOTP factor using Supabase's [TOTP enrollment flow](https://supabase.com/docs/guides/auth/auth-mfa/totp). Configure the server-only `EDUCATION_UNITE_SUPABASE_URL`, `EDUCATION_UNITE_SUPABASE_KEY` (publishable or legacy anon key) and `EDUCATION_UNITE_OWNER_ID` (Husain's Auth user UUID). The admin session lasts 15 minutes.

Generate a code at `/admin/codes`. It works in the student join screen for 168 hours. To reset a student password, use `/admin/password-reset` with the student's username and share the resulting one-time password privately. It expires after 15 minutes and immediately replaces any previous reset credential, disables the old password and revokes all of the student's existing sessions. The student can set a new password from the sign-in screen. If the credential expires, issue a fresh one. The reset flow purges expired reset records when students use the reset form.

See [Phase 1 foundation](docs/PHASE-1-FOUNDATION.md) for the screen map and data rules.
