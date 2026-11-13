import Link from 'next/link';
import { signIn } from '../student-actions';
import StudentForm from '../student-forms';

export default async function Login({ searchParams }) {
  const { reset } = await searchParams;
  return (
    <main className="student-card">
      <Link href="/">EducationUnite</Link>
      <h1>Student sign in</h1>
      {reset === 'complete' && <p role="status">Password updated. Sign in with your new password.</p>}
      <StudentForm action={signIn} submit="Sign in">
        <label>Username
          <input name="username" required maxLength={64} autoComplete="username" autoCapitalize="none" spellCheck={false} />
        </label>
        <label>Password
          <input name="password" type="password" required maxLength={128} autoComplete="current-password" />
        </label>
      </StudentForm>
      <p><Link href="/login/reset">Use a one-time password</Link></p>
      <p>New here? <Link href="/join">Join with a code</Link></p>
    </main>
  );
}
