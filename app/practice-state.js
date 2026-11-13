import { withStudent } from './student-session';

export async function readPractice(db, tokenDigest, lock = false) {
  const { rows: [practice] } = await db.query(
    `select id, state from education_unite.active_practice
     where token_digest = $1 and expires_at > now()${lock ? ' for update' : ''}`,
    [tokenDigest],
  );
  return practice;
}

export function currentPractice() {
  return withStudent((db, _student, tokenDigest) => readPractice(db, tokenDigest));
}
