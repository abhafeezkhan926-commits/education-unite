import Link from 'next/link';
import { resetPassword } from '../../student-actions';
import StudentForm from '../../student-forms';
import PasswordField from '../../password-field';

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
        <PasswordField label="One-time password" name="temporary" required maxLength={22} autoComplete="one-time-code" />
        <PasswordField label="New password" name="password" required minLength={12} maxLength={128} autoComplete="new-password" />
      </StudentForm>
    </main>
  );
}
