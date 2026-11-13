import Link from 'next/link';
import { resetPassword } from '../../student-actions';
import StudentForm from '../../student-forms';

export default function ResetPassword() {
  return (
    <main className="student-card">
      <Link href="/login">Back to student sign in</Link>
      <h1>Set a new password</h1>
      <p>Use the one-time password you were given.</p>
      <StudentForm action={resetPassword} submit="Set new password">
        <label>Username
          <input name="username" required maxLength={64} autoComplete="username" autoCapitalize="none" spellCheck={false} />
        </label>
        <label>One-time password
          <input name="temporary" type="password" required maxLength={22} autoComplete="one-time-code" />
        </label>
        <label>New password
          <input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" />
        </label>
      </StudentForm>
    </main>
  );
}
