import Link from 'next/link';
import { connection } from 'next/server';
import { adminSignIn } from '../../admin-actions';
import { requiresAdminCode } from '../../admin-auth';
import StudentForm from '../../student-forms';
import PasswordField from '../../password-field';

export default async function AdminLogin() {
  await connection();
  return (
    <main className="student-card">
      <Link href="/">EducationUnite</Link>
      <h1>Owner sign in</h1>
      <StudentForm action={adminSignIn} submit="Sign in">
        <label>Email
          <input name="email" type="email" required maxLength={254} autoComplete="username" />
        </label>
        <PasswordField label="Password" name="password" required maxLength={128} autoComplete="current-password" />
        {requiresAdminCode() && <label>Authenticator code
          <input name="code" required pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code" />
        </label>}
      </StudentForm>
    </main>
  );
}
