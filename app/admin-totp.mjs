export async function verifyOwnerTotp(request, { account, token }, code) {
  const factor = account.factors?.find(({ factor_type, status }) => factor_type === 'totp' && status === 'verified');
  if (!factor) return false;
  const path = 'factors/' + encodeURIComponent(factor.id);
  const challenge = await request(path + '/challenge', { token, body: {} });
  if (!challenge?.id) return false;
  const verified = await request(path + '/verify', { token, body: { challenge_id: challenge.id, code } });
  if (!verified?.access_token) return false;
  const user = await request('user', { token: verified.access_token });
  if (user?.id !== account.id) return false;
  try {
    // Supabase validated the token in the user request above.
    const claims = JSON.parse(Buffer.from(verified.access_token.split('.')[1], 'base64url'));
    return claims.sub === account.id && claims.aal === 'aal2' && claims.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}
