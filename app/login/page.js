import Link from 'next/link';
import Brand from '../brand';
import { restartAdminEmailLogin, verifyAdminEmailCode } from '../admin-actions';
import { usesAdminEmailCode } from '../admin-auth';
import { pendingAdminEmailToken, usesLocalAdminTestCode } from '../admin-email-code';
import { login } from '../login-actions';
import StudentForm from '../student-forms';
import PasswordField from '../password-field';

export default async function Login({ searchParams }) {
  const { reset, step } = await searchParams;
  const verify = step === 'email' && usesAdminEmailCode() && await pendingAdminEmailToken();
  return (
    <main className="student-card login-card">
      <Brand />
      {verify ? <>
        <h1>Verify code</h1>
        <p>{usesLocalAdminTestCode() ? 'Enter the six-digit local test code.' : 'Enter the six-digit code sent to your verified email address.'}</p>
        <StudentForm key="verify" action={verifyAdminEmailCode} submit="Verify code">
          <label>Email code
            <input name="code" required pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code" />
          </label>
        </StudentForm>
        <form action={restartAdminEmailLogin}><button className="text-button">Start again</button></form>
      </> : <>
        <h1>Login</h1>
        {reset === 'complete' && <p role="status">Password updated. Sign in with your new password.</p>}
        <StudentForm key="credentials" action={login} submit="Sign in">
          <label>Username or email
            <input name="identifier" required maxLength={254} autoComplete="username" autoCapitalize="none" spellCheck={false} />
          </label>
          <PasswordField label="Password" name="password" required maxLength={128} autoComplete="current-password" />
          <label className="remember-device"><input type="checkbox" name="rememberDevice" /> Remember this private device for student sign-in for 30 days</label>
        </StudentForm>
        <p><Link href="/login/reset">Use a one-time password</Link></p>
        <p>New here? <Link href="/join">Join with a code</Link></p>
      </>}
    </main>
  );
}
