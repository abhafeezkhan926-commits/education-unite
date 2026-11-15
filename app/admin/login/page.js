import Link from 'next/link';
import { connection } from 'next/server';
import { adminSignIn, restartAdminEmailLogin, verifyAdminEmailCode } from '../../admin-actions';
import { requiresAdminCode, usesAdminEmailCode } from '../../admin-auth';
import { pendingAdminEmailToken, usesLocalAdminTestCode } from '../../admin-email-code';
import StudentForm from '../../student-forms';
import PasswordField from '../../password-field';

export default async function AdminLogin({ searchParams }) {
  await connection();
  const emailMode = usesAdminEmailCode();
  const localTest = usesLocalAdminTestCode();
  const emailStep = emailMode && (await searchParams).step === 'email' && await pendingAdminEmailToken();
  return (
    <main className="student-card">
      <Link href="/">EducationUnite</Link>
      <h1>Owner sign in</h1>
      {emailStep ? <>
        <p>{localTest ? 'Enter the six-digit local test code.' : 'Enter the six-digit code sent to your verified email address.'}</p>
        <StudentForm action={verifyAdminEmailCode} submit="Verify code">
          <label>Email code
            <input name="code" required pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code" />
          </label>
        </StudentForm>
        <form action={restartAdminEmailLogin}><button className="text-button">Start again</button></form>
      </> : <StudentForm action={adminSignIn} submit={emailMode && !localTest ? 'Send email code' : 'Sign in'}>
        <label>Email
          <input name="email" type="email" required maxLength={254} autoComplete="username" />
        </label>
        <PasswordField label="Password" name="password" required maxLength={128} autoComplete="current-password" />
        {requiresAdminCode() && <label>Authenticator code
          <input name="code" required pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code" />
        </label>}
      </StudentForm>}
    </main>
  );
}
