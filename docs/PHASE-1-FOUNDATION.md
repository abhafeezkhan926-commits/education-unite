# Phase 1 foundation

## Screen map

| Audience | Proposed route | Task | Implementation part |
| --- | --- | --- | --- |
| Student | `/` | Choose whether to join with a code or sign in. | Part 2. Part 1 provides the landing page. |
| Student | `/join` | Enter a join code, choose a generated username and set a password. | Part 2 |
| Student | `/login` | Sign in with a username and password or follow the password reset flow. | Parts 2 and 4 |
| Student | `/interests` | Pick one to three interests from the eight options. | Part 3 |
| Student | `/practice` | Answer questions, reveal up to three hints per question and review worked solutions. | Part 3 |
| Student | `/practice/summary` | See score, hints used and practice time. | Part 3 |
| Owner | `/admin/login` | Sign in with email, password and two-step verification. | Part 4 |
| Owner | `/admin/codes` | Create class join codes valid for seven days. | Part 4 |
| Owner | `/admin/password-reset` | Issue a one-time password and revoke the student's active sessions. | Part 4 |

The user confirmed the current landing UI, logo and favicon for Part 1. The landing page pairs the EducationUnite wordmark with the blue and pink book mark and uses the same mark as its favicon. The 24-template spreadsheet is pending for Part 3. When available, record its columns and validate that it covers the eight interests with three templates each, along with answer rules, up to three hints, worked solution steps and a real-world use line.

## Data and access boundaries

| Record | Stored fields and purpose | Access and retention |
| --- | --- | --- |
| Student | Internal ID, generated username and Argon2id password hash. | Server-side account logic. Proposed retention is while the account is active, with deletion on owner request or pilot close, subject to client confirmation before a pilot. |
| Practice | Student ID, practice duration, question position, generated question context and submitted answer. Store only the context needed to interpret the answer. | Access through server-side checks against the signed-in student's ID. Student deletion cascades to practice records. |
| Join code | Internal ID, keyed code digest, creation time and expiry. | Owner issues codes via the server. Student join checks validity via the server. Delete expired records after the seven-day validity window. |
| Student session | Session token digest, student ID and expiry. | Server-only validation. Proposed lifetime is seven days. Remove rows at expiry or revoke them on sign-out or password reset. |
| Rate limit | Action, keyed subject digest, attempt count and expiry. | Server-only enforcement. Proposed window is 15 minutes for join and login. Remove expired counters. Final limits belong to Part 2. |
| Interests and summary | Selected interests, score and hint count are held in practice session state. | Discard after the practice flow. Persist submitted answers and duration only. |
| Owner auth and reset | Owner email, password authentication and MFA belong to the auth provider. The student reset flow will need a short-lived, single-use credential stored as a digest. | Owner-only actions. Record actual provider region and retention during handover. Final reset expiry and cleanup belong to Part 4. |

The baseline migration keeps application tables in a private schema, enables row-level security and revokes access from browser-facing roles. Later parts will add the server-side access path and verify student ownership checks before exposing a feature. Use essential secure cookies for student sessions and keep credentials and digest keys in server-only configuration.

Use operational logs for event type, timestamp, outcome and request ID. Omit student identifiers, answers, raw IP addresses, passwords, join codes, session tokens and reset credentials. Confirm the actual infrastructure log settings and retention before a pilot. Expiration enforcement and cleanup jobs belong to the parts that implement each flow.
