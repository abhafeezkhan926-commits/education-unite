import Link from 'next/link';
import { resetPassword } from '../../student-actions';
import StudentForm from '../../student-forms';
import PasswordField from '../../password-field';
import { cookies } from 'next/headers';

export default async function ResetPassword() {
  let setup = null;
  try {
    const value = JSON.parse((await cookies()).get('eu_password_setup')?.value ?? 'null');
    if (/^[a-z0-9]{1,64}$/.test(value?.username) && /^[\w-]{22}$/.test(value?.temporary)) setup = value;
  } catch { /* An absent or invalid cookie falls back to manual entry. */ }
  return (
    <main className="student-card">
      <Link href="/login">Back to login</Link>
      <h1>Set a new password</h1>
      <p>{setup ? 'Choose your own password before starting practice.' : 'Use the one-time password you were given.'}</p>
      <StudentForm action={resetPassword} submit="Set new password">
        <label>Username
          <input name="username" required maxLength={64} autoComplete="username" autoCapitalize="none" spellCheck={false} defaultValue={setup?.username ?? ''} />
        </label>
        <PasswordField label="One-time password" name="temporary" required maxLength={22} autoComplete="one-time-code" defaultValue={setup?.temporary ?? ''} />
        <PasswordField label="New password" name="password" required minLength={12} maxLength={128} autoComplete="new-password" />
      </StudentForm>
    </main>
  );
}
