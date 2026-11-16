import { timingSafeEqual } from 'node:crypto';

export async function consumeEmailChallenge(db, tokenDigest, candidateDigest) {
  const { rows: [challenge] } = await db.query(
    `update education_unite.admin_email_challenges
     set attempts_remaining = attempts_remaining - 1
     where token_digest = $1 and expires_at > now() and attempts_remaining > 0
     returning code_digest`,
    [tokenDigest],
  );
  if (!challenge || !timingSafeEqual(Buffer.from(challenge.code_digest, 'hex'), Buffer.from(candidateDigest, 'hex'))) {
    return false;
  }
  await db.query('delete from education_unite.admin_email_challenges where token_digest = $1', [tokenDigest]);
  return true;
}
